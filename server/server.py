
# we need to install monkey-patching before everything else
# see http://stackoverflow.com/questions/8774958/keyerror-in-module-threading-after-a-successful-py-test-run
from gevent import monkey; monkey.patch_all()

import logging
import argparse
import signal
import sys
import os
import functools
from datetime import datetime
import unittest

import gevent
import socketio
import socketio.namespace
import socketio.server

from room import Room
from database import Database
from logs import init_logging
from utils import make_key
from bot_player import BotPlayer

logger = logging.getLogger('server')


class GameServer(object):
    def __init__(self, fname, use_bots=False):
        self.waiting_players = {}
        self.db = Database(fname)
        self.rooms = self.db.load_unfinished_rooms()
        self.t = 0
        self.timer = None
        self.use_bots = use_bots

        if use_bots:
            for room in self.rooms:
                for i, nick in enumerate(room.nicks):
                    # XXX recognize bots in a nicer way
                    if nick == 'Bot':
                        bot = BotPlayer()
                        room.add_player(i, bot)

    def add_player(self, player):
        '''Adds a player to the server.'''

        self.waiting_players[player.key] = player
        return

    def join_player(self, player, key):
        if key in self.waiting_players:
            opponent = self.waiting_players.pop(key)
            room = Room([opponent.nick, player.nick])
            self.rooms.append(room)
            # save to database, to assign ID
            self.db.save_room(room)
            room.add_player(0, opponent)
            room.add_player(1, player)
            room.start_game()
        else:
            player.emit('join_failed', 'Opponent not found.')

    def rejoin_player(self, player, key):
        for room in self.rooms:
            for idx in range(2):
                if room.keys[idx] == key:
                    if room.players[idx]:
                        old_player = room.players[idx]
                        self.remove_player(old_player)
                        old_player.shutdown()
                    room.add_player(idx, player)

    def remove_player(self, player):
        if player.key in self.waiting_players:
            del self.waiting_players[player.key]
        elif player.room:
            player.room.remove_player(player.idx)
        else:
            pass

    def describe_games(self):
        result = []
        for room in self.rooms:
            if not room.finished:
                result.append({'type': 'game', 'nicks': room.nicks})
        for player in self.waiting_players.values():
            result.append({
                'type': 'player',
                'nick': player.nick,
                'key': player.key,
            })
        return result

    def serve_request(self, environ, start_response):
        path = environ['PATH_INFO'].strip('/')
        if path.startswith("socket.io") and 'socketio' in environ:
            request = {'server': self}
            try:
                socketio.socketio_manage(environ, {'/minefield': SocketPlayer}, request)
            except:
                logger.exception('server error')
        elif self.debug:
            return self.static_app(environ, start_response)
        else:
            start_response('404 Not Found', [])
            return ['<h1>Not Found</h1>']

    def serve(self, host, port, debug):
        self.debug = debug
        if debug:
            import static
            self.static_app = static.Cling('static')
        self.socketio_server = socketio.server.SocketIOServer(
            (host, port),
            self.serve_request,
            resource="socket.io")
        self.timer = Timer(self.beat)
        self.socketio_server.serve_forever()

    def stop(self, immediate=False):
        logger.info('stopping')
        if not immediate:
            if self.timer:
                self.timer.stop()
        self.save_rooms()
        if hasattr(self, 'socketio_server'):
            self.socketio_server.stop()

    def add_bot(self):
        if not any(isinstance(player, BotPlayer)
                   for player in self.waiting_players.values()):
            logger.info('adding a bot')
            bot = BotPlayer()
            self.add_player(bot)

    def beat(self):
        logger.debug('beat')
        for room in self.rooms:
            room.beat()
        if self.use_bots:
            self.add_bot()

        self.t += 1
        if self.t % 60*60*3 == 0:
            logger.info('beat t = %d', self.t)
        if self.t % 30 == 0:
            self.save_rooms()
            for room in list(self.rooms):
                if not (room.players[0] or room.players[1]):
                    # delete rooms after 1h
                    if room.finished or room.game.t > 60*60*1:
                        logger.info('removing inactive room %s from memory', room.id)
                        self.rooms.remove(room)

    def save_rooms(self):
        logger.debug('saving %d rooms', len(self.rooms))
        for room in self.rooms:
            self.db.save_room(room)


class Timer(object):
    SLEEP_INTERVAL = 0.2

    def __init__(self, beat):
        self.beat = beat
        self.thread = gevent.spawn(self.run)

    def run(self):
        start = datetime.now()
        t = 0
        while True:
            new_t = int((datetime.now() - start).seconds)
            if t >= new_t:
                gevent.sleep(self.SLEEP_INTERVAL)
            else:
                t += 1
                try:
                    self.beat()
                except:
                    logger.exception('error in beat')

    def stop(self):
        self.thread.kill()


