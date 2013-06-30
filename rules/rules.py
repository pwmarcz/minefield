import itertools
import unittest

# The groups are of the form:
# ('pon', tile)
# ('chi', tile)
# ('pair', tile)
# The pair is always first.

# We take advantage of the lexicographical ordering of tiles.

def find_pair(tiles):
    for i in range(len(tiles)-1):
        if tiles[i] == tiles[i+1]:
            # don't count false duplicates
            if i+2 < len(tiles) and tiles[i+1] == tiles[i+2]:
                continue
            yield (('pair', tiles[i]), tiles[:i]+tiles[i+2:])

def begin_pon(tiles):
    if len(tiles) >= 3 and tiles[0] == tiles[1] == tiles[2]:
        yield (('pon', tiles[0]), tiles[3:])

def begin_chi(tiles):
    t1 = tiles[0]
    suit = t1[0]
    n = int(t1[1])
    if suit == 'X' or n >= 8:
        # honor, or number tile >= 8
        return
    t2 = suit+str(n+1)
    t3 = suit+str(n+2)
    if t2 in tiles and t3 in tiles:
        tiles = list(tiles)
        tiles.remove(t1)
        tiles.remove(t2)
        tiles.remove(t3)
        yield (('chi', t1), tiles)

def decompose_regular(tiles):
    def all_groups(tiles):
        if tiles == []:
            yield []
        else:
            beginning_groups = itertools.chain(
                begin_pon(tiles),
                begin_chi(tiles))
            for group, new_tiles in beginning_groups:
                for groups in all_groups(new_tiles):
                    yield [group] + groups

    for pair, new_tiles in find_pair(tiles):
        for groups in all_groups(new_tiles):
            yield [pair] + groups

def is_all_pairs(tiles):
    return all(tiles[i] == tiles[i+1] for i in range(0, len(tiles), 2))

def is_terminal(tile):
    return tile[0] in 'MPS' and tile[1] in '19'

def is_honor(tile):
    return tile[0] == 'X'

class Hand(object):
    RECOGNIZED_YAKU = ['pinfu',
                       'iipeiko',
                       'tanyao']

    def __init__(self, tiles, wait, type, groups=None):
        self.tiles = tiles
        self.wait = wait
        self.type = type
        self.groups = groups

    def yaku_pinfu(self):
        return False # TBI

    def yaku_iipeiko(self):
        if self.type != 'regular':
            return False
        for i in range(1,len(self.groups)-1):
            if self.groups[i][0] == 'chi' and self.groups[i] == self.groups[i+1]:
                return True
        return False

    def yaku_tanyao(self):
        return not any(is_terminal(t) or is_honor(t) for t in self.tiles)

    def all_yaku(self):
        result = []
        for name in self.RECOGNIZED_YAKU:
            m = getattr(self, 'yaku_' + name)
            if m():
                result.append(name)
        return result

def all_hands(tiles, wait):
    for groups in decompose_regular(tiles):
        yield Hand(tiles, wait, 'regular', groups)
    if is_all_pairs(tiles):
        yield Hand(tiles, wait, 'pairs')
    #if is_kokushi(tiles): # to be implemented

class RulesTestCase(unittest.TestCase):
    def test_find_pair(self):
        self.assertEquals(list(find_pair(['M1','M2','M3'])), [])
        self.assertEquals(list(find_pair(['M1','M1','M3'])),
                          [(('pair', 'M1'), ['M3'])])

    def test_find_pair_dupes(self):
        self.assertEquals(len(list(find_pair(['M1', 'M1', 'M1']))), 1)
        self.assertEquals(len(list(find_pair(['M1', 'M1', 'M1', 'M1']))), 1)

    def test_begin_pon(self):
        self.assertEqual(list(begin_pon('M1 M1 M1'.split())), [(('pon', 'M1'), [])])
        self.assertEqual(list(begin_pon('M1 M1 M2'.split())), [])

    def test_begin_chi(self):
        self.assertEqual(list(begin_chi('M1 M2 M3 M4'.split())), [(('chi', 'M1'), ['M4'])])
        self.assertEqual(list(begin_chi('M1 M2 M4'.split())), [])

    def test_decompose(self):
        tiles = 'M1 M1 M2 M2 M3 M3 M4 M4'.split()
        self.assertEqual(list(decompose_regular(tiles)),
                         [[('pair', 'M1'), ('chi', 'M2'), ('chi', 'M2')],
                          [('pair', 'M4'), ('chi', 'M1'), ('chi', 'M1')]])

    def test_is_all_pairs(self):
        self.assertTrue(is_all_pairs('M1 M1 M2 M2'.split()))
        self.assertFalse(is_all_pairs('M1 M1 M2 M3'.split()))

class HandTestCase(unittest.TestCase):
    def assertYaku(self, tiles_str, wait, yaku_sets):
        tiles = tiles_str.split()
        result = []
        for hand in all_hands(tiles, wait):
            result.append(hand.all_yaku())
        self.assertEqual(result, yaku_sets)

    def test_yaku(self):
        self.assertYaku('M2 M2 M3 M3 M4 M4 P2 P3 P4 P7 P7 P7 S2 S2', 'M3',
                        [['iipeiko', 'tanyao']])
        self.assertYaku('M1 M2 M3 M4 M5 M6 M6 M7 M8 P2 P2 P2 X1 X1', 'M1',
                        [[]])

if __name__ == '__main__':
    unittest.main()
