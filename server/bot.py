from collections import Counter
import unittest

import rules

class Multiset(Counter):
    def __le__(self, rhs):
        return all(v <= rhs[k] for k, v in self.iteritems())

def full_groups(tiles):
    for i, tile in enumerate(tiles):
        if tile[0] != 'X':
            n = int(tile[1])
            if n <= 7 and all(t in tiles for t in rules.expand_chi(tile)):
                yield ('chi', tile)
        if tiles[i:].count(tile) == 3:
            yield ('pon', tile)

def pairs(tiles):
    for tile in set(tiles):
        if tiles.count(tile) >= 2:
            yield tile

def expand_groups(groups):
    return sum((rules.expand_group(group) for group in groups), [])

def choose_groups(all_groups, count, tiles):
    if count == 0:
        yield [], all_groups
    else:
        smaller_groups = choose_groups(all_groups, count-1, tiles)
        for groups, available_groups in smaller_groups:
            for i, group in enumerate(available_groups):
                new_groups = groups + [group]
                if Multiset(expand_groups(new_groups)) <= Multiset(tiles):
                    yield new_groups, available_groups[i+1:]

def choose_tenpai(tiles, options={}):
    groups = full_groups(tiles)
    pairs = pairs(tiles)
    
    # a) 3 groups + pair + pair/chii wait
    choose_groups(groups, 3, tiles)
    # b) 4 groups + any
    # c) 6 pairs + any other
    # d) kokushi tenpai
    
    # iterate over all tenpais and find the best

class HelperFunctionsTestCase(unittest.TestCase):
    def test_full_groups(self):
        self.assertEqual(set(full_groups('M2 M2 M2 M3 M4 M5 M7 S1 S1 S2 S3'.split())),
                         {('pon', 'M2'), ('chi', 'M2'), ('chi', 'M3'), ('chi', 'S1')})

    def test_pairs(self):
        self.assertEqual(set(pairs('M2 M2 M2 M3 M4 S1 S1 S2 S3'.split())),
                         {'M2', 'S1'})

    def test_expand_groups(self):
        self.assertEqual(expand_groups([('pon', 'M2'), ('chi', 'M2'), ('chi', 'S1')]),
                         'M2 M2 M2 M2 M3 M4 S1 S2 S3'.split())

    def test_choose_groups(self):
        groups = [('pon', 'M2'), ('chi', 'M2'), ('chi', 'S1')]
        tiles = 'M2 M2 M2 M3 M4 M5 M7 S1 S1 S2 S3'.split()
        chosen = list(g for g, _ in choose_groups(groups, 2, tiles))
        self.assertEqual(chosen, [[('pon', 'M2'), ('chi', 'S1')], [('chi', 'M2'), ('chi', 'S1')]])

if __name__ == '__main__':
    unittest.main()
