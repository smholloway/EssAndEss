#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

import twitter
import os

from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

class MainPage(webapp.RequestHandler):
    def get(self):
        path = os.path.join(os.path.dirname(__file__), 'index.html')
        self.response.out.write(template.render(path, None))
    
    def post(self):
        status_msg = self.request.get("status", None)
        if status_msg:
            api = twitter.Api(consumer_key='i3WgqeyrloRfuJCo8VIK2g', consumer_secret='f99aZunxMR62fQUcSElci80BsoXjYOy194dw8aqSg6k', access_token_key='274654637-6H8eHeoejEgkpR4K7K98DH3w8bcuCjC0XeDM7TN9', access_token_secret='uMpHAu3cIXdLbI9cwTDiPXjoqh3S6m4Kcvs0cnDC1s')
            api.PostUpdate(status_msg)
        path = os.path.join(os.path.dirname(__file__), 'index.html')
        self.response.out.write(template.render(path, None))

application = webapp.WSGIApplication(
                                     [('/', MainPage)],
                                     debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()