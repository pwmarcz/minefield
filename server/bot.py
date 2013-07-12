from collections import Counter
import unittest
import itertools

import rules

class Multiset(Counter):
    def __le__(self, rhs):
        return all(v <= rhs[k] for k, v in self.iteritems())

def full_groups(tiles):
    for i, tile in enumerate(tiles):
        if tile[0] != 'X' and tile[1] <= '7':
            if all(t in tiles for t in rules.expand_chi(tile)):
                yield ('chi', tile)
        if tiles[i:].count(tile) == 3:
            yield ('pon', tile)

def find_pairs(tiles):
    for tile in set(tiles):
        if tiles.count(tile) >= 2:
            yield (tile, tile)

def find_chi_waits(tiles):
    for tile in tiles:
        if tile[0] != 'X' and tile[1] <= '7':
            chi = tuple(rules.expand_chi(tile))
            if chi[1] in tiles:
                yield (tile, chi[1])
            if chi[2] in tiles:
                yield (tile, chi[2])

def expand_groups(groups):
    return sum((rules.expand_group(group) for group in groups), [])

def choose_groups_helper(all_groups, count, tiles_multiset):
    if count == 0:
        yield [], all_groups
    else:
        smaller_groups = choose_groups_helper(all_groups, count-1, tiles_multiset)
        for groups, available_groups in smaller_groups:
            for i, group in enumerate(available_groups):
                new_groups = groups + [group]
                if Multiset(expand_groups(new_groups)) <= tiles_multiset:
                    yield new_groups, available_groups[i+1:]

def choose_groups(all_groups, count, tiles):
    return (g for g, _ in choose_groups_helper(all_groups, count, Multiset(tiles)))

def tenpai_a(all_groups, pairs, chi_waits, tiles_multiset):
    # a) 3 groups + pair + pair/chii wait
    for groups in choose_groups(all_groups, 3, tiles_multiset):
        new_multiset = Multiset(tiles_multiset)
        groups_tiles = expand_groups(groups)
        new_multiset.subtract(groups_tiles)
        for i, pair in enumerate(pairs):
            if Multiset(pair) <= new_multiset:
                for pair2 in pairs[i+1:]:
                    if Multiset(pair + pair2) <= new_multiset:
                        yield sorted(groups_tiles + list(pair + pair2))
                for chi_wait in chi_waits:
                    if Multiset(pair + chi_wait) <= new_multiset:
                        yield sorted(groups_tiles + list(pair + chi_wait))

def tenpai_b(all_groups, tiles_multiset):
    # b) 4 groups + any
    for groups in choose_groups(all_groups, 4, tiles_multiset):
        new_multiset = Multiset(tiles_multiset)
        groups_tiles = expand_groups(groups)
        new_multiset.subtract(groups_tiles)
        for tile in set(new_multiset.elements()):
            yield sorted(groups_tiles + [tile])

def tenpai_c(all_pairs, tiles):
    # c) 6 pairs + any other
    for pairs in itertools.combinations(all_pairs, 6):
        pairs_tiles = sum(pairs, ())
        for tile in set(tiles) - set(pairs_tiles):
            yield sorted(pairs_tiles + (tile,))

def tenpai_d(tiles):
    # d) kokushi tenpai
    yaochu_tiles = set(tiles) & rules.YAOCHU
    yaochu_count = len(yaochu_tiles)
    if yaochu_count < len(rules.YAOCHU) - 1:
        return
    elif yaochu_count == len(rules.YAOCHU) - 1:
        missing_tile = list(rules.YAOCHU - yaochu_tiles)[0]
        for kokushi_tile in rules.YAOCHU:
            if tiles.count(kokushi_tile) > 1:
                hand = sorted(rules.YAOCHU)
                hand.remove(missing_tile)
                yield sorted([kokushi_tile] + hand)
    else: # 13-way kokushi
        yield sorted(rules.YAOCHU)

# TODO minimalize number of unique tiles in discards
# TODO maximalize fan (because uradora)
def tenpai_value(counts_values):
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

