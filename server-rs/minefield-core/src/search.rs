use std::convert::TryInto;

use crate::hand::{Group, Hand};
use crate::tiles::{Tile, NUM_TILES};

pub struct Search {
    wait: Tile,
    set: [isize; NUM_TILES],
    num_remaining: isize,
    groups: Vec<Group>,
}

impl Search {
    pub fn from_tiles(tiles: &[Tile; 14], wait: Tile) -> Self {
        let mut set = [0; NUM_TILES];
        for &tile in tiles {
            set[tile as usize] += 1;
        }
        Search {
            wait,
            set,
            num_remaining: tiles.len() as isize,
            groups: vec![],
        }
    }

    fn push_group(&mut self, group: Group) {
        match group {
            Group::Pon(t) => {
                self.add(t, -3);
            }
            Group::Chi(t) => {
                self.add(t, -1);
                self.add(t.next(), -1);
                self.add(t.next().next(), -1);
            }
        }
        self.groups.push(group);
    }

    fn pop_group(&mut self) {
        let group = self.groups.pop().unwrap();
        match group {
            Group::Pon(t) => {
                self.add(t, 3);
            }
            Group::Chi(t) => {
                self.add(t, 1);
                self.add(t.next(), 1);
                self.add(t.next().next(), 1);
            }
        }
    }

    fn get(&self, tile: Tile) -> isize {
        self.set[tile as usize]
    }

    fn add(&mut self, tile: Tile, n: isize) {
        let i = tile as usize;
        assert!(self.set[i] + n >= 0);
        assert!(self.num_remaining + n >= 0);
        self.set[i] += n;
        self.num_remaining += n;
    }

    fn find_groups(&self) -> Vec<Group> {
        let mut groups: Vec<Group> = vec![];
        for tile in Tile::all() {
            let n = self.get(tile);
            if n >= 3 {
                groups.push(Group::Pon(tile));
            }
            if n >= 1 && tile.has_next() && tile.next().has_next() {
                let tile2 = tile.next();
                let tile3 = tile.next().next();
                if self.get(tile2) >= 1 && self.get(tile3) >= 1 {
                    groups.push(Group::Chi(tile))
                }
            }
        }
        groups.sort();
        groups
    }

    fn gather(&self, pair: Tile, results: &mut Vec<Hand>) {
        let groups = self.groups.as_slice().try_into().expect("wrong size");

        if pair == self.wait {
            results.push(Hand::Normal(pair, groups, self.wait, None));
        }

        for i in 0..4 {
            let group_ok = match groups[i] {
                Group::Pon(tile) => self.wait == tile,
                Group::Chi(tile) => {
                    self.wait == tile || self.wait == tile.next() || self.wait == tile.next().next()
                }
            };
            if group_ok && (i == 0 || groups[i] != groups[i - 1]) {
                results.push(Hand::Normal(pair, groups, self.wait, Some(i as u8)));
            }
        }
    }

    fn backtrack(&mut self, results: &mut Vec<Hand>) {
        if self.num_remaining == 2 {
            for tile in Tile::all() {
                if self.get(tile) == 2 {
                    self.gather(tile, results);
                }
            }
        }
        for group in self.find_groups() {
            if let Some(&last_group) = self.groups.last() {
                if last_group > group {
                    continue;
                }
            }
            self.push_group(group);
            self.backtrack(results);
            self.pop_group();
        }
    }

    fn find_kokushi(&self) -> Option<Hand> {
        let mut double = None;
        for tile in Tile::all() {
            if tile.is_yaochu() {
                match self.get(tile) {
                    0 => return None,
                    1 => (),
                    2 if double == None => double = Some(tile),
                    _ => return None,
                }
            } else if self.get(tile) > 0 {
                return None;
            }
        }
        match double {
            Some(tile) => Some(Hand::Kokushi(tile, self.wait)),
            None => None,
        }
    }

    fn find_pairs(&self) -> Option<Hand> {
        let mut pairs = vec![];
        for tile in Tile::all() {
            match self.get(tile) {
                0 => (),
                2 => pairs.push(tile),
                _ => return None,
            }
        }
        let pairs = pairs.as_slice().try_into().expect("wrong size");
        Some(Hand::Pairs(pairs, self.wait))
    }

    pub fn find_all(&mut self) -> Vec<Hand> {
        let mut results: Vec<Hand> = vec![];
        if let Some(hand) = self.find_kokushi() {
            results.push(hand);
            return results;
        }

        self.backtrack(&mut results);
        if let Some(hand) = self.find_pairs() {
            results.push(hand);
            return results;
        }

        results
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::hand::Group::*;
    use crate::hand::Hand;
    use crate::tiles::Tile::*;

    #[test]
    fn test_find_all() {
        let mut search = Search::from_tiles(
            &[M1, M1, M2, M2, M3, M3, X1, X1, X1, X2, X2, X2, P5, P5],
            M1,
        );
        let results = search.find_all();
        assert_eq!(
            results,
            vec![Hand::Normal(
                P5,
                [Pon(X1), Pon(X2), Chi(M1), Chi(M1)],
                M1,
                Some(2)
            ),]
        );
    }

    #[test]
    fn test_pairs() {
        let mut search = Search::from_tiles(
            &[M1, M1, M3, M3, M5, M5, M7, M7, M9, M9, S1, S1, S2, S2],
            M1,
        );
        let results = search.find_all();
        assert_eq!(results, vec![Hand::Pairs([M1, M3, M5, M7, M9, S1, S2], M1)]);
    }

    #[test]
    fn test_ryanpeiko() {
        let mut search = Search::from_tiles(
            &[M1, M1, M2, M2, M3, M3, P1, P1, P2, P2, P3, P3, X1, X1],
            M1,
        );
        let results = search.find_all();
        assert_eq!(
            results,
            vec![
                Hand::Normal(X1, [Chi(M1), Chi(M1), Chi(P1), Chi(P1)], M1, Some(0)),
                Hand::Pairs([M1, M2, M3, P1, P2, P3, X1], M1),
            ]
        );
    }

    #[test]
    fn test_kokushi() {
        let mut hand = Search::from_tiles(
            &[M1, M9, P1, P9, S1, S9, S9, X1, X2, X3, X4, X5, X6, X7],
            M1,
        );
        let results = hand.find_all();
        assert_eq!(results, vec![Hand::Kokushi(S9, M1)]);
    }
}
