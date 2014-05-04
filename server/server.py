import random
import flask

import socketio
import socketio.server
from socketio.namespace import BaseNamespace
from socketio.mixins import RoomsMixin, BroadcastMixin

from game import Game


app = flask.Flask(__name__, static_folder='static', static_url_path='')
app.debug = True
# Turn off Cache-Control to prevent aggressive caching during development
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

@app.route("/")
def hello():
    return flask.redirect('/ui.html')

@app.route("/css/sprites.css")
def sprites():
    suits = enumerate('MPSX')
    return flask.Response(
        flask.render_template('sprites.css', suits=suits),
        mimetype='text/css')


class ServerState():
    def __init__(self):
        self.waiting_player = None
        '''player that currently awaits to be paired'''

        self.game_players = {}
        '''Game -> (player, player) mapping for socket lookup'''

        self.logger = app.logger

    def add_player(self, player):
        '''Adds a player to the server.
        Returns True if a game has started.'''

        if self.waiting_player:
            players = (self.waiting_player, player)
            room = GameRoom(players)
            self.waiting_player = None
            self.logger.info('[game start] %s vs %s', players[0].nick, players[1].nick)
            return True
        else:
            self.waiting_player = player
            return False

    def remove_player(self, player):
        if player == self.waiting_player:
            self.waiting_player = None
            player.disconnect()
        elif player.room:
            player.room.shutdown()
        else:
            player.disconnect()

SERVER = ServerState()


class GameRoom(object):
    def __init__(self, players):
        self.players = players
        self.game = Game(nicks=[p.nick for p in players],
                         callback=self.game_callback)
        players[0].set_room(self, 0)
        players[1].set_room(self, 1)
        self.logger = app.logger
        self.game.start()

    def game_callback(self, idx, msg_type, msg):
        self.logger.info('[%X] [to %d] %s %r', id(self), idx, msg_type, msg)
        self.players[idx].emit(msg_type, msg)

    def to_game(self, idx, msg_type, msg):
        self.logger.info('[%X] [from %d] %s %r', id(self), idx, msg_type, msg)
        try:
            getattr(self.game, 'on_'+msg_type)(idx, msg)
        except:
            self.logger.exception('[%X] exception in Game', id(self))
            self.shutdown()

    def shutdown(self):
        for i in xrange(2):
            self.players[i].disconnect()


class MinefieldNamespace(BaseNamespace):
    def initialize(self):
        self.logger = app.logger
        self.nick = ''
        self.room = None
        self.idx = None

    def on_hello(self, nick):
        self.nick = nick
        if not SERVER.add_player(self):
            self.emit('wait')

    def set_room(self, room, idx):
        self.room = room
        self.idx = idx

    def recv_disconnect(self):
        self.logger.info("[disconnect] %s", self.nick)
        SERVER.remove_player(self)

    def on_hand(self, msg):
        self.room.to_game(self.idx, 'hand', msg)

    def on_discard(self, msg):
        self.room.to_game(self.idx, 'discard', msg)


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
