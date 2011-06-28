#!/usr/bin/env python
#
# Copyright 2010 Facebook
#
# Licensed under the Apache License, Version 2.0 (the "License"); you may
# not use this file except in compliance with the License. You may obtain
# a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.

"""A barebones AppEngine application that uses Facebook for login."""

FACEBOOK_APP_ID = "128787447183883" # appengine
FACEBOOK_APP_SECRET = "135a9391e3e17e03373ec4aa5a6f8e93" # appengine
#FACEBOOK_APP_ID = "186405271371324" # localhost
#FACEBOOK_APP_SECRET = "9d2bf8d53692f539aa4d4a7da2d0c180" # localhost

import facebook
import os.path
import wsgiref.handlers

from google.appengine.api import memcache
from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util
from google.appengine.ext.webapp import template


class User(db.Model):
    id = db.StringProperty(required=True)
    created = db.DateTimeProperty(auto_now_add=True)
    updated = db.DateTimeProperty(auto_now=True)
    name = db.StringProperty(required=True)
    profile_url = db.StringProperty(required=True)
    access_token = db.StringProperty(required=True)
    last_ip = db.StringProperty()


class Message(db.Model):
    user = db.ReferenceProperty(User)
    hide_user = db.BooleanProperty(default=True)
    content = db.StringProperty(multiline=True)
    date = db.DateTimeProperty(auto_now_add=True)
    delivered = db.BooleanProperty(default=False)

    def replies(self):
        reply_list = (x for x in self.reply_set)
        return sorted(reply_list, key=lambda reply: reply.date)


class Reply(Message):
    message = db.ReferenceProperty(Message)


class Inbox(db.Model):
    user = db.ReferenceProperty(User)
    message = db.ReferenceProperty(Message)
    number = db.IntegerProperty(default=0)


class BaseHandler(webapp.RequestHandler):
    """Provides access to the active Facebook user in self.current_user

    The property is lazy-loaded on first access, using the cookie saved
    by the Facebook JavaScript SDK to determine the user ID of the active
    user. See http://developers.facebook.com/docs/authentication/ for
    more information.
    """
    @property
    def current_user(self):
        if not hasattr(self, "_current_user"):
            self._current_user = None
            cookie = facebook.get_user_from_cookie(
                self.request.cookies, FACEBOOK_APP_ID, FACEBOOK_APP_SECRET)
            if cookie:
                # Store a local instance of the user data so we don't need
                # a round-trip to Facebook on every request
                user = User.get_by_key_name(cookie["uid"])
                if not user:
                    graph = facebook.GraphAPI(cookie["access_token"])
                    profile = graph.get_object("me")
                    user = User(key_name=str(profile["id"]),
                                id=str(profile["id"]),
                                name=profile["name"],
                                profile_url=profile["link"],
                                access_token=cookie["access_token"])
                    user.last_ip = self.request.remote_addr
                    user.put()
                elif user.access_token != cookie["access_token"]:
                    user.access_token = cookie["access_token"]
                    user.last_ip = self.request.remote_addr
                    user.put()
                self._current_user = user
        return self._current_user


class HomeHandler(BaseHandler):
    @property
    def get_inbox(self):
        inbox = Inbox.all().filter('user = ', self.current_user).order('-number')
        def first(i): return i.message
        messages = map(first, inbox)
        return messages

    def get(self):          
        if not self.current_user: return self.redirect('/login') # login check
        
        messages = self.get_inbox
        none_available = self.request.get('none_available', None) # for displaying no new messages alert
        limit = self.request.get('limit', None)

        path = os.path.join(os.path.dirname(__file__), "home.html")
        args = dict(current_user = self.current_user,
                    facebook_app_id = FACEBOOK_APP_ID,
                    messages = messages,
                    none_available = none_available,
                    limit = limit)
        self.response.out.write(template.render(path, args))

    post = get


