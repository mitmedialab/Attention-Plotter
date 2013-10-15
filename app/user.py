import hashlib

from flask import flash
from flask_login import UserMixin, AnonymousUserMixin

from app import db

# User class
class User(UserMixin):
    def __init__(self, email, name, id, active=True):
        self.email = email
        self.name = name
        self.id = id
        self.active = active
        
    def is_active(self):
        return self.active
    
    def is_anonymous(self):
        return False
    
    def is_authenticated(self):
        return True

def authenticate_user(email, password):
    global db
    hash = hashlib.sha1(password).hexdigest()
    result = db.users.find_one({u'email': email, u'hash': hash})
    if (result):
        return User(result['email'], result['username'], result['username'])
    flash('Invalid username/password combination.')
    return AnonymousUserMixin()

def add_user(username, email, password):
    global db
    # Make sure user and email are not currently taken
    u = db.users.find({'username':username})
    e = db.users.find({'email':email})
    if u.count() > 0 or e.count() > 0:
        print "Username or email already taken"
    else:
        hash = hashlib.sha1(password).hexdigest()
        db.users.insert({
            'email': email
            , 'hash': hash
            , 'username': username
        })
    