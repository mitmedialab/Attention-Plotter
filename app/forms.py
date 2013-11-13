from flask.ext.wtf import Form
from wtforms import TextField, PasswordField, SelectField, BooleanField, HiddenField, validators
import pymongo

from app.sources.source import Source

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
    
class DeleteSourceForm(Form):
    source_id = HiddenField('Source ID', [validators.Required()])
    source_name = HiddenField('Name')

class DeleteEventForm(Form):
    event_id = HiddenField('Event ID', [validators.Required()])
    event_label = HiddenField('Label')

class AddSourceTypeForm(Form):
    source_type = SelectField('Source Type', choices=[(source, source) for source in Source.sources.keys()])

class AddEventForm(Form):
    event_label = TextField('Label', [validators.Required()])
    event_date = TextField('Date', [validators.Required()])

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