class SentMessagesHandler(BaseHandler):
    @property
    def get_sent(self):
        messages = Message.all().filter('user = ', self.current_user).order('-date')
        return messages

    def get(self):          
        if not self.current_user: return self.redirect('/login') # login check
        
        messages = self.get_sent
        
        path = os.path.join(os.path.dirname(__file__), "sent.html")
        args = dict(current_user = self.current_user,
                    facebook_app_id = FACEBOOK_APP_ID,
                    messages = messages)
        self.response.out.write(template.render(path, args))
    
    post = get


class DeliveryHandler(BaseHandler):
    def get(self):
        if not self.current_user: return self.redirect('/login') # login check

        # find last inbox number
        inbox = Inbox.all().filter('user = ', self.current_user).order('-number').fetch(1)
        if not inbox:
            last_number = 0
        else:
            last_number = inbox[0].number

        # add new message if one is found
        # TODO: make this a transaction
        # TODO: pick a message more intelligently?
        message_query = Message.all().filter('user != ', self.current_user)
        message_query.filter('delivered = ', False)
        new_message = message_query.fetch(1)

        if new_message:
            # rate limit to 5 new messages every hour
            memcache_key = self.current_user.id + "_d"
            if not memcache.get(memcache_key):
                # set hourly limit
                memcache.add(memcache_key, 1, 3600)
            elif memcache.get(memcache_key) < 5:
                # increase hourly limit
                memcache.incr(memcache_key)
            else:
                # hit limit
                return self.redirect('/home?limit=0')

        if new_message:
            inbox_item = Inbox()
            inbox_item.message = new_message[0]
            inbox_item.user = self.current_user
            inbox_item.number = last_number + 1
            inbox_item.message.delivered = True
            inbox_item.message.put()
            inbox_item.put()
            return self.redirect('/home')

        return self.redirect('/home?none_available=0') # signals no new messages available

    post = get


class MessageHandler(BaseHandler):
    def post(self):
        if not self.current_user: return self.redirect('/login') # login check
        
        # rate limit to 5 sends every hour
        memcache_key = self.current_user.id + "_s"
        if not memcache.get(memcache_key):
            # set hourly limit
            memcache.add(memcache_key, 1, 3600)
        elif memcache.get(memcache_key) < 5:
            # increase hourly limit
            memcache.incr(memcache_key)
        else:
            # hit limit
            return self.redirect('/home?limit=1')

        message = Message()
        
        if self.request.get("hide"):
            message.hide_user = True
        else:
            message.hide_user = False
        
        message.user = self.current_user
        message.content = self.request.get('content')[0:499]
        if message.content.strip() != '': message.put()
        return self.redirect(self.request.get('redirect'))


class ReplyHandler(BaseHandler):
    def post(self):
        if not self.current_user: return self.redirect('/login') # login check
        
        # rate limit to 60 replies every hour
        memcache_key = self.current_user.id + "_r"
        if not memcache.get(memcache_key):
            # set hourly limit
            memcache.add(memcache_key, 1, 3600)
        elif memcache.get(memcache_key) < 60:
            # increase hourly limit
            memcache.incr(memcache_key)
        else:
            # hit limit
            return self.redirect('/home?limit=2')

        reply = Reply()
        
        if self.request.get("hide"):
            reply.hide_user = True
        else:
            reply.hide_user = False
        
        reply.user = self.current_user
        reply.message = db.get(self.request.get('message_id'))
        reply.content = self.request.get('content')[0:499]
        if reply.content.strip() != '': reply.put()
        return self.redirect(self.request.get('redirect'))


class LoginHandler(BaseHandler):
    def get(self):
        if self.current_user: return self.redirect('/') # login redirect check
        
        path = os.path.join(os.path.dirname(__file__), "login.html")
        args = dict(current_user = self.current_user,
                    facebook_app_id = FACEBOOK_APP_ID)
        self.response.out.write(template.render(path, args))

    post = get


def main():
    util.run_wsgi_app(webapp.WSGIApplication([('/', HomeHandler),
                                                ('/home', HomeHandler),
                                                ('/login', LoginHandler),
                                                ('/new_message', DeliveryHandler),
                                                ('/sent_messages', SentMessagesHandler),
                                                ('/send', MessageHandler),
                                                ('/reply', ReplyHandler)],
                                                debug = True))


if __name__ == "__main__":
    main()
