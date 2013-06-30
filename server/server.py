
import flask

import socketio
import socketio.server
from socketio.namespace import BaseNamespace
from socketio.mixins import RoomsMixin, BroadcastMixin


app = flask.Flask(__name__, static_folder='static', static_url_path='/static')
app.debug = True


@app.route("/")
def hello():
    return flask.render_template('hello.html')


class MinefieldNamespace(BaseNamespace, RoomsMixin, BroadcastMixin):
    def on_ping(self, n):
        self.emit('pong', n*2)

    def on_nickname(self, nickname):
        self.request['nicknames'].append(nickname)
        self.socket.session['nickname'] = nickname
        self.broadcast_event('announcement', '%s has connected' % nickname)
        self.broadcast_event('nicknames', self.request['nicknames'])
        # Just have them join a default-named room
        self.join('main_room')

    def recv_disconnect(self):
        # Remove nickname from the list.
        nickname = self.socket.session['nickname']
        self.request['nicknames'].remove(nickname)
        self.broadcast_event('announcement', '%s has disconnected' % nickname)
        self.broadcast_event('nicknames', self.request['nicknames'])

        self.disconnect(silent=True)

    def on_user_message(self, msg):
        self.emit_to_room('main_room', 'msg_to_room',
            self.socket.session['nickname'], msg)



@app.route('/socket.io/<path:remaining>')
def run_socketio(remaining):
    try:
        socketio.socketio_manage(flask.request.environ, {'/minefield': MinefieldNamespace}, flask.request)
    except:
        app.logger.error("Exception while handling socketio connection",
                         exc_info=True)
    return flask.Response()

if __name__ == '__main__':
    from gevent import monkey
    monkey.patch_all()

    server = socketio.server.SocketIOServer(('', 8080), app, resource="socket.io")
    server.serve_forever()
