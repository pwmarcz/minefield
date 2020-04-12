import itertools
import unittest
import functools

# The groups are of the form:
# ('pon', tile)
# ('chi', tile)
# ('pair', tile)
# The pair is always first.

# We take advantage of the lexicographical ordering of tiles.

ALL_TILES = ['%s%s' % (suit, no) for suit in 'MPSX' for no in range(1,10)
    if suit != 'X' or no <= 7]

TERMINALS = {suit + no for suit in 'MPS' for no in '19'}

WINDS = {'X' + no for no in '1234'}

DRAGONS = {'X' + no for no in '567'}

HONORS = WINDS | DRAGONS

YAOCHU = TERMINALS | HONORS

BASE_POINTS = [0, 8000, 12000, 16000, 24000, 32000, 64000]

YAKU = {
    'pinfu': 1,
    'iipeiko': 1,
    'ryanpeiko': 3,
    'tanyao': 1,
    'wind': 1,
    'haku': 1,
    'hatsu': 1,
    'chun': 1,
    'sanshokudojun': 2,
    'sanshokudoko': 2,
    'itsuu': 2,
    'chitoitsu': 2,
    'chanta': 2,
    'junchan': 3,
    'honroto': 2,
    'honitsu': 3,
    'chinitsu': 6,
    'toitoi': 2,
    'sananko': 2,
    'shosangen': 2,
    'daisangen': 13,
    'kokushi': 13,
    'suuanko': 13,
    'suushi': 13,
    'chinroto': 13,
    'tsuuiiso': 13,
    'ryuuiiso': 13,
    'chuuren': 13,
    'ippatsu': 1,
    'hotei': 1,
}

# decorator
def regular(yaku_f):
    @functools.wraps(yaku_f)
    def fun(self):
        if self.type != 'regular':
            return False
        return yaku_f(self)
    return fun

def find_pair(tiles):
    for i in range(len(tiles)-1):
        if tiles[i] == tiles[i+1]:
            # don't count false duplicates
            if i+2 < len(tiles) and tiles[i+1] == tiles[i+2]:
                continue
            yield (('pair', tiles[i]), tiles[:i]+tiles[i+2:])

def begin_pon(tiles):
    if len(tiles) >= 3 and tiles[0] == tiles[1] == tiles[2]:
        return (('pon', tiles[0]), tiles[3:])

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
        return (('chi', t1), tiles)

def decompose_regular(tiles):
    def all_groups(tiles):
        if tiles == []:
            yield []
        else:
            beginning_groups = (g for g in (begin_pon(tiles), begin_chi(tiles))
                if g is not None)
            for group, new_tiles in beginning_groups:
                for groups in all_groups(new_tiles):
                    yield [group] + groups

    for pair, new_tiles in find_pair(tiles):
        for groups in all_groups(new_tiles):
            yield [pair] + groups

def is_all_pairs(tiles):
    return len(set(tiles)) == len(tiles) // 2 and all(
        tiles[i] == tiles[i+1] for i in range(0, len(tiles), 2))

def is_kokushi(tiles):
    return set(tiles) == YAOCHU

def is_terminal(tile):
    return tile in TERMINALS

def is_honor(tile):
    return tile in HONORS

def is_junchan_group(g):
    type, tile = g
    if type in ['pon', 'pair']:
        return is_terminal(tile)
    else:
        return tile[0] in 'MPS' and tile[1] in '17'

def is_chanta_group(g):
    type, tile = g
    return is_junchan_group(g) or is_honor(tile)

def is_open_wait(tile, group):
    if group[0] != 'chi':
        return False
    chi_tile = group[1]
    if tile[0] != chi_tile[0]:
        return False
    n = int(tile[1])
    cn = int(chi_tile[1])
    return (n == cn or n == cn+2) and (n, cn) not in ((3, 1), (7, 7))

def expand_group(group):
    type, tile = group
    if type == 'pair':
        return [tile, tile]
    if type == 'pon':
        return [tile] * 3
    if type == 'chi':
        return list(expand_chi(tile))

