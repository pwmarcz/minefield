
import random
import unittest

DEBUG = False

TILES = (['M'+str(n) for n in range(1,10)] +
         ['P'+str(n) for n in range(1,10)] +
         ['S'+str(n) for n in range(1,10)] +
         ['X'+str(n) for n in range(1,7)])*4

def dora_for_tile(tile):
    n = int(tile[1])
    if tile[0] == 'X':
        n = [2, 3, 4, 1, 6, 7, 5][n-1]
    else:
        n = n % 9 + 1
    return tile[0]+str(n)

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

        self.player_turn = 0
        all_tiles = list(TILES)

        if not DEBUG:
            random.shuffle(all_tiles)

        self.nicks = nicks
        self.east = east

        # Tiles available for players
        self.tiles = [all_tiles[:34], all_tiles[34:34*2]]

        self.dora_ind = all_tiles[34*2]
        self.dora = dora_for_tile(self.dora_ind)

        # Players' hands (None until they've chosen them)
        self.hand = [None, None]

        self.discards = [[], []]

    @property
    def phase(self):
        return 2 if all(self.hand) else 1

    def start(self):
        for i in range(2):
            self.callback(i, 'phase_one',
                          {'nicks': self.nicks,
                           'tiles': self.tiles[i],
                           'dora': self.dora,
                           'you': i,
                           'east': self.east})

    def on_hand(self, player, hand):
        if self.phase != 1:
            raise RuleViolation
        if len(hand) != 13:
            raise RuleViolation
        if self.hand[player] != None:
            raise RuleViolation
        for tile in hand:
            # this fails if a player doesn't have a tile
            try:
                self.tiles[player].remove(tile)
            except ValueError:
                raise RuleViolation
        self.hand[player] = hand

        if self.hand[0] and self.hand[1]:
            # start the second phase
            for i in range(2):
                self.callback(i, 'phase_two', {})
            self.phase = 2
        else:
            self.callback(player, 'wait', {})

    def on_discard(self, player, tile):
        if self.phase != 2:
            raise RuleViolation
        if self.player_turn != player:
            raise RuleViolation
        if tile not in self.tiles[player]:
            raise RuleViolation
        self.tiles[player].remove(tile)


class GameTestCase(unittest.TestCase):
    def setUp(self):
        from collections import deque

        global DEBUG
        DEBUG = True # suppress randomization

        self.messages = deque()

        self.g = Game(callback=self.callback)

    def assertMessage(self, player, msg_type, msg={}):
        our_m = self.messages.popleft()
        self.assertEqual(our_m, (player, msg_type, msg))

    def callback(self, player, msg_type, msg):
        self.messages.append((player, msg_type, msg))

    def test_init(self):
        # the game has just been created
        self.assertMessage(0, 'phase_one',
                           {'nicks': ['P1', 'P2'],
                            'tiles': TILES[:34],
                            'dora': 'M4',
                            'you': 0,
                            'east': 0})
        self.assertMessage(1, 'phase_one',
                           {'nicks': ['P1', 'P2'],
                            'tiles': TILES[34:34*2],
                            'dora': 'M4',
                            'you': 1,
                            'east': 0})

    def test_game_scenario(self):
        self.test_init()

        self.g.on_hand(0, 'M1 M2 M3 M4 M5 M6 M7 M8 M9 P1 P2 P3 P4'.split())
        self.assertMessage(0, 'wait')
        self.g.on_hand(1, 'M1 M2 M3 M4 M5 M6 M7 M8 M9 P1 P2 P3 P4'.split())
        self.assertMessage(0, 'phase_two')
        self.assertMessage(1, 'phase_two')

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
