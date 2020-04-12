
# See https://bitbucket.org/noppo/gevent-websocket/issues/55/websocketapplication-is-not-technically-a

# Copyright (c) 2014 Sylvain Prat. This program is open-source software,
# and may be redistributed under the terms of the MIT license. See the
# LICENSE file in this distribution for details.

from geventwebsocket import WebSocketError


# FIXME: add jobs (spawning jobs with kill on disconnect)
# FIXME: add event broadcasting
# FIXME: add a room concept
# FIXME: expose a socket identifier, could be useful for logging


class WebSocketAgent(object):
    """Base class for WebSocket agents"""

    # Agent API
    def send(self, message):
        self._socket.send(message)

    def disconnect(self, message='', code=1000):
        self._socket.close(code=code, message=message)

    # customize these methods in your agent
    def on_connect(self):
        pass

    def on_message(self, message):
        self.send(message)

    def on_disconnect(self):
        pass

    # --------
    # WSGI API
    @classmethod
    def wsgi_application(cls, *args, **kwargs):
        """Returns a WSGI application that will create an agent for each
        incoming WebSocket request, passing the given positional and keywords
        arguments as constructor parameters"""

        def wsgiapp(environ, start_response):
            agent = cls(*args, **kwargs)
            return agent(environ, start_response)

        return wsgiapp

    def __call__(self, environ, start_response):
        """Process a single WebSocket request"""
        self._socket = environ["wsgi.websocket"]
        # run the receive loop
        try:
            self.on_connect()
            while True:
                try:
                    error = None

                    # socket already closed?
                    if self._socket.closed:
                        break

                    # wait for a new message
                    message = self._socket.receive()

                    # socket closing?
                    if message is None:
                        break

                    # process the new message
                    self.on_message(message)
                except WebSocketError as error:
                    break
        finally:
            self.on_disconnect(error)
            del self._socket
        return []