def expand_chi(chi_tile):
    for i in range(3):
        yield chi_tile[0] + str(int(chi_tile[1]) + i)

def group_contains(group, tile):
    if group[0] != 'chi':
        return tile == group[1]
    else:
        return tile in expand_chi(group[1])

def suits_of_tiles(tiles):
    return set(t[0] for t in tiles)

def dora_for_ind(dora_ind):
    if dora_ind[0] == 'X':
        dora_tile = 'X' + '-2341675'[int(dora_ind[1])]
    else:
        dora_tile = dora_ind[0] + str(int(dora_ind[1]) % 9 + 1)
    return dora_tile

class Hand(object):
    RECOGNIZED_YAKU = ['pinfu',
                       'iipeiko',
                       'ryanpeiko',
                       'tanyao',
                       'wind',
                       'haku',
                       'hatsu',
                       'chun',
                       'sanshokudojun',
                       'sanshokudoko',
                       'itsuu',
                       'chitoitsu',
                       'chanta',
                       'junchan',
                       'honroto',
                       'honitsu',
                       'chinitsu',
                       'toitoi',
                       'sananko',
                       'shosangen',
                       'daisangen',
                       'kokushi',
                       'suuanko',
                       'suushi',
                       'chinroto',
                       'tsuuiiso',
                       'ryuuiiso',
                       'chuuren',
                       'ippatsu',
                       'hotei']

    YAKUMAN = ['daisangen',
               'kokushi',
               'suuanko',
               'suushi',
               'chinroto',
               'tsuuiiso',
               'ryuuiiso',
               'chuuren']

    def __init__(self, tiles, wait, type, groups=None, wait_group=None,
                 options={}):
        self.tiles = tiles
        self.wait = wait
        self.wait_group = wait_group
        self.type = type
        self.groups = groups
        self.options = options
        self.suits = suits_of_tiles(tiles)
        if groups:
            self.group_types = [type for type, tile in groups[1:]]
            self.pair_tile = groups[0][1]
        self.tiles_set = set(tiles)
        self.yaku = self.all_yaku()

    def yakupai(self):
        return DRAGONS | set(self.options.get('fanpai_winds', []))

    @regular
    def yaku_pinfu(self):
        if self.pair_tile in self.yakupai():
            return False
        if set(self.group_types) != {'chi'}:
            return False
        return is_open_wait(self.wait, self.wait_group)

    @regular
    def yaku_ryanpeiko(self):
        g = self.groups
        if g[1] == g[2] and g[3] == g[4]:
            return True

    @regular
    def yaku_iipeiko(self):
        if self.yaku_ryanpeiko():
            return False
        return len(set(self.groups)) < 5

    def yaku_tanyao(self):
        return not any(is_terminal(t) or is_honor(t) for t in self.tiles)

    @regular
    def yaku_wind(self):
        if 'fanpai_winds' not in self.options:
            return False
        fanpai_winds = self.options['fanpai_winds']
        return any(type == 'pon' and tile in fanpai_winds
                   for type, tile in self.groups)

    @regular
    def yaku_haku(self):
        return any(type == 'pon' and tile == 'X5' for type, tile in self.groups)

    @regular
    def yaku_hatsu(self):
        return any(type == 'pon' and tile == 'X6' for type, tile in self.groups)

    @regular
    def yaku_chun(self):
        return any(type == 'pon' and tile == 'X7' for type, tile in self.groups)

    @regular
    def yaku_sanshokudojun(self):
        return any(
            all(('chi', suit + n) in self.groups for suit in 'MPS')
            for n in '1234567')

    @regular
    def yaku_sanshokudoko(self):
        return any(
            all(('pon', suit + n) in self.groups for suit in 'MPS')
            for n in '123456789')

    @regular
    def yaku_itsuu(self):
        return any(
            all(('chi', suit + n) in self.groups for n in '147')
            for suit in 'MPS')

    def yaku_chitoitsu(self):
        return self.type == 'pairs'

    @regular
    def yaku_junchan(self):
        return (all(is_junchan_group(g) for g in self.groups) and
                'chi' in self.group_types)

    @regular
    def yaku_chanta(self):
        if self.yaku_junchan():
            return False
        return (all(is_chanta_group(g) for g in self.groups) and
                'chi' in self.group_types)

    def yaku_honroto(self):
        return self.tiles_set <= YAOCHU

    def yaku_honitsu(self):
        return len(self.suits) == 2 and 'X' in self.suits

    def yaku_chinitsu(self):
        return len(self.suits) == 1 and 'X' not in self.suits

    @regular
    def yaku_toitoi(self):
        return set(self.group_types) == {'pon'}

    @regular
    def yaku_sananko(self):
        wait_for_pon = self.wait_group[0] == 'pon'
        return self.group_types.count('pon') - int(wait_for_pon) == 3

    @regular
    def yaku_shosangen(self):
        return set(DRAGONS) <= self.tiles_set and self.pair_tile in DRAGONS

    @regular
    def yaku_daisangen(self):
        return set(DRAGONS) <= self.tiles_set and self.pair_tile not in DRAGONS

    def yaku_kokushi(self):
        return self.type == 'kokushi'

    @regular
    def yaku_suuanko(self):
        return self.wait == self.pair_tile and self.yaku_toitoi()

    @regular
    def yaku_suushi(self):
        return set(WINDS) <= self.tiles_set

    def yaku_chinroto(self):
        return self.tiles_set <= TERMINALS

    def yaku_tsuuiiso(self):
        return self.tiles_set <= HONORS

    def yaku_ryuuiiso(self):
        return self.tiles_set <= {'S' + no for no in '23468'} | {'X6'}

    def yaku_chuuren(self):
        if not self.yaku_chinitsu():
            return False
        t = self.tiles
        return (len(set(t)) == 9 and
            len(set(t[:3])) == 1 and len(set(t[-3:])) == 1)

    def yaku_ippatsu(self):
        return self.options.get('ippatsu', False)

    def yaku_hotei(self):
        return self.options.get('hotei', False)

    def count_tile(self, tile):
        return self.tiles.count(tile)

    def dora(self):
        dora = 0
        dora_ind = self.options.get('dora_ind')
        uradora_ind = self.options.get('uradora_ind')
        for ind in (dora_ind, uradora_ind):
            if ind is not None:
                dora += self.count_tile(dora_for_ind(ind))
        return dora

    def all_yaku(self):
        result = []
        for name in self.RECOGNIZED_YAKU:
            m = getattr(self, 'yaku_' + name)
            if m():
                result.append(name)
        if set(result) & set(self.YAKUMAN):
            result = [name for name in result if name in self.YAKUMAN]
            self.yakuman = True
        else:
            self.yakuman = False
        return result

    def fan(self):
        if self.yakuman:
            return sum(YAKU[yaku] for yaku in self.yaku)
        fan = sum(YAKU[yaku] for yaku in self.yaku) + self.dora()
        return fan if fan < 13 else 13

    def fu(self):
        yaku = self.yaku
        if 'pinfu' in yaku:
            return 30
        if self.type == 'pairs':
            return 25
        if 'kokushi' in yaku:
            return 30
        fu = 30
        if self.pair_tile in self.yakupai():
            fu += 2
        open_wait = is_open_wait(self.wait, self.wait_group)
        if self.wait_group[0] != 'pon' and not open_wait:
            fu += 2
        for type, tile in self.groups:
            if type == 'pon':
                p = 2
                if tile in YAOCHU:
                    p *= 2
                if (type, tile) != self.wait_group:
                    p *= 2
                fu += p
        return (fu + 9) // 10 * 10

    def limit(self):
        return limit(self.fan(), self.fu())

