from flask.ext.wtf import Form
from wtforms import TextField, PasswordField, SelectField, BooleanField, HiddenField, validators

from app import sources

class LoginForm(Form):
    email = TextField('Email Address', [validators.Required()])
    password = PasswordField('Password', [validators.Required()])

class NewProjectForm(Form):
    name = TextField('Name', [validators.Required()])
    keywords = TextField('Keywords', [validators.Required()])
    start_date = TextField('Start Date', [validators.Required()])
    end_date = TextField('End Date', [validators.Required()])

class DeleteProjectForm(Form):
    name = TextField('Name', [validators.Required()])

class AddSourceTypeForm(Form):
    source_type = SelectField('Source Type', choices=[(source, source) for source in sources.keys()])

def make_source_form(project):
    class SourceForm(Form):
        method = HiddenField()
    for source in sources:
        params = project.get('source_params', {}).get(source.name, {})
        enabled = params.get('enabled', False)
        if enabled:
            default = 'y'
        else:
            default = ''
        setattr(SourceForm, source.name, BooleanField(source.name, default=default))
    return SourceForm
