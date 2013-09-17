from flask.ext.wtf import Form
from wtforms import TextField, validators

from app import db
from app import TaskStatus

class Source(object):

    name = 'Source'
    sources = {}
    
    def __init__(self, data):
        self.data = data
    
    def save(self):
        db.sources.update({'_id':self.data['_id']}, self.data)
    
    def extract(self):
        raise NotImplementedError()
    
    def transform(self):
        raise NotImplementedError()
    
    def load(self):
        raise NotImplementedError()
    
    def process(self):
        """Process the data from raw input to formatted output."""
        self.data['status'] = TaskStatus.EXTRACTING
        self.save()
        self.extract()
        self.data['status'] = TaskStatus.EXTRACTED
        self.data['status'] = TaskStatus.TRANSFORMING
        self.save()
        self.transform()
        self.data['status'] = TaskStatus.TRANSFORMED
        self.data['status'] = TaskStatus.LOADING
        self.save()
        self.load()
        self.data['status'] = TaskStatus.COMPLETE
        self.save()
    
    @classmethod
    def add_sources(cls, sources):
        cls.sources.update(sources)

    @classmethod
    def make(cls, source_data):
        source_class = cls.sources[source_data['type']]
        source = source_class(source_data)
        return source
    
    @classmethod
    def create(cls, request, username, project_name):
        CreateForm = cls.create_form()
        create_form = CreateForm()
        source = {
            'type': cls.name
            , 'label': create_form.label.data
            , 'status': TaskStatus.ENABLED
        }
        return source
    
class CreateSourceForm(Form):
    label = TextField('Label', [validators.Required()])
