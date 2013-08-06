from flask.ext.wtf import Form
from wtforms import TextField, PasswordField, validators

class LoginForm(Form):
    email = TextField('Email Address', [validators.Required()])
    password = PasswordField('Password', [validators.Required()])

class NewProjectForm(Form):
    name = TextField('Name', [validators.Required()])
    keywords = TextField('Keywords', [validators.Required()])
    start_date = TextField('Start Date', [validators.Required()])
    end_date = TextField('End Date', [validators.Required()])
    