class SocketPlayer(socketio.namespace.BaseNamespace):
    def initialize(self):
        self.server = self.request['server']
        self.nick = None
        self.room = None
        self.idx = None
        self.key = make_key()

    def on_new_game(self, nick):
        assert not self.room
        self.nick = nick
        self.server.add_player(self)

    def on_cancel_new_game(self):
        if self.room:
            # Too late - the player has joined a game.
            pass
        else:
            self.server.remove_player(self)

    def on_join(self, nick, key):
        assert not self.room
        self.nick = nick
        self.server.join_player(self, key)

    def on_rejoin(self, key):
        self.server.rejoin_player(self, key)

    def on_get_games(self):
        self.emit('games', self.server.describe_games())

    def set_room(self, room, idx):
        self.room = room
        self.idx = idx
        self.emit('room', {'key': self.room.keys[self.idx],
                           'nicks': self.room.nicks,
                           'you': self.idx});

    def recv_disconnect(self):
        logger.info("[disconnect] %s", self.nick)
        self.server.remove_player(self)
        self.shutdown()

    def on_hand(self, msg):
        self.room.send_to_game(self.idx, 'hand', msg)

    def on_discard(self, msg):
        self.room.send_to_game(self.idx, 'discard', msg)

    def on_boom(self):
        raise Exception("'boom' received")

    def send(self, msg_type, msg):
        self.emit(msg_type, msg)

    def shutdown(self):
        self.disconnect()

    def exception_handler_decorator(self, fn):
        @functools.wraps(fn)
        def wrap(*args, **kwargs):
            try:
                return fn(*args, **kwargs)
            except:
                logger.exception('server error')
                self.shutdown()
        return wrap


class ServerTest(unittest.TestCase):
    class MockSocketPlayer(SocketPlayer):
        def __init__(self, server):
            self.request = {'server': server}
            self.initialize()
            self.messages = []
            self.disconnected = False

        def emit(self, *args):
            self.messages.append(tuple(args))

        def disconnect(self):
            self.disconnected = True

    def setUp(self):
        self.server = GameServer(':memory:')

    def test_new_game(self):
        player = self.MockSocketPlayer(self.server)
        player.on_new_game('Akagi')
        self.assertEquals(len(self.server.waiting_players), 1)
        self.assertEquals(self.server.waiting_players.values()[0], player)

    def test_new_game_disconnect(self):
        player = self.MockSocketPlayer(self.server)
        player.on_new_game('Akagi')
        player.recv_disconnect()
        self.assertEquals(len(self.server.waiting_players), 0)
        self.assertTrue(player.disconnected)

    def test_join(self):
        player1 = self.MockSocketPlayer(self.server)
        player1.on_new_game('Akagi')
        player2 = self.MockSocketPlayer(self.server)
        player2.on_join('Washizu', player1.key)
        self.assertEquals(len(self.server.waiting_players), 0)
        self.assertEquals(len(self.server.rooms), 1)
        self.assertEquals(self.server.rooms[0].nicks, ['Akagi', 'Washizu'])
        self.assertEquals(player1.messages[0][0], 'room')
        self.assertEquals(player2.messages[0][0], 'room')

    def test_join_failed(self):
        player1 = self.MockSocketPlayer(self.server)
        player1.on_join('Akagi', 'nonexistent key')
        self.assertEquals(player1.messages[0][0], 'join_failed')

    def test_abort(self):
        player1 = self.MockSocketPlayer(self.server)
        player1.on_new_game('Akagi')
        player2 = self.MockSocketPlayer(self.server)
        player2.on_join('Washizu', player1.key)

        # send an invalid request
        player1.on_hand(['X1'])
        self.assertEquals(player1.messages[-1][0], 'abort')
        self.assertEquals(player2.messages[-1][0], 'abort')

        room = self.server.rooms[0]
        self.assertTrue(room.finished)


def main():
    parser = argparse.ArgumentParser(description='Serve the Minefield Mahjong application.')
    parser.add_argument('--host', metavar='IP', type=str, default='127.0.0.1')
    parser.add_argument('--port', metavar='PORT', type=int, default=8080)
    parser.add_argument('--debug', action='store_true', default=False, help='Debug mode (serve static files as well)')
    args = parser.parse_args()

    init_logging()

    print 'Starting server:', args
    fname = os.path.join(os.path.dirname(__file__), 'minefield.db')
    server = GameServer(fname, use_bots=True)

    def shutdown():
        server.stop(immediate=True)
        sys.exit(signal.SIGINT)
    gevent.signal(signal.SIGINT, shutdown)
    server.serve(args.host, args.port, args.debug)


if __name__ == '__main__':
    main()