def count_waits(wait_values, tiles, options = {}):
    for wait, pts in wait_values:
        count = 4 - tiles.count(wait) - int(wait == options.get('dora_ind'))
        yield count, pts

def eval_tenpais(tenpais, tiles, options={}):
    for tenpai in tenpais:
        wait_values = list(rules.eval_waits(list(tenpai), options=options))
        if any(pts > 0 for wait, pts in wait_values):
            counts_values = list(count_waits(wait_values, tiles, options=options))
            yield tenpai_value(counts_values), tenpai

def choose_tenpai(tiles, options={}):
    #print ','.join(sorted(tiles))
    #print 'dora_ind:', options.get('dora_ind')
    all_groups = list(full_groups(tiles))
    pairs = list(find_pairs(tiles))
    chi_waits = list(find_chi_waits(tiles))
    tiles_multiset = Multiset(tiles)

    tenpais = itertools.chain(
        tenpai_a(all_groups, pairs, chi_waits, tiles_multiset),
        tenpai_b(all_groups, tiles_multiset),
        tenpai_c(pairs, tiles),
        tenpai_d(tiles),
    )

    # iterate over all tenpais and find the best
    tenpais = set(tuple(t) for t in tenpais)
    value, tenpai = max(eval_tenpais(tenpais, tiles, options=options))
    return tenpai

def print_tenpai(tenpai, options={}):
    for wait in rules.waits(list(tenpai)):
        hand = rules.best_hand(sorted(tenpai + (wait,)), wait, options=options)
        print hand.limit(), ','.join(hand.yaku),
        if hand.dora():
            print 'dora:', hand.dora(),
        print wait

class HelperFunctionsTestCase(unittest.TestCase):
    def test_full_groups(self):
        self.assertEqual(set(full_groups('M2 M2 M2 M3 M4 M5 M7 S1 S1 S2 S3'.split())),
                         {('pon', 'M2'), ('chi', 'M2'), ('chi', 'M3'), ('chi', 'S1')})

    def test_pairs(self):
        self.assertEqual(set(find_pairs('M2 M2 M2 M3 M4 S1 S1 S2 S3'.split())),
                         {('M2', 'M2'), ('S1', 'S1')})

    def test_expand_groups(self):
        self.assertEqual(expand_groups([('pon', 'M2'), ('chi', 'M2'), ('chi', 'S1')]),
                         'M2 M2 M2 M2 M3 M4 S1 S2 S3'.split())

    def test_choose_groups(self):
        groups = [('pon', 'M2'), ('chi', 'M2'), ('chi', 'S1')]
        tiles = 'M2 M2 M2 M3 M4 M5 M7 S1 S1 S2 S3'.split()
        chosen = list(choose_groups(groups, 2, tiles))
        self.assertEqual(chosen, [[('pon', 'M2'), ('chi', 'S1')], [('chi', 'M2'), ('chi', 'S1')]])

class TenpaiChoiceTestCase(unittest.TestCase):
    def test_choose_tenpai(self):
        self.assertEqual(
            list(choose_tenpai(
                'M2 M3 M5 M6 M7 M7 M8 M9 M9 '
                'P1 P3 P5 P6 P6 P7 P8 '
                'S1 S2 S2 S3 S4 S6 S7 S7 S8 '
                'X1 X2 X2 X4 X4 X4 X5 X6 X7'.split(),
                options={'dora_ind': 'X4', 'fanpai_winds': ['X3']})),
            'M2 M3 M6 M7 M8 P6 P7 P8 S6 S7 S8 X4 X4'.split())
        self.assertEqual(
            list(choose_tenpai(
                'M2 M3 M4 M4 M5 M8 '
                'P1 P2 P2 P3 P5 P6 P7 P7 P7 P8 P8 P9 P9'
                'S1 S2 S3 S4 S5 S6 S8 S9 S9 '
                'X1 X2 X2 X5 X5 X5'.split(),
                options={'dora_ind': 'X4', 'fanpai_winds': ['X1']})),
            'P1 P2 P3 P7 P7 P8 P8 P9 X2 X2 X5 X5 X5'.split())

if __name__ == '__main__':
    unittest.main()
