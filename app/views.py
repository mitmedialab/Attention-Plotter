import json
from bson import json_util

from flask import Flask, flash, redirect, render_template, request, url_for
from flask_login import AnonymousUserMixin, current_user, login_required, login_user, logout_user
import pymongo

from app import app, login_manager, db, TaskStatus
from app.sources.source import Source
from user import User, authenticate_user
from forms import LoginForm, DeleteProjectForm, NewProjectForm, AddSourceTypeForm, make_source_form

@app.route('/')
def index():
    return render_template('wrapper.html', content='Home page')

# User views

@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm(request.form)
    if form.validate_on_submit():
        user = authenticate_user(form.email.data, form.password.data)
        if not user.is_authenticated():
            return redirect(url_for('login'))
        login_user(user)
        return redirect(request.args.get('next') or url_for('index'))
    return render_template('login.html', form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@login_manager.user_loader
def load_user(userid):
    '''Callback for flask-login.'''
    u = db.users.find_one({'username':userid})
    if u == None:
        return AnonymousUserMixin()
    return User(u['email'], userid, userid)

# Project views

@app.route('/projects')
@app.route('/projects/<username>')
def projects(username=None):
    if username == None:
        projects = list(db.projects.find())
    else:
        projects = list(db.projects.find({'owner':username}))
    return render_template('projects.html', projects=projects, username=username)

@app.route('/<username>/<project_name>')
def project(username, project_name):
    project = db.projects.find_one({'name':project_name, 'owner':username})
    if project == None:
        flash("Sorry, that project doesn't exist.")
        return render_template('wrapper.html')
    sources = db.sources.find({'project_id':project['_id'], 'status':TaskStatus.COMPLETE})
    # Create d3-friendly json
    # There's probably a better way to do this, like a "group by" in sql -Ed
    data = []
    for source in sources:
        query = {'source_id':source['_id']}
        fields = {'_id':False, 'source_id':False, 'project_id':False}
        source_data = {
            'name':source['label']
            , 'values':[{'date':r['date'], 'value':r['value'], 'label':r['label']} for r in db.results.find(query, fields=fields, sort=[('date', pymongo.ASCENDING)])]
        }
        data.append(source_data)
    return render_template('project.html', project=project, data=json.dumps(data))

@app.route('/<username>/<project_name>/settings', methods=['GET', 'POST'])
def project_settings(username, project_name):
    if current_user.name != username:
        abort(403)
    project = db.projects.find_one({'name':project_name, 'owner':username})
    source_list = list(db.sources.find({'project_id':project['_id']}))
    delete_form = DeleteProjectForm(prefix="delete")
    if delete_form.validate_on_submit():
        if project_name == delete_form.name.data:
            db.projects.remove({'name':delete_form.name.data})
            flash('Project deleted.')
            return redirect(url_for('index'))
        else:
            flash('Project name did not match.')
    add_type_form = AddSourceTypeForm(prefix="add_source_type")
    if not add_type_form.source_type.data == 'None':
        return redirect(url_for('add_source', username=username, project_name=project_name, source_name=add_type_form.source_type.data))
    return render_template(
        'project-settings.html'
        , project=project
        , delete_form=delete_form
        , add_type_form=add_type_form
        , sources=source_list)

@app.route('/<username>/<project_name>/add-source/<source_name>', methods=['GET', 'POST'])
@login_required
def add_source(username, project_name, source_name):
    project = db.projects.find_one({'name':project_name, 'owner':username})
    source = Source.sources[source_name]
    CreateForm = source.create_form()
    create_form = CreateForm()
    if create_form.validate_on_submit():
        s = source.create(request, username, project_name)
        s['project_id'] = project['_id']
        db.sources.insert(s)
        return redirect(url_for('project_settings', project_name=project_name, username=username))
    return render_template(
        'add-source.html'
        , project=project
        , source_name=source_name
        , create_form=create_form)
    
@app.route('/new-project', methods=['GET', 'POST'])
@login_required
def new_project():
    form = NewProjectForm(request.form)
    if form.validate_on_submit():
        project = {
            'name': form.name.data
            , 'start': form.start_date.data
            , 'end': form.end_date.data
            , 'keywords': [k.strip() for k in form.keywords.data.split(',')]
            , 'owner' : current_user.id
        }
        existing = db.projects.find_one({'name':form.name.data, 'owner':current_user.id})
        if existing == None:
            db.projects.insert(project)
            return redirect(url_for('project', username=current_user.name, project_name=form.name.data))
        else:
            flash('Sorry, that name is already taken.')
    return render_template('new-project.html', form=form)

