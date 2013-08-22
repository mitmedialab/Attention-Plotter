import pymongo

db = pymongo.Connection('localhost').attention

db.sources.remove()
db.counts.remove()
db.transformed.remove()
db.results.remove()

