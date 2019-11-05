use num_enum::TryFromPrimitive;
use std::convert::TryFrom;

#[derive(Debug, Copy, Clone, PartialEq, PartialOrd, Eq, Ord, TryFromPrimitive)]
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

pub struct TileIterator(u8);

impl Iterator for TileIterator {
    type Item = Tile;

    fn next(&mut self) -> Option<Tile> {
        if self.0 < NUM_TILES as u8 {
            let tile = Tile::try_from(self.0).unwrap();
            self.0 += 1;
            Some(tile)
        } else {
            None
        }
    }
}

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
        self.raw_next()
    }

    fn raw_next(self) -> Tile {
        Tile::try_from(self as u8 + 1).unwrap()
    }

    pub fn next_wrap(self) -> Tile {
        match self {
            M9 => M1,
            P9 => P1,
            S9 => S1,
            X4 => X1,
            X7 => X5,
            _ => self.raw_next(),
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
