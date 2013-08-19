from flask.ext.wtf import Form
from wtforms import TextField, validators

from app import db

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
    
    @classmethod
    def add_sources(cls, sources):
        cls.sources.update(sources)

    @classmethod
    def make(cls, source_data):
        source_class = cls.sources[source_data['type']]
        source = source_class(source_data)
        return source
    
class CreateSourceForm(Form):
    label = TextField('Label', [validators.Required()])
