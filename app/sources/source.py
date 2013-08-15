from flask.ext.wtf import Form
from wtforms import TextField, validators

class Source:

    name = 'Source'
    
    def __init__(self):
        pass

class CreateSourceForm(Form):
    label = TextField('Label', [validators.Required()])
