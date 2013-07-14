import random
import flask

import socketio
import socketio.server
from socketio.namespace import BaseNamespace
from socketio.mixins import RoomsMixin, BroadcastMixin

from game import Game


app = flask.Flask(__name__, static_folder='static', static_url_path='')
app.debug = True


@app.route("/")
def hello():
    return flask.redirect('/ui.html')

@app.route("/2")
def hello2():
    return flask.render_template('hello2.html')



class ServerState():
    def __init__(self):
        self.waiting_player = None
        '''player that currently awaits to be paired'''

        self.game_players = {}
        '''Game -> (player, player) mapping for socket lookup'''

state = ServerState()

def session_property(name):
    def fget(self):
        try:
            return self.socket.session[name]
        except KeyError:
            raise AttributeError(name)
    def fset(self, val):
        self.socket.session[name] = val
    def fdel(self):
        del self.socket.session[name]
    return property(fget=fget, fset=fset, fdel=fdel)

def forward_to_game(func):
    '''
    translates a client call like:

        socket.emit('msg', arg1, arg2);

    to the given player's Game, in the following way:

        game.on_msg(player, arg1, arg2)

    '''
    import functools
    fname = func.__name__
    assert fname.startswith('on_')
    @functools.wraps(func)
    def wrapped(self, *args):
        self.logger.info('[on] %s', fname)
        try:
            game = self.game
        except AttributeError:
            # player has no game, meh
            return
        getattr(game, fname)(self.idx, *args)
    return wrapped


class MinefieldNamespace(BaseNamespace, RoomsMixin, BroadcastMixin):

    # BTW wouldn't regular instance object work here?
    # -- probably they would, but things get complicated when one socket has several namespaces
    nick = session_property('nick')
    idx = session_property('idx')
    game = session_property('game')

    def initialize(self):
        MinefieldNamespace.logger = app.logger


    def on_ping(self, n):
        self.emit('pong', n*2)


    def on_hello(self, nick):
        self.nick = nick
        if state.waiting_player is None:
            self.logger.info('[join] %s (waiting)', nick)
            state.waiting_player = self
            self.emit('wait')
        else:
            self.logger.info('[join] %s (match)', nick)
            self.start_game((state.waiting_player, self))
            state.waiting_player = None


    def start_game(self, players):
        # TODO stay safe, check for duplicate rooms
        room_id = str(random.randint(10, 100000))
        game = Game(nicks=[p.nick for p in players], callback=self.game_callback)
        for player, opponent in zip(players, players[::-1]):
            player.join(room_id) # hmm, socket.io rooms are kinda unused here
            player.game = game
        for i in xrange(2):
            players[i].idx = i
        state.game_players[game] = players
        game.start()
        self.logger.info('[game start] %s vs %s, room %s', players[0].nick, players[1].nick, room_id)


    def game_callback(self, player_idx, msg_type, msg):
        state.game_players[self.game][player_idx].emit(msg_type, msg)


    def recv_disconnect(self):
        if hasattr(self, 'game'):
            # TODO kill the game, notify the other player
            pass
        if self is state.waiting_player:
            state.waiting_player = None
        nick = getattr(self, 'nick', '((anonymous))')
        self.logger.info("[disconnect] %s", nick)
        self.disconnect(silent=True) # btw why is that needed?


    @forward_to_game
    def on_hand():
        pass

    @forward_to_game
    def on_discard():
        pass




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
