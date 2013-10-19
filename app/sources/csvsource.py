from __future__ import division

import csv
import datetime
import math
import os
import time

import pymongo
from flask.ext.wtf import Form
from wtforms import FileField, validators
from werkzeug import secure_filename

from app import config_upload_folder, TaskStatus, db
from app.sources.source import Source, CreateSourceForm

class CsvSource(Source):
    
    name = 'CSV'
    
    def __init__(self, data):
        super(CsvSource, self).__init__(data)
    
    def extract(self):
        path = os.path.join(config_upload_folder, self.data['filename'])
        with open(path, 'rU') as csvfile:
            reader = csv.reader(csvfile)
            reader.next()
            for row in reader:
                date = int(time.mktime(datetime.datetime.strptime(row[0], '%Y-%m-%d').timetuple()))
                db.counts.insert({ 'source_id': self.data['_id'], 'date': date, 'count': float(row[1]) })
    
    def transform(self):
        # Normalize to highest count
        peak = db.counts.find_one({'source_id':self.data['_id']}, limit=1, sort=[('count', pymongo.DESCENDING)])['count']
        for data in db.counts.find({'source_id':self.data['_id']}):
            data['normalized'] = data['count'] / peak
            del data['_id']
            db.transformed.insert(data)
        
    def load(self):
        for data in db.transformed.find({'source_id':self.data['_id']}):
            db.results.insert({
                'source_id': self.data['_id']
                , 'project_id': self.data['project_id']
                , 'label': self.data['label']
                , 'date': data['date']
                , 'raw': data['count']
                , 'value': data['normalized']
            })
            
    @classmethod
    def create_form(cls):
        class AddForm(CreateSourceForm):
            csv = FileField('CSV File', [validators.Required()])
        return AddForm
    
    @classmethod
    def create(cls, request, username, project_name):
        global config_upload_folder
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
    