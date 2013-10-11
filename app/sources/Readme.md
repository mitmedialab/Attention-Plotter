To add a new data source, create a file in this directory that defines a new
class extending from Source.  Then add that file to the configuration in
app/__init__.py.

A data source class should define the following:
* A `name` class variable defining the human-readable name of the data source.
* (optional) A `create_form(cls)` class method returning a configuration form
for the data source.  The form should extend CreateSourceForm (which extends
flask.ext.wtf.Form).
* (optional) A `create(cls, request, username, project_name)` class method that
adds one or more entries to the `source` database collection and returns it.
* An `extract()` method which retrieves data from remote sources into the `raw`
database collection.
* A `transform()` method which performs any computation dependent on the entire
data set and stores the results in the `transformed` db collection.
* A `load()` method which adds a single object to the db `results` collection
for each date in the query.  An array of these objects will be passed as json
to the client-side code.
