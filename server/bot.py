from collections import Counter
import unittest
import itertools

import gevent

import rules

class Multiset(Counter):
    def __le__(self, rhs):
        return all(v <= rhs[k] for k, v in self.iteritems())

    def set(self):
        return {k for k, v in self.iteritems() if v > 0}

def expand_groups(groups):
    return sum((rules.expand_group(group) for group in groups), [])

class Bot(object):
    def __init__(self, tiles=None, options={}):
        super(Bot, self).__init__()
        self.options = options
        self.tiles = None
        self.tiles_multiset = None
        self.all_groups = None
        self.pairs = None
        self.chi_waits = None
        if tiles:
            self.set_tiles(tiles)
        self.discard_options = None
        self.tenpai = None
        self.waits = None
        self.safe_tiles = set()

    def set_tiles(self, tiles):
        self.tiles = tiles
        self.tiles_multiset = Multiset(tiles)
        self.all_groups = tuple(self.full_groups())
        self.pairs = list(self.find_pairs())
        self.chi_waits = list(self.find_chi_waits())
        self.discard_options = None

    def full_groups(self):
        for i, tile in enumerate(self.tiles):
            if tile[0] != 'X' and tile[1] <= '7':
                if all(t in self.tiles for t in rules.expand_chi(tile)):
                    yield ('chi', tile)
            if self.tiles[i:].count(tile) == 3:
                yield ('pon', tile)

    def find_pairs(self):
        for tile in set(self.tiles):
            if self.tiles.count(tile) >= 2:
                yield (tile, tile)

    def find_chi_waits(self):
        for tile in self.tiles:
            if tile[0] != 'X' and tile[1] <= '7':
                chi = tuple(rules.expand_chi(tile))
                if chi[1] in self.tiles:
                    yield (tile, chi[1])
                if chi[2] in self.tiles:
                    yield (tile, chi[2])

    def choose_groups_helper(self, count):
        if count == 0:
            yield (), self.all_groups
        else:
            smaller_groups = self.choose_groups_helper(count-1)
            for groups, available_groups in smaller_groups:
                for i, group in enumerate(available_groups):
                    new_groups = groups + (group,)
                    if Multiset(expand_groups(new_groups)) <= self.tiles_multiset:
                        yield new_groups, available_groups[i+1:]

    def truncated_multiset(self, tiles):
        new_multiset = Multiset(self.tiles_multiset)
        new_multiset.subtract(tiles)
        return new_multiset

    def choose_groups(self, count):
        return set(g for g, _ in self.choose_groups_helper(count))

    def tenpai_3groups(self):
        for groups in self.choose_groups(3):
            groups_tiles = expand_groups(groups)
            new_multiset= self.truncated_multiset(groups_tiles)
            for i, pair in enumerate(self.pairs):
                if Multiset(pair) <= new_multiset:
                    for pair2 in self.pairs[i+1:]:
                        if Multiset(pair + pair2) <= new_multiset:
                            yield sorted(groups_tiles + list(pair + pair2))
                    for chi_wait in self.chi_waits:
                        if Multiset(pair + chi_wait) <= new_multiset:
                            yield sorted(groups_tiles + list(pair + chi_wait))

    def tenpai_4groups(self):
        # b) 4 groups + any
        for groups in self.choose_groups(4):
            groups_tiles = expand_groups(groups)
            new_multiset= self.truncated_multiset(groups_tiles)
            for tile in set(new_multiset.elements()):
                yield sorted(groups_tiles + [tile])

    def tenpai_6pairs(self):
        for pairs in itertools.combinations(self.pairs, 6):
            pairs_tiles = sum(pairs, ())
            for tile in set(self.tiles) - set(pairs_tiles):
                yield sorted(pairs_tiles + (tile,))

    def tenpai_kokushi(self):
        yaochu_tiles = set(self.tiles) & rules.YAOCHU
        yaochu_count = len(yaochu_tiles)
        if yaochu_count < len(rules.YAOCHU) - 1:
            return
        elif yaochu_count == len(rules.YAOCHU) - 1:
            missing_tile = list(rules.YAOCHU - yaochu_tiles)[0]
            for kokushi_tile in rules.YAOCHU:
                if self.tiles.count(kokushi_tile) > 1:
                    hand = sorted(rules.YAOCHU)
                    hand.remove(missing_tile)
                    yield sorted([kokushi_tile] + hand)
        else: # 13-way kokushi
            yield sorted(rules.YAOCHU)

    # softTODO minimalize number of unique tiles in discards
    # softTODO maximalize fan (because uradora)
    def tenpai_value(self, counts_values):
        # heuristics - maybe not very good
        wait_count = sum(cnt for cnt, pts in counts_values)
        good_waits = [(cnt, pts) for cnt, pts in counts_values if pts > 0]
        good_count = sum(cnt for cnt, pts in good_waits)
        if good_count == 0:
            return 0
        prob_none = 1. # probability that no waits are in 17 random tiles
        for i in xrange(wait_count):
            prob_none *= (84 - i)/101. # 101 = 136 - 34 - 1; 84 = 101 - 17
        prob_some = 1 - prob_none
        # expected points in case of ron
        expected_win = 1. * sum(cnt*pts for cnt, pts in good_waits) / wait_count
        return prob_some * expected_win * good_count/wait_count

    def count_waits(self, wait_values):
        for wait, pts in wait_values:
            count = 4 - self.tiles.count(wait)
            count -= int(wait == self.options.get('dora_ind'))
            yield count, pts

    def eval_tenpai(self, tenpai):
        wait_values = list(
            rules.eval_waits(list(tenpai), options=self.options))
        if any(pts > 0 for wait, pts in wait_values):
            counts_values = list(self.count_waits(wait_values))
            return self.tenpai_value(counts_values)

    def choose_tenpai(self, cooperative=False):
        #print ','.join(sorted(tiles))
        #print 'dora_ind:', options.get('dora_ind')
        tenpais = set()
        evaluated_tenpais = list()
        for t in itertools.chain(
            self.tenpai_3groups(),
            self.tenpai_4groups(),
            self.tenpai_6pairs(),
            self.tenpai_kokushi(),
        ):
            if cooperative:
                gevent.sleep(0)
            t = tuple(t)
            if t in tenpais:
                continue
            tenpais.add(t)
            val = self.eval_tenpai(t)
            evaluated_tenpais.append((val, t))
        value, tenpai = max(evaluated_tenpais)
        tenpai = list(tenpai)
        return tenpai

    def use_tenpai(self, tenpai):
        self.tenpai = tenpai
        self.waits = list(rules.waits(tenpai))
        self.discard_options = self.truncated_multiset(tenpai)
        return tenpai

    def print_tenpai(self, tenpai):
        for wait in rules.waits(tenpai):
            hand = rules.best_hand(
                sorted(tenpai + (wait,)), wait, options=self.options)
            print hand.limit(), ','.join(hand.yaku),
            if hand.dora():
                print 'dora:', hand.dora(),
            print wait

    def opponent_discard(self, tile):
        self.safe_tiles.add(tile)
        return tile in self.waits

    def use_discard(self, to_discard):
        self.safe_tiles.add(to_discard)
        self.discard_options.subtract([to_discard])
        return to_discard

    def discard(self):
        available_safe = self.discard_options.set() & self.safe_tiles
        if available_safe:
            to_discard = list(available_safe)[0]
        else:
            for tile, count in self.discard_options.most_common():
                if tile not in self.waits:
                    to_discard = tile
                    break
            else: # furiten ahoy
                to_discard = self.discard_options.most_common(1)[0][0]
        return to_discard