def all_hands(tiles, wait, options={}):
    for groups in decompose_regular(tiles):
        for group in groups:
            if group_contains(group, wait):
                yield Hand(
                    tiles, wait, 'regular', groups=groups, options=options,
                    wait_group=group)
    if is_all_pairs(tiles):
        yield Hand(tiles, wait, 'pairs', options=options)
    if is_kokushi(tiles):
        yield Hand(tiles, wait, 'kokushi', options=options)

def waits(tiles, options={}):
    for tile in ALL_TILES:
        hands = list(all_hands(sorted(tiles + [tile]), tile, options=options))
        if hands and tiles.count(tile) < 4:
            yield tile

# more optimized
def eval_waits(tiles, options={}):
    for tile in ALL_TILES:
        hands = list(all_hands(sorted(tiles + [tile]), tile, options=options))
        if hands and tiles.count(tile) < 4:
            fan, fu = max((hand.fan(), hand.fu()) for hand in hands)
            lim = limit(fan, fu)
            yield tile, BASE_POINTS[lim]

def best_hand(tiles, wait, options={}):
    hands = all_hands(tiles, wait, options=options)
    return max(((hand.fan(), hand.fu(), hand) for hand in hands), key=lambda k: (k[0], k[1]))[2]

def eval_hand(tiles, wait, options={}):
    hand = best_hand(tiles, wait, options=options)
    return hand.yaku, hand.dora(), hand.limit()

