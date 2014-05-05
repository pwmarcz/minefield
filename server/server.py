import random
import flask
import argparse
from datetime import datetime

import gevent
import socketio
import socketio.server
from socketio.namespace import BaseNamespace
from socketio.mixins import RoomsMixin, BroadcastMixin

from game import Game


app = flask.Flask(__name__, static_folder='static', static_url_path='')
# Turn off Cache-Control to prevent aggressive caching during development
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

@app.route("/")
def hello():
    return flask.redirect('/index.html', 301)

# Legacy redirect
@app.route("/ui.html")
def ui():
    return flask.redirect('/index.html', 301)

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
        self.timer = gevent.spawn(self.run_timer)

    def run_timer(self):
        start = datetime.now()
        t = 0
        while True:
            new_t = int((datetime.now() - start).seconds)

            if t < new_t:
                t += 1
                try:
                    self.game.beat()
                except:
                    self.logger.exception('[%X] exception in Game', id(self))
                    self.shutdown()
                    return
            else:
                gevent.sleep(seconds=0.5)

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
        self.timer.kill()
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


def main():
    parser = argparse.ArgumentParser(description='Serve the Minefield Mahjong application.')
    parser.add_argument('--host', metavar='IP', type=str, default='127.0.0.1')
    parser.add_argument('--port', metavar='PORT', type=int, default=8080)
    parser.add_argument('--debug', action='store_true', default=False, help='Run Flask in debug mode')

    args = parser.parse_args()

    from gevent import monkey
    monkey.patch_all()

    app.debug = args.debug
    print 'Starting server:', args
    server = socketio.server.SocketIOServer((args.host, args.port), app, resource="socket.io")
    server.serve_forever()

if __name__ == '__main__':
    main()
