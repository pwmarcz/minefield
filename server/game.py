import random
import unittest

import rules

DEBUG = False

TILES = rules.ALL_TILES * 4
PLAYER_TILES = 34
DISCARDS = 17

SEAT_WINDS = ('X1', 'X3')

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
        self.uradora_ind = all_tiles[n*2+1]

        # Players' hands (None until they've chosen them)
        self.hand = [None, None]

        self.waits = [None, None]

        self.discards = [[], []]

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
                           'dora_ind': self.dora_ind,
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
            self.callback(player, 'wait_for_phase_two', {})

    def options(self, player, uradora=False):
        return {
            'fanpai_winds': [SEAT_WINDS[player^self.east]],
            'dora_ind': self.dora_ind,
            'uradora_ind': self.uradora_ind if uradora else None,
            'hotei': all(len(self.discards[i]) == DISCARDS for i in xrange(2)),
            'ippatsu': len(self.discards[1-player]) == 1,
        }

    def furiten(self, player):
        tiles = set(self.discards[player] + self.discards[1-player][:-1])
        return any(wait in tiles for wait in self.waits[player])

    def on_discard(self, player, tile):
        if self.phase != 2:
            raise RuleViolation('on_discard: wrong phase')
        if self.player_turn != player:
            raise RuleViolation('on_discard: not your turn')
        if tile not in self.tiles[player]:
            raise RuleViolation('on_discard: tile not found in choices')

        self.tiles[player].remove(tile)
        self.discards[player].append(tile)

        for i in xrange(2):
            self.callback(i, 'discarded',
                          {'player': player,
                           'tile': tile})

        # ron
        if tile in self.waits[1-player] and not self.furiten(1-player):
            if self.check_ron(player, tile):
                return

        # draw
        if len(self.discards[0]) == len(self.discards[1]) == DISCARDS:
            self.finished = True
            for i in xrange(2):
                self.callback(i, 'draw', {})
        # normal turn
        else:
            self.callback(self.player_turn, 'your_move', {})

    def check_ron(self, player, tile):
        full_hand = sorted(self.hand[1-player] + [tile])
        hand = rules.best_hand(full_hand, tile, options=self.options(1-player))
        # Check mangan limit
        if hand.limit() == 0:
            return False

        # Compute again, with uradora
        hand = rules.best_hand(full_hand, tile,
                               options=self.options(1-player, uradora=True))
        self.finished = True
        for i in xrange(2):
            self.callback(i, 'ron', {
                'player': 1-player,
                'hand': full_hand,
                'yaku': hand.yaku,
                'yakuman': hand.yakuman,
                'dora': hand.dora(),
                'points': rules.BASE_POINTS[hand.limit()],
                'uradora_ind': self.uradora_ind,
            })

        return True


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
                            'dora_ind': 'M1',
                            'you': 0,
                            'east': 0})
        self.assertMessage(1, 'phase_one',
                           {'nicks': ['P1', 'P2'],
                            'tiles': TILES[n:n*2],
                            'dora_ind': 'M1',
                            'you': 1,
                            'east': 0})

    def start_game(self, s1, s2):
        self.test_init()
        self.g.on_hand(0, s1.split())
        self.assertMessage(0, 'wait_for_phase_two')
        self.g.on_hand(1, s2.split())
        self.assertMessageBoth('phase_two')

    def test_draw_scenario(self):
        self.start_game('M1 M2 M3 M4 M5 M6 M7 M8 M9 P1 P2 P3 P4',
                        'M1 M2 M3 M4 M5 M6 M7 M8 M9 P1 P2 P3 P4')

        for i in xrange(DISCARDS):
            for j in xrange(2):
                self.assertMessage(j, 'your_move')
                # Just discard the first choice
                t = self.g.tiles[j][0]
                self.discard(j, t)
        self.assertMessageBoth('draw')

    def discard(self, player, tile):
        self.g.on_discard(player, tile)
        self.assertMessageBoth('discarded', {'player': player,
                                             'tile': tile})

    def test_win(self):
        # P0: 13-sided kokushi
        # P1: riichi ippatsu dora - 3 fan, not enough for mangan
        self.start_game('M1 M9 P1 P9 S1 S9 X1 X2 X3 X4 X5 X6 X7',
                        'M1 M2 M3 M4 M5 M6 P7 P8 P9 S1 S2 S3 S4')
        self.assertMessage(0, 'your_move')

        # P1's winning tile - there should be no 'ron' message
        self.discard(0, 'S4')
        self.assertMessage(1, 'your_move')

        # Rising Sun!
        self.discard(1, 'P1')
        self.assertMessageBoth('ron', {
            'player': 0,
            'yaku': ['kokushi'],
            'yakuman': True,
            'hand': 'M1 M9 P1 P1 P9 S1 S9 X1 X2 X3 X4 X5 X6 X7'.split(),
            'points': 4000,
            'dora': 0,
            'uradora_ind': 'M2'
        })


    def test_furiten(self):
        # P0: junk
        # P1: riichi tanyao sanshoku on S5, but only riichi tanyao on S8
        self.start_game('M2 M9 P1 P9 S1 S9 X1 X2 X3 X4 X5 X6 X7',
                        'M6 M7 M8 P6 P7 P8 S2 S3 S4 S5 S6 S7 S8')
        self.assertMessage(0, 'your_move')

        # P1's winning tile - there should be no 'ron' message
        # riichi ippatsu tanyao - no mangan
        self.discard(0, 'S8')
        self.assertMessage(1, 'your_move')

        self.discard(1, 'P1')
        self.assertMessage(0, 'your_move')

        # P1 would win now, but she's in furiten
        self.discard(0, 'S5')
        self.assertMessage(1, 'your_move')


    def test_short_hand(self):
        self.assertRaises(RuleViolation,
                          lambda: self.g.on_hand(0, 'M1 M2 M3'.split()))

    def test_tiles_outside_initial(self):
        self.assertRaises(RuleViolation,
                          lambda: self.g.on_hand(0, ['M1']*13))

if __name__ == '__main__':
    unittest.main()
