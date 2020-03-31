use crate::tiles::{Suit, Tile};

#[derive(Debug, Copy, Clone, PartialEq, PartialOrd, Eq, Ord)]
pub enum Group {
    Pon(Tile),
    Chi(Tile),
}

use Group::*;

impl Group {
    pub fn is_chi(self) -> bool {
        match self {
            Chi(_) => true,
            _ => false,
        }
    }

    pub fn is_pon(self) -> bool {
        match self {
            Pon(_) => true,
            _ => false,
        }
    }

    pub fn has_yaochu(self) -> bool {
        use Tile::*;
        match self {
            Pon(t) => t.is_yaochu(),
            Chi(t) => !((M2 <= t && t <= M6) || (P2 <= t && t <= P6) || (S2 <= t && t <= S6)),
        }
    }

    pub fn has_terminal(self) -> bool {
        use Tile::*;
        match self {
            Pon(t) => t.is_terminal(),
            Chi(t) => !((M2 <= t && t <= M6) || (P2 <= t && t <= P6) || (S2 <= t && t <= S6)),
        }
    }

    pub fn has_honor(self) -> bool {
        match self {
            Pon(t) => t.is_honor(),
            Chi(_) => false,
        }
    }

    pub fn suit(self) -> Suit {
        match self {
            Pon(t) => t.suit(),
            Chi(t) => t.suit(),
        }
    }

    pub fn add_to(self, tiles: &mut Vec<Tile>) {
        match self {
            Pon(t) => {
                tiles.push(t);
                tiles.push(t);
                tiles.push(t);
            }
            Chi(t) => {
                tiles.push(t);
                tiles.push(t.next());
                tiles.push(t.next().next());
            }
        }
    }

    pub fn is_open_wait(self, wait: Tile) -> bool {
        use Tile::*;
        match self {
            Pon(_) => false,
            Chi(t) => {
                (wait == t && t != M7 && t != P7 && t != S7)
                    || (wait == t.next().next() && t != M1 && t != P1 && t != S1)
            }
        }
    }
}

#[derive(Debug, PartialEq, PartialOrd, Eq, Ord)]
pub enum Hand {
    // pair, groups, wait, group_num
    Normal(Tile, [Group; 4], Tile, Option<u8>),
    // pair, groups, wait
    Pairs([Tile; 7], Tile),
    // double, wait
    Kokushi(Tile, Tile),
}

impl Hand {
    pub fn suits(&self) -> u8 {
        let mut result = 0;
        match self {
            Hand::Normal(pair, groups, _, _) => {
                result |= pair.suit() as u8;
                for group in groups.iter() {
                    result |= group.suit() as u8;
                }
            }
            Hand::Pairs(pairs, _) => {
                for pair in pairs.iter() {
                    result |= pair.suit() as u8;
                }
            }
            Hand::Kokushi(_, _) => {
                result = Suit::Man as u8 | Suit::Pin as u8 | Suit::Sou as u8 | Suit::Honor as u8;
            }
        }
        result
    }

    pub fn tiles(&self) -> Vec<Tile> {
        let mut result: Vec<Tile> = vec![];
        match self {
            Hand::Normal(pair, groups, _, _) => {
                // Gather all tiles
                result.push(*pair);
                result.push(*pair);
                for g in groups.iter() {
                    g.add_to(&mut result);
                }
            }
            Hand::Pairs(pairs, _) => {
                for pair in pairs.iter() {
                    result.push(*pair);
                    result.push(*pair);
                }
            }
            Hand::Kokushi(double, _) => {
                for t in Tile::all() {
                    if t.is_yaochu() {
                        result.push(t);
                    }
                }
                result.push(*double);
            }
        }
        result.sort();
        result
    }
}
