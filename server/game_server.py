import logging
import argparse

import socketio
import socketio.namespace
import socketio.server

from room import Room


logger = logging.getLogger('server')


class GameServer(object):
    def __init__(self):
        self.waiting_player = None
        self.rooms = []

    def add_player(self, player):
        '''Adds a player to the server.'''

        if self.waiting_player:
            players = (self.waiting_player, player)
            room = Room(players)
            self.rooms.append(room)
        else:
            self.waiting_player = player

    def remove_player(self, player):
        if player == self.waiting_player:
            self.waiting_player = None
            player.disconnect()
        elif player.room:
            player.room.remove_player(player.idx)
        else:
            player.disconnect()

    def serve_request(self, environ, start_response):
        path = environ['PATH_INFO'].strip('/')
        if path.startswith("socket.io"):
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
        server = socketio.server.SocketIOServer(
            (host, port),
            self.serve_request,
            resource="socket.io")
        server.serve_forever()


class SocketPlayer(socketio.namespace.BaseNamespace):
    def initialize(self):
        self.server = self.request['server']
        self.nick = None
        self.room = None
        self.idx = None

    def on_hello(self, nick):
        assert not self.room
        self.nick = nick
        if not self.server.add_player(self):
            self.emit('wait')

    def set_room(self, room, idx):
        self.room = room
        self.idx = idx

    def recv_disconnect(self):
        logger.info("[disconnect] %s", self.nick)
        self.server.remove_player(self)

    def on_hand(self, msg):
        self.room.send_to_game(self.idx, 'hand', msg)

    def on_discard(self, msg):
        self.room.send_to_game(self.idx, 'discard', msg)

    def send(self, msg_type, msg):
        self.emit(msg_type, msg)

    def shutdown(self):
        self.disconnect()


def main():
    parser = argparse.ArgumentParser(description='Serve the Minefield Mahjong application.')
    parser.add_argument('--host', metavar='IP', type=str, default='127.0.0.1')
    parser.add_argument('--port', metavar='PORT', type=int, default=8080)
    parser.add_argument('--debug', action='store_true', default=False, help='Debug mode (serve static files as well)')
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(name)s: %(message)s')

    from gevent import monkey
    monkey.patch_all()

    print 'Starting server:', args
    server = GameServer()
    server.serve(args.host, args.port, args.debug)


if __name__ == '__main__':
    main()
