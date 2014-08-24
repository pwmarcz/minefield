
import unittest
import logging

from game import Game


class Room(object):
    def __init__(self, players=[None, None], game_class=Game):
        self.game = game_class(callback=self.game_callback)
        self.players = players
        self.messages = [[], []]
        self.id = 42 # TODO
        self.logger = logging.getLogger('room.%r' % self.id)

        self.logger.info('starting')
        self.game.start()

    def game_callback(self, idx, msg_type, msg):
        self.messages[idx].append((msg_type, msg))
        if self.players[idx]:
            self.logger.info('send to %d: %s %r', idx, msg_type, msg)
            self.players[idx].send(msg_type, msg)

    def add_player(self, idx, player):
        assert not self.players[idx]
        self.players[idx] = player
        self.resend_messages(idx)

    def resend_messages(self, idx):
        n_received = self.players[idx].n_received
        messages = self.messages[idx]
        for msg_type, msg in messages[n_received:]:
            self.logger.info('resend to %d: %s %r', idx, msg_type, msg)
            self.players[idx].send(msg_type, msg)

    def send_to_game(self, idx, msg_type, msg):
        self.logger.info('receive from %d: %s %r', idx, msg_type, msg)
        try:
            handler = getattr(self.game, 'on_'+msg_type)
            handler(idx, msg)
        except:
            self.logger.exception('exception after receiving')
            self.shutdown()

    def shutdown(self):
        for idx in range(2):
            self.players[idx].shutdown()


class RoomTest(unittest.TestCase):
    class MockGame(object):
        def __init__(self, nicks=None, east=None, callback=None):
            self.callback = callback
            self.started = False

        def start(self):
            assert not self.started
            self.started = True

        def on_ping(self, idx, msg):
            self.callback(1-idx, 'pong', msg)

        def on_crash(self, idx, msg):
            raise RuntimeError('crashed')

    class MockPlayer(object):
        def __init__(self, n_received=0):
            self.messages = []
            self.n_received = n_received
            self.finished = False

        def send(self, msg_type, msg):
            self.messages.append((msg_type, msg))

        def shutdown(self):
            self.finished = True

    def create_room(self, players=[None, None]):
        return Room(players, game_class=self.MockGame)

    def test_create(self):
        room = self.create_room()
        self.assertIsInstance(room.game, self.MockGame)
        self.assertTrue(room.game.started)

    def test_send_immediately(self):
        player0 = self.MockPlayer()
        room = self.create_room([player0, None])
        room.game.callback(0, 'ping_0', {})
        self.assertEquals(len(player0.messages), 1)
        self.assertEquals(player0.messages[0][0], 'ping_0')

        player1 = self.MockPlayer()
        room.add_player(1, player1)
        room.game.callback(1, 'ping_1', {})
        self.assertEquals(len(player1.messages), 1)
        self.assertEquals(player1.messages[0][0], 'ping_1')

    def test_resend_after_connect(self):
        room = self.create_room()
        room.game.callback(0, 'a', {})
        room.game.callback(0, 'b', {})
        room.game.callback(1, 'c', {})
        room.game.callback(1, 'd', {})
        room.game.callback(0, 'e', {})
        player0 = self.MockPlayer(n_received=1)
        room.add_player(0, player0)
        self.assertEquals(len(player0.messages), 2)
        self.assertEquals(player0.messages[0][0], 'b')
        self.assertEquals(player0.messages[1][0], 'e')

    def test_send_to_game(self):
        player0 = self.MockPlayer()
        player1 = self.MockPlayer()
        room = self.create_room([player0, player1])
        room.send_to_game(1, 'ping', {})
        self.assertEquals(len(player0.messages), 1)
        self.assertEquals(player0.messages[0][0], 'pong')

    def test_send_and_crash(self):
        player0 = self.MockPlayer()
        player1 = self.MockPlayer()
        room = self.create_room([player0, player1])
        room.send_to_game(0, 'crash', {})
        self.assertTrue(player0.finished)
        self.assertTrue(player1.finished)

if __name__ == '__main__':
    #logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(name)s: %(message)s')
    unittest.main()
