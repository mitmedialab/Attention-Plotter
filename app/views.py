from flask import Flask, flash, redirect, render_template, request, url_for
from flask_login import AnonymousUserMixin, current_user, login_required, login_user, logout_user
import pymongo

from app import app, login_manager, db
from user import User, authenticate_user
from forms import *

@app.route('/')
def index():
    return render_template('wrapper.html', content='Home page')

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
    project = db.projects.find_one({'name':project_name, 'owner':username});
    if project == None:
        flash("Sorry, that project doesn't exist.")
        return render_template('wrapper.html')
    return render_template('project.html', project=project)

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

# Callback for flask-login
@login_manager.user_loader
def load_user(userid):
    u = db.users.find_one({'username':userid})
    if u == None:
        return AnonymousUserMixin()
    return User(u['email'], userid, userid)
