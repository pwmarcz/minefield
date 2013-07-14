import random
import unittest

import rules

DEBUG = False

TILES = rules.ALL_TILES * 4
PLAYER_TILES = 34
DISCARDS = 17

def dora_for_tile(tile):
    return rules.interpret_dora_ind(tile)

def dummy_callback(player, msg_type, msg):
    import pprint
    pprint.pprint((player, msg_type, msg))

class RuleViolation(Exception):
    pass

class Game(object):
    def __init__(self,
                 nicks=['P1','P2'],
                 east=0,
                 callback=dummy_callback):
        self.callback = callback

        all_tiles = list(TILES)

        if not DEBUG:
            random.shuffle(all_tiles)

        self.nicks = nicks
        self.east = east

        # Tiles available for players
        n = PLAYER_TILES
        self.tiles = [all_tiles[:n], all_tiles[n:n*2]]

        self.dora_ind = all_tiles[n*2]
        self.dora = dora_for_tile(self.dora_ind)

        # Players' hands (None until they've chosen them)
        self.hand = [None, None]

        self.waits = [None, None]

        self.discards = [[], []]

        self.furiten = [False, False]

        self.finished = False

    @property
    def phase(self):
        # First phase - hand selection
        if not (self.hand[0] and self.hand[1]):
            return 1
        # Second phase - discards
        elif not self.finished:
            return 2
        # Game finished
        else:
            return 3

    @property
    def player_turn(self):
        if len(self.discards[0]) == len(self.discards[1]):
            return 0
        else:
            return 1

    def start(self):
        for i in xrange(2):
            self.callback(i, 'phase_one',
                          {'nicks': self.nicks,
                           'tiles': self.tiles[i],
                           'dora': self.dora,
                           'you': i,
                           'east': self.east})

    def on_hand(self, player, hand):
        if self.phase != 1:
            raise RuleViolation('on_hand: wrong phase')
        if len(hand) != 13:
            raise RuleViolation('on_hand: len != 13')
        if self.hand[player] != None:
            raise RuleViolation('on_hand: hand already sent')
        for tile in hand:
            # this fails if a player doesn't have a tile
            try:
                self.tiles[player].remove(tile)
            except ValueError:
                raise RuleViolation('on_hand: tile not found in choices')

        self.hand[player] = hand
        self.waits[player] = list(rules.waits(hand))

        if self.hand[0] and self.hand[1]:
            # start the second phase
            for i in xrange(2):
                self.callback(i, 'phase_two', {})
            self.callback(self.player_turn, 'your_move', {})
        else:
            self.callback(player, 'wait', {})

    def on_discard(self, player, tile):
        if self.phase != 2:
            raise RuleViolation('on_discard: wrong phase')
        if self.player_turn != player:
            raise RuleViolation('on_discard: not your turn')
        if tile not in self.tiles[player]:
            raise RuleViolation('on_discard: tile not found in choices')

        self.tiles[player].remove(tile)
        self.discards[player].append(tile)
        if tile in self.waits[player]:
            self.furiten[player] == True

        for i in xrange(2):
            self.callback(i, 'discarded',
                          {'player': player,
                           'tile': tile})

        # ron
        if tile in self.waits[1-player] and not self.furiten[1-player]:
            self.finished = True
            for i in range(2):
                self.callback(i, 'ron', {})
            # TODO announce hand, etc.
        # draw
        elif len(self.discards[0]) == len(self.discards[1]) == DISCARDS:
            self.finished = True
            for i in xrange(2):
                self.callback(i, 'draw', {})
        # normal turn
        else:
            self.callback(self.player_turn, 'your_move', {})


class GameTestCase(unittest.TestCase):
    def setUp(self):
        from collections import deque

        global DEBUG
        DEBUG = True # suppress randomization

        self.messages = deque()

        self.g = Game(callback=self.callback)
        self.g.start()

    def assertMessage(self, player, msg_type, msg={}):
        our_m = self.messages.popleft()
        self.assertEqual(our_m, (player, msg_type, msg))

    def assertMessageBoth(self, msg_type, msg={}):
        self.assertMessage(0, msg_type, msg)
        self.assertMessage(1, msg_type, msg)

    def callback(self, player, msg_type, msg):
        self.messages.append((player, msg_type, msg))

    def test_init(self):
        # the game has just been created
        n = PLAYER_TILES
        self.assertMessage(0, 'phase_one',
                           {'nicks': ['P1', 'P2'],
                            'tiles': TILES[:n],
                            'dora': 'M2',
                            'you': 0,
                            'east': 0})
        self.assertMessage(1, 'phase_one',
                           {'nicks': ['P1', 'P2'],
                            'tiles': TILES[n:n*2],
                            'dora': 'M2',
                            'you': 1,
                            'east': 0})

    def test_game_scenario(self):
        self.test_init()

        self.g.on_hand(0, 'M1 M2 M3 M4 M5 M6 M7 M8 M9 P1 P2 P3 P4'.split())
        self.assertMessage(0, 'wait')
        self.g.on_hand(1, 'M1 M2 M3 M4 M5 M6 M7 M8 M9 P1 P2 P3 P4'.split())
        self.assertMessageBoth('phase_two')

        for i in xrange(DISCARDS):
            for j in xrange(2):
                self.assertMessage(j, 'your_move')
                # Just discard the first choice
                t = self.g.tiles[j][0]
                self.g.on_discard(j, t)
                self.assertMessageBoth('discarded', {'player': j,
                                                     'tile': t})
        self.assertMessageBoth('draw')


    def test_short_hand(self):
        self.assertRaises(RuleViolation,
                          lambda: self.g.on_hand(0, 'M1 M2 M3'.split()))

    def test_tiles_outside_initial(self):
        self.assertRaises(RuleViolation,
                          lambda: self.g.on_hand(0, ['M1']*13))

    def test_dora_for_tile(self):
        self.assertEquals(dora_for_tile('M2'), 'M3')
        self.assertEquals(dora_for_tile('P9'), 'P1')
        self.assertEquals(dora_for_tile('X1'), 'X2')
        self.assertEquals(dora_for_tile('X4'), 'X1')
        self.assertEquals(dora_for_tile('X6'), 'X7')
        self.assertEquals(dora_for_tile('X7'), 'X5')

if __name__ == '__main__':
    unittest.main()
