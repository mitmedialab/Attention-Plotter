import sys

import app

if len(sys.argv) < 4:
    print "Usage: adduser.py <username> <email> <password>"
else:
    app.user.add_user(sys.argv[1], sys.argv[2], sys.argv[3])
