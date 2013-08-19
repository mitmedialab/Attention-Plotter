from __future__ import division
import os
import csv
import math

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
        self.data['status'] = TaskStatus.EXTRACTING
        self.save()
        path = os.path.join(config_upload_folder, self.data['filename'])
        with open(path, 'rU') as csvfile:
            reader = csv.reader(csvfile)
            reader.next()
            for row in reader:
                db.counts.insert({ 'source_id': self.data['_id'], 'date': row[0], 'count': int(row[1]) })
        self.data['status'] = TaskStatus.EXTRACTED
        self.save()
    
    def transform(self):
        self.data['status'] = TaskStatus.TRANSFORMING
        self.save()
        peak = db.counts.find_one({'source_id':self.data['_id']}, limit=1, sort=[('count', pymongo.DESCENDING)])['count']
        print peak
        cardinality = db.counts.find({'source_id':self.data['_id']}).count()
        print cardinality
        doc_count = cardinality - db.counts.find({'source_id':self.data['_id'], 'count':0}).count()
        print doc_count
        for data in db.counts.find({'source_id':self.data['_id']}):
            data['normalized'] = data['count'] / peak
            data['tfidf'] = data['count'] * math.log(cardinality / doc_count, 10)
            del data['_id']
            db.transformed.insert(data)
        self.data['status'] = TaskStatus.TRANSFORMED
        self.save()
        
    def load(self):
        self.data['status'] = TaskStatus.LOADING
        self.save()
        for data in db.transformed.find({'source_id':self.data['_id']}):
            db.results.insert({
                'source_id': self.data['_id']
                , 'label': self.data['label']
                , 'date': data['date']
                , 'value': data['tfidf']
            })
        self.data['status'] = TaskStatus.COMPLETE
        self.save()
            
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
    