from app import db, TaskStatus
from app.sources.source import Source

source_list = db.sources.find({'status':TaskStatus.ENABLED})
for source_data in source_list:
    source = Source.make(source_data)
    source.extract()
    source.transform()
    source.load()
    