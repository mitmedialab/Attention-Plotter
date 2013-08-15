import os

from app import config_upload_folder, TaskStatus
from app.sources.source import Source, CreateSourceForm
from flask.ext.wtf import Form
from wtforms import FileField, validators
from werkzeug import secure_filename

class CsvSource(Source):
    
    name = 'CSV'
    
    def __init__(self):
        pass
    
    @classmethod
    def create_form(cls):
        class AddForm(CreateSourceForm):
            csv = FileField('CSV File', [validators.Required()])
        return AddForm
    
    @classmethod
    def create(cls, request, username, project_name):
        CreateForm = cls.create_form()
        create_form = CreateForm()
        if not create_form.csv.data.filename.rsplit('.', 1)[1].lower() == 'csv':
            return None
        filename = secure_filename('%s-%s-%s-%s' % (
            username
            , project_name
            , create_form.label.data
            , create_form.csv.data.filename))
        path = os.path.join(config_upload_folder, filename)
        create_form.csv.data.save(path)
        source = {
            'type': cls.name
            , 'label': create_form.label.data
            , 'filename': filename
            , 'status': TaskStatus.ENABLED
        }
        return source
    