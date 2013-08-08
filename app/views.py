from flask import Flask, flash, redirect, render_template, request, url_for
from flask_login import AnonymousUserMixin, current_user, login_required, login_user, logout_user
import pymongo

from app import app, login_manager, db, sources
from user import User, authenticate_user
from forms import LoginForm, DeleteProjectForm, NewProjectForm, make_source_form

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
    return render_template('project.html', project=project)

@app.route('/<username>/<project_name>/settings', methods=['GET', 'POST'])
def project_settings(username, project_name):
    if current_user.name != username:
        abort(403)
    project = db.projects.find_one({'name':project_name, 'owner':username})
    delete_form = DeleteProjectForm(prefix="delete")
    if delete_form.validate_on_submit():
        if project_name == delete_form.name.data:
            db.projects.remove({'name':delete_form.name.data})
            flash('Project deleted.')
            return redirect(url_for('index'))
        else:
            flash('Project name did not match.')
    SourceForm = make_source_form(project)
    source_form = SourceForm(method='source')
    if source_form.validate_on_submit() and source_form.method.data == 'source':
        for source in sources:
            print source.name
            params = project['source_params'].get(source.name, {})
            if getattr(source_form, source.name).data:
                params['enabled'] = True
            else:
                params['enabled'] = False
            project['source_params'][source.name] = params
            print project
            db.projects.update({'_id':project['_id']}, project)
    return render_template('project-settings.html', project=project, delete_form=delete_form, source_form=source_form)

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
            , 'source_params' : {}
        }
        existing = db.projects.find_one({'name':form.name.data, 'owner':current_user.id})
        if existing == None:
            db.projects.insert(project)
            return redirect(url_for('project', username=current_user.name, project_name=form.name.data))
        else:
            flash('Sorry, that name is already taken.')
    return render_template('new-project.html', form=form)