def limit(fan, fu):
    if fan < 13:
        fan += 1 # riichi

    if fan < 3 or (fan == 3 and fu < 60) or (fan == 4 and fu < 30):
        return 0
    if fan <= 5: # mangan
        return 1
    if fan <= 7: # haneman
        return 2
    if fan <= 10: # baiman
        return 3
    if fan <= 12: # sanbaiman
        return 4
    if fan == 13: # yakuman
        return 5
    return 6 # double yakuman

class RulesTestCase(unittest.TestCase):
    def test_find_pair(self):
        self.assertEquals(list(find_pair(['M1','M2','M3'])), [])
        self.assertEquals(list(find_pair(['M1','M1','M3'])),
                          [(('pair', 'M1'), ['M3'])])

    def test_find_pair_dupes(self):
        self.assertEquals(len(list(find_pair(['M1', 'M1', 'M1']))), 1)
        self.assertEquals(len(list(find_pair(['M1', 'M1', 'M1', 'M1']))), 1)

    def test_begin_pon(self):
        self.assertEqual(begin_pon('M1 M1 M1'.split()), (('pon', 'M1'), []))
        self.assertEqual(begin_pon('M1 M1 M2'.split()), None)

    def test_begin_chi(self):
        self.assertEqual(begin_chi('M1 M2 M3 M4'.split()), (('chi', 'M1'), ['M4']))
        self.assertEqual(begin_chi('M1 M2 M4'.split()), None)

    def test_decompose(self):
        tiles = 'M1 M1 M2 M2 M3 M3 M4 M4'.split()
        self.assertEqual(list(decompose_regular(tiles)),
                         [[('pair', 'M1'), ('chi', 'M2'), ('chi', 'M2')],
                          [('pair', 'M4'), ('chi', 'M1'), ('chi', 'M1')]])

    def test_is_all_pairs(self):
        self.assertTrue(is_all_pairs('M1 M1 M2 M2'.split()))
        self.assertFalse(is_all_pairs('M1 M1 M2 M3'.split()))

    def test_dora_for_ind(self):
        self.assertEquals(dora_for_ind('M2'), 'M3')
        self.assertEquals(dora_for_ind('P9'), 'P1')
        self.assertEquals(dora_for_ind('X1'), 'X2')
        self.assertEquals(dora_for_ind('X4'), 'X1')
        self.assertEquals(dora_for_ind('X6'), 'X7')
        self.assertEquals(dora_for_ind('X7'), 'X5')

    def test_best_hand_sort(self):
        tiles = 'M7 M7 M8 M8 M9 M9 S1 S2 S3 X1 X1 X3 X3 X3'.split()
        wait  = 'M7'
        best_hand(tiles, wait, {'fanpai_winds': ['X1'], 'dora_ind': 'X4'})

