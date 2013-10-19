from __future__ import division

import datetime
import json
import math
import re
import time
import urllib
import urllib2

import pymongo
from flask.ext.wtf import Form
from wtforms import validators

from app import config_upload_folder, TaskStatus, db
from app.sources.source import Source, CreateSourceForm

class IAClosedCaption(Source):
    
    name = 'Internet Archive Closed Captions'
    
    def __init__(self, data):
        super(IAClosedCaption, self).__init__(data)
        
    def extract(self):
        """Fetch raw data into database."""
        project = db.projects.find_one({'_id': self.data['project_id']})
        start = 0
        rows_per_req = 500
        start_date = datetime.datetime.strptime(project['start'], '%Y-%m-%d')
        end_date = datetime.datetime.strptime(project['end'], '%Y-%m-%d')
        date = start_date
        delta = datetime.timedelta(days=1)
        # Loop through each date
        while date <= end_date:
            # Fetch in batches until none left
            while (True):
                query = urllib.urlencode({
                    'q':''.join(['"%s"' % (k) for k in project['keywords']])
                    , 'time': date.strftime('%Y%m%d')
                    , 'start':start
                    , 'rows':rows_per_req
                    , 'output':'json'
                })
                url = 'http://archive.org/details/tv?%s' % (query)
                results = json.loads(urllib2.urlopen(url).read())
                if len(results) == 0:
                    break
                start += len(results)
                for r in results:
                    r.update({
                        'source_id': self.data['_id']
                        , 'date': time.mktime(date.timetuple())
                    })
                db.raw.insert(results)
            date += delta
    
    def transform(self):
        """Transform raw data"""
        project = db.projects.find_one({'_id': self.data['project_id']})
        counts = []
        max_count = 0
        start_date = datetime.datetime.strptime(project['start'], '%Y-%m-%d')
        end_date = datetime.datetime.strptime(project['end'], '%Y-%m-%d')
        date = start_date
        delta = datetime.timedelta(days=1)
        while date <= end_date:
            count = db.raw.find({'source_id': self.data['_id'], 'date':time.mktime(date.timetuple())}).count()
            max_count = max(max_count, count)
            counts.append({
                'source_id': self.data['_id']
                , 'date':time.mktime(date.timetuple())
                , 'count':count
            })
            date += delta
        for data in counts:
            data['normalized'] = data['count'] / max_count
        db.transformed.insert(counts)

    def load(self):
        """Create json results formatted for d3 use."""
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
        return CreateSourceForm
    
    @classmethod
    def create(cls, request, username, project_name):
        source = super(IAClosedCaption, cls).create(request, username, project_name)
        return source
    