class HelperFunctionsTestCase(unittest.TestCase):
    def test_full_groups(self):
        bot = Bot(tiles='M2 M2 M2 M3 M4 M5 M7 S1 S1 S2 S3'.split())
        self.assertEqual(set(bot.all_groups),
                         {('pon', 'M2'), ('chi', 'M2'), ('chi', 'M3'), ('chi', 'S1')})

    def test_pairs(self):
        bot = Bot(tiles='M2 M2 M2 M3 M4 S1 S1 S2 S3'.split())
        self.assertEqual(set(bot.pairs), {('M2', 'M2'), ('S1', 'S1')})

    def test_expand_groups(self):
        self.assertEqual(expand_groups([('pon', 'M2'), ('chi', 'M2'), ('chi', 'S1')]),
                         'M2 M2 M2 M2 M3 M4 S1 S2 S3'.split())

    def test_choose_groups(self):
        groups = [('pon', 'M2'), ('chi', 'M2'), ('chi', 'S1')]
        bot = Bot(tiles='M2 M2 M2 M3 M4 M6 M7 S1 S1 S2 S3'.split())
        chosen = set(tuple(groups) for groups in bot.choose_groups(2))
        self.assertEqual(chosen,
            {(('pon', 'M2'), ('chi', 'S1')), (('chi', 'M2'), ('chi', 'S1'))})

@unittest.skip('too slow!')
class TenpaiChoiceTestCase(unittest.TestCase):
    def asserTenpai(self, tenpai):
        wait_values = rules.eval_waits(tenpai)
        self.assertTrue(any(pts > 0 for wait, pts in wait_values))

    def test_choose_tenpai(self):
        bot = Bot(
            tiles='M2 M3 M5 M6 M7 M7 M8 M9 M9 '
                'P1 P3 P5 P6 P6 P7 P8 '
                'S1 S2 S2 S3 S4 S6 S7 S7 S8 '
                'X1 X2 X2 X4 X4 X4 X5 X6 X7'.split(),
            options={'dora_ind': 'X4', 'fanpai_winds': ['X3']})
        self.asserTenpai(bot.choose_tenpai())
        bot = Bot(
            tiles='M2 M3 M4 M4 M5 M8 '
                'P1 P2 P2 P3 P5 P6 P7 P7 P7 P8 P8 P9 P9'
                'S1 S2 S3 S4 S5 S6 S8 S9 S9 '
                'X1 X2 X2 X5 X5 X5'.split(),
            options={'dora_ind': 'X4', 'fanpai_winds': ['X1']})
        self.asserTenpai(bot.choose_tenpai())
        bot = Bot(
            tiles='M2 M3 M3 M4 M5 M6 M6 M7 M8 M9 M9 '
                'P1 P2 P2 P5 P6 P9 '
                'S3 S5 S7 S7 S8 S8 S9 '
                'X3 X3 X4 X5 X5 X6 X7 X7 X7'.split(),
            options={'dora_ind': 'M3', 'fanpai_winds': ['X3']})
        tenpai = bot.choose_tenpai()
        self.asserTenpai(tenpai)
        self.assertEqual(len(list(rules.waits(tenpai))), 3)
        # very slow!
        #bot = Bot(
        #    tiles=rules.ALL_TILES,
        #    options={'dora_ind': 'M1', 'fanpai_winds': ['X1']})
        #self.assertEqual(bot.choose_tenpai(), sorted(rules.YAOCHU))

if __name__ == '__main__':
    unittest.main()