class BaseHandTestCase(unittest.TestCase):
    def assertYaku(self, tiles_str, wait, yaku_sets):
        tiles = tiles_str.split()
        result = set()
        # In the tests, we assume that East (X1) is the only fanpai wind.
        for hand in all_hands(tiles, wait, {'fanpai_winds': ['X1']}):
            result.add(frozenset(hand.yaku))
        self.assertEqual(result, set(frozenset(y) for y in yaku_sets))

    def assertFu(self, tiles_str, wait, fu_values):
        tiles = tiles_str.split()
        result = set(hand.fu()
            for hand in all_hands(tiles, wait, {'fanpai_winds': ['X1']}))
        self.assertEqual(result, set(fu_values))

class YakuTestCase(BaseHandTestCase):
    def test_yaku(self):
        self.assertYaku('M2 M2 M3 M3 M4 M4 P2 P3 P4 P7 P7 P7 S2 S2', 'M3',
                        [['iipeiko', 'tanyao']])
        self.assertYaku('M1 M2 M3 M4 M5 M6 M6 M7 M8 P2 P2 P2 X1 X1', 'M1',
                        [[]])
        self.assertYaku('M1 M2 M3 M4 M5 M6 M6 M7 M8 P2 P3 P4 X2 X2', 'M3',
                        [[]]) # fake pinfu
        self.assertYaku('M1 M1 M1 M1 M2 M2 M2 M2 M3 M3 M3 M3 M9 M9', 'M1',
                        [['pinfu', 'ryanpeiko', 'junchan', 'chinitsu'],
                         ['sananko', 'chinitsu'],
                         ['chinitsu']])
        self.assertYaku('M1 M2 M2 M3 M3 M3 M3 M4 M4 M4 M5 M5 M6 M6', 'M1',
                        [['pinfu', 'iipeiko', 'chinitsu']])
        self.assertYaku('M1 M1 M2 M2 M3 M3 M7 M7 M8 M8 M9 M9 X5 X5', 'M3',
                        [['chanta', 'honitsu', 'ryanpeiko'],
                         ['chitoitsu', 'honitsu']])

    def test_pinfu(self):
        self.assertYaku('M1 M1 M1 M2 M3 M4 M5 M6 M6 M7 M8 P2 P3 P4', 'M1',
                        [['pinfu'], []])
        self.assertYaku('M1 M2 M3 M4 M5 M6 M6 M7 M8 P2 P3 P4 X1 X1', 'M1',
                        [[]])
        self.assertYaku('M1 M2 M3 M4 M5 M6 M6 M7 M8 P2 P3 P4 X2 X2', 'M3',
                        [[]])

    def test_honitsu(self):
        self.assertYaku('M2 M3 M4 M5 M6 M7 M8 M8 M8 M9 M9 X5 X5 X5', 'X5',
                        [['haku', 'honitsu']])
        self.assertYaku('X1 X1 M2 M3 M4 M5 M6 M7 M8 M8 M8 M9 M9 M9', 'X1',
                        [['honitsu']])

    def test_tanyao(self):
        self.assertYaku('M2 M3 M4 M5 M6 M7 P3 P3 P3 P5 P6 P7 S4 S4', 'M7',
                        [['tanyao']])
        self.assertYaku('M2 M3 M4 M5 M6 M7 P2 P3 P4 P5 P6 P7 P8 P8', 'P7',
                        [['pinfu', 'tanyao']])

    def test_fanpai(self):
        self.assertYaku('M2 M3 M4 M5 M6 M7 P2 P3 P4 P8 P8 X5 X5 X5', 'X5',
                        [['haku']])
        self.assertYaku('M2 M3 M4 M5 M6 M7 P2 P3 P4 X6 X6 X6 X7 X7', 'M2',
                        [['hatsu']])
        self.assertYaku('M2 M3 M4 M5 M6 M7 P2 P3 P4 X1 X1 X1 X7 X7', 'M2',
                        [['wind']])

    def test_sanshoku(self):
        self.assertYaku('M4 M5 M6 P4 P4 P4 P5 P6 S4 S5 S6 S7 S8 S9', 'M5',
                        [['sanshokudojun']])
        self.assertYaku('M1 M1 M1 M2 M3 M4 P1 P1 P1 S1 S1 S1 S2 S2', 'S1',
                        [['sanshokudoko']])

    def test_itsuu(self):
        self.assertYaku('M1 M2 M3 S1 S2 S3 S4 S5 S6 S7 S8 S9 P5 P5', 'S5',
                        [['itsuu']])

    def test_toitoi(self):
        self.assertYaku('M1 M1 M1 P2 P2 P2 S3 S3 S3 S5 S5 S9 S9 S9', 'S3',
                        [['toitoi', 'sananko']])
        self.assertYaku('M1 M1 M1 P2 P2 P2 S3 S3 S3 S5 S5 S7 S8 S9', 'S3',
                        [[]])

    def test_honroto(self):
        self.assertYaku('M1 M1 M1 M9 M9 M9 P9 P9 P9 S1 S1 X3 X3 X3', 'X3',
                        [['toitoi', 'sananko', 'honroto']])
        self.assertYaku('M1 M1 M9 M9 P1 P1 P9 P9 S1 S1 X3 X3 X5 X5', 'X3',
                        [['chitoitsu', 'honroto']])

    def test_shousangen(self):
        self.assertYaku('P1 P2 P3 S5 S5 S5 X5 X5 X5 X6 X6 X6 X7 X7', 'S5',
                        [['haku', 'hatsu', 'shosangen']])
        self.assertYaku('P1 P2 P3 S9 S9 S9 X5 X5 X5 X6 X6 X7 X7 X7', 'P1',
                        [['haku', 'chun', 'chanta', 'sananko', 'shosangen']])

    def test_daisangen(self):
        self.assertYaku('P1 P2 P3 S5 S5 X5 X5 X5 X6 X6 X6 X7 X7 X7', 'S5',
                        [['daisangen']])

    def test_kokushi(self):
        self.assertYaku('M1 M9 P1 P9 S1 S9 S9 X1 X2 X3 X4 X5 X6 X7', 'S1',
                        [['kokushi']])
        self.assertYaku('M1 M9 P1 P9 S1 S9 X1 X2 X3 X4 X5 X5 X6 X7', 'X5',
                        [['kokushi']])

    def test_suuanko(self):
        self.assertYaku('M2 M2 M2 P3 P3 P3 P7 P7 P7 S5 S5 X7 X7 X7', 'S5',
                        [['suuanko']])

    def test_suushi(self):
        self.assertYaku('M3 M4 M5 X1 X1 X1 X2 X2 X3 X3 X3 X4 X4 X4', 'X2',
                        [['suushi']])
        self.assertYaku('M3 M3 X1 X1 X1 X2 X2 X2 X3 X3 X3 X4 X4 X4', 'X2',
                        [['suushi']])

    def test_chinroto(self):
        self.assertYaku('M1 M1 M1 P1 P1 P1 P9 P9 P9 S1 S1 S1 S9 S9', 'P1',
                        [['chinroto']])

    def test_tsuuiiso(self):
        self.assertYaku('X1 X1 X1 X3 X3 X4 X4 X4 X5 X5 X5 X7 X7 X7', 'X1',
                        [['tsuuiiso']])
        self.assertYaku('X1 X1 X2 X2 X3 X3 X4 X4 X5 X5 X6 X6 X7 X7', 'X1',
                        [['tsuuiiso']])

    def test_ryuuiiso(self):
        self.assertYaku('S2 S2 S3 S3 S4 S4 S6 S6 S6 S8 S8 X6 X6 X6', 'X6',
                        [['ryuuiiso']])
        self.assertYaku('S2 S2 S2 S3 S3 S3 S4 S4 S4 S6 S6 S6 S8 S8', 'S6',
                        [['ryuuiiso']])

    def test_chuuren(self):
        self.assertYaku('S1 S1 S1 S2 S3 S3 S4 S5 S6 S7 S8 S9 S9 S9', 'S5',
                        [['chuuren']])
        self.assertYaku('M1 M1 M1 M2 M3 M4 M4 M5 M6 M7 M8 M9 M9 M9', 'M4',
                        [['chuuren']])

