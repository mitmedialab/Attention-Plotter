import pymongo

db = pymongo.Connection('localhost').attention

db.sources.remove()
db.raw.remove()
db.words.remove()
db.transformed.remove()
db.results.remove()
