#[derive(Debug, Copy, Clone, PartialEq, PartialOrd, Eq, Ord, Hash)]
#[repr(u8)]
pub enum Tile {
    // man
    M1 = 0,
    M2,
    M3,
    M4,
    M5,
    M6,
    M7,
    M8,
    M9,
    // pin
    P1,
    P2,
    P3,
    P4,
    P5,
    P6,
    P7,
    P8,
    P9,
    // sou
    S1,
    S2,
    S3,
    S4,
    S5,
    S6,
    S7,
    S8,
    S9,
    // winds
    X1,
    X2,
    X3,
    X4,
    // dragons
    X5,
    X6,
    X7,
}

use Tile::*;

#[derive(Debug, Copy, Clone, PartialEq, PartialOrd, Eq, Ord)]
pub enum Suit {
    Honor = 1,
    Man = 2,
    Pin = 4,
    Sou = 8,
}

pub const NUM_TILES: usize = X7 as usize + 1;

impl Tile {
    pub fn all() -> TileIterator {
        TileIterator(0)
    }

    pub fn is_terminal(self) -> bool {
        self == M1 || self == M9 || self == P1 || self == P9 || self == S1 || self == S9
    }

    pub fn is_honor(self) -> bool {
        self >= X1
    }

    pub fn is_yaochu(self) -> bool {
        self.is_terminal() || self.is_honor()
    }

    pub fn is_green(self) -> bool {
        self == S2 || self == S3 || self == S4 || self == S6 || self == S8 || self == X6
    }

    pub fn is_yakuhai(self, player_wind: Tile) -> bool {
        self == X5 || self == X6 || self == X7 || self == player_wind
    }

    pub fn suit(self) -> Suit {
        if M1 <= self && self <= M9 {
            Suit::Man
        } else if P1 <= self && self <= P9 {
            Suit::Pin
        } else if S1 <= self && self <= S9 {
            Suit::Sou
        } else {
            Suit::Honor
        }
    }

    pub fn has_next(self) -> bool {
        (M1 <= self && self <= M8) || (P1 <= self && self <= P8) || (S1 <= self && self <= S8)
    }

    pub fn next(self) -> Tile {
        assert!(self.has_next());
        self.raw_next().unwrap()
    }

    fn from(n: u8) -> Option<Tile> {
        if n < NUM_TILES as u8 {
            unsafe { Some(std::mem::transmute(n)) }
        } else {
            None
        }
    }

    fn raw_next(self) -> Option<Tile> {
        Tile::from(self as u8 + 1)
    }

    pub fn next_wrap(self) -> Tile {
        match self {
            M9 => M1,
            P9 => P1,
            S9 => S1,
            X4 => X1,
            X7 => X5,
            _ => self.raw_next().unwrap(),
        }
    }

    pub fn sanshoku(t1: Tile, t2: Tile, t3: Tile) -> bool {
        M1 <= t1 && t1 <= M9 && (t1 as u8) + 9 == (t2 as u8) && (t1 as u8) + 18 == (t3 as u8)
    }

    pub fn itsuu(t1: Tile, t2: Tile, t3: Tile) -> bool {
        (t1 == M1 || t1 == P1 || t1 == S1)
            && (t1 as u8) + 3 == (t2 as u8)
            && (t1 as u8) + 6 == (t3 as u8)
    }
}

pub struct TileIterator(u8);

impl Iterator for TileIterator {
    type Item = Tile;

    fn next(&mut self) -> Option<Tile> {
        let result = Tile::from(self.0);
        if result.is_some() {
            self.0 += 1;
        }
        result
    }
}

pub struct TileSet([isize; NUM_TILES]);

impl TileSet {
    pub fn empty() -> Self {
        TileSet([0; NUM_TILES])
    }

    pub fn make(tiles: &[Tile]) -> Self {
        let mut ts = Self::empty();
        for tile in tiles.iter() {
            ts.add(*tile, 1);
        }
        ts
    }

    pub fn get(&self, tile: Tile) -> isize {
        self.0[tile as usize]
    }

    pub fn add(&mut self, tile: Tile, n: isize) {
        let m = self.0[tile as usize] + n;
        assert!(m >= 0);
        self.0[tile as usize] = m;
    }

    pub fn add_all(&mut self, tiles: &[Tile], n: isize) {
        for tile in tiles.iter() {
            self.add(*tile, n);
        }
    }

    pub fn distinct(&self) -> TileSetIterator {
        TileSetIterator {
            tiles: self,
            current: 0,
        }
    }

    pub fn contains(&self, other: &Self) -> bool {
        other.distinct().all(|t| self.get(t) >= other.get(t))
    }
}

pub struct TileSetIterator<'a> {
    tiles: &'a TileSet,
    current: u8,
}

impl<'a> Iterator for TileSetIterator<'a> {
    type Item = Tile;

    fn next(&mut self) -> Option<Tile> {
        while self.current < NUM_TILES as u8 {
            let tile = Tile::from(self.current).unwrap();
            if self.tiles.get(tile) > 0 {
                self.current += 1;
                return Some(tile);
            }
            self.current += 1;
        }
        None
    }
}