class FuTestCase(BaseHandTestCase):
    def test_waits(self):
        # pinfu
        self.assertFu('M1 M2 M3 P1 P2 P3 S1 S2 S3 S4 S5 S6 S7 S7', 'S6', [30])
        # not a pinfu: middle wait (2)
        self.assertFu('M1 M2 M3 P1 P2 P3 S1 S2 S3 S4 S5 S6 S7 S7', 'S5', [40])
        # edge wait (2)
        self.assertFu('M1 M2 M3 P1 P2 P3 S1 S2 S3 S4 S5 S6 S7 S7', 'M3', [40])
        # 30 + 4 + 4 + 2(open) + dual pon wait (0)
        self.assertFu('M2 M2 M2 M4 M4 M4 M6 M6 M6 M7 M8 M9 P1 P1', 'M2', [40])

    def test_pons(self):
        # 30 + 8 + 4
        self.assertFu('M1 M1 M1 M2 M2 M2 M5 M6 M7 M7 M8 M9 P1 P1', 'M9', [50])
        # same with non-player wind, player wind, dragon
        self.assertFu('M2 M2 M2 M5 M6 M7 M7 M8 M9 P1 P1 X2 X2 X2', 'M9', [50])
        self.assertFu('M2 M2 M2 M5 M6 M7 M7 M8 M9 P1 P1 X1 X1 X1', 'M9', [50])
        self.assertFu('M2 M2 M2 M5 M6 M7 M7 M8 M9 P1 P1 X7 X7 X7', 'M9', [50])
        # 30 + 4(open) + 4
        self.assertFu('M1 M1 M1 M2 M2 M2 M5 M6 M7 M7 M8 M9 P1 P1', 'M1', [40])

    def test_head(self):
        # non-terminal
        self.assertFu('M1 M2 M3 P1 P2 P3 S1 S2 S3 S4 S5 S6 S8 S8', 'S6', [30])
        # terminal
        self.assertFu('M1 M2 M3 P1 P2 P3 S1 S2 S3 S4 S5 S6 S9 S9', 'S6', [30])
        # non-player wind
        self.assertFu('M1 M2 M3 P1 P2 P3 S1 S2 S3 S4 S5 S6 X2 X2', 'S6', [30])
        # player wind
        self.assertFu('M1 M2 M3 P1 P2 P3 S1 S2 S3 S4 S5 S6 X1 X1', 'S6', [40])
        # dragon
        self.assertFu('M1 M2 M3 P1 P2 P3 S1 S2 S3 S4 S5 S6 X6 X6', 'S6', [40])

    def test_chitoitsu(self):
        self.assertFu('M1 M1 P3 P3 P4 P4 P5 P5 P7 P7 X1 X1 X3 X3', 'X3', [25])
        # yakuman, but we still want to compute fu
        self.assertFu('X1 X1 X2 X2 X3 X3 X4 X4 X5 X5 X6 X6 X7 X7', 'X3', [25])

    def test_multiple(self):
        # all chi (30+2=32) or three pons (30+8+4+4+2=48)
        self.assertFu('M1 M1 M1 M2 M2 M2 M3 M3 M3 P1 P2 P3 P4 P4', 'P4', [40, 50])
        # chitoitsu, ryan peiko pinfu, or ryan peiko closed wait
        self.assertFu('P2 P2 P3 P3 P4 P4 P5 P5 P6 P6 P7 P7 P8 P8', 'P7', [25, 30, 40])
        # pon wait (30+2+8=40) or edge wait (30+4+8+2=44)
        self.assertFu('P1 P2 P3 P3 P3 P3 S2 S2 S5 S6 S7 S9 S9 S9', 'P3', [40, 50])


if __name__ == '__main__':
    unittest.main()
