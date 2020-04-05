use std::convert::TryInto;

use crate::backtrack::{Backtrack, BacktrackStrategy};
use crate::hand::{Group, Hand};
use crate::tiles::{Tile, TileSet};

struct NormalSearch(Tile);

impl BacktrackStrategy for NormalSearch {
    type Item = Hand;

    fn generate(&self, bt: &Backtrack) -> Vec<Vec<Tile>> {
        // println!("{:?} {:?}", bt.stack, bt.remaining);

        if bt.remaining > 2 {
            bt.filter(bt.find_groups())
        } else {
            bt.find_pairs()
        }
    }
    fn check(&self, bt: &Backtrack) -> Vec<Hand> {
        // println!("{:?}", bt.stack);

        assert!(bt.stack.len() == 5);
        let groups = [
            Group::from_tiles(&bt.stack[0]).unwrap(),
            Group::from_tiles(&bt.stack[1]).unwrap(),
            Group::from_tiles(&bt.stack[2]).unwrap(),
            Group::from_tiles(&bt.stack[3]).unwrap(),
        ];
        let pair = bt.stack[4][0];
        let wait = self.0;
        let mut results = vec![];

        if pair == wait {
            results.push(Hand::Normal(pair, groups, wait, None));
        }

        for i in 0..4 {
            if (i == 0 || bt.stack[i] != bt.stack[i - 1]) && bt.stack[i].contains(&wait) {
                results.push(Hand::Normal(pair, groups, wait, Some(groups[i])));
            }
        }
        results
    }
}

pub fn search(tiles: &[Tile], wait: Tile) -> Vec<Hand> {
    let mut bt = Backtrack::from_tiles(tiles, 14);
    let mut result = bt.run(&NormalSearch(wait));

    if let Some(hand) = find_pairs(&bt.tiles, wait) {
        result.push(hand);
    }
    if let Some(hand) = find_kokushi(&bt.tiles, wait) {
        result.push(hand);
    }
    result
}

pub fn find_all_waits(tiles: &[Tile]) -> Vec<Tile> {
    let mut result = vec![];
    let mut tiles = tiles.to_vec();

    for wait in Tile::all() {
        tiles.push(wait);
        let hands = search(&tiles, wait);
        if !hands.is_empty() {
            result.push(wait);
        }
        tiles.pop();
    }

    result
}

fn find_pairs(tiles: &TileSet, wait: Tile) -> Option<Hand> {
    let mut pairs = vec![];
    for tile in tiles.distinct() {
        match tiles.get(tile) {
            0 => (),
            2 => pairs.push(tile),
            _ => return None,
        }
    }
    let pairs = pairs.as_slice().try_into().expect("wrong size");
    Some(Hand::Pairs(pairs, wait))
}

fn find_kokushi(tiles: &TileSet, wait: Tile) -> Option<Hand> {
    let mut double = None;
    for tile in tiles.distinct() {
        if tile.is_yaochu() {
            match tiles.get(tile) {
                0 => return None,
                1 => (),
                2 if double == None => double = Some(tile),
                _ => return None,
            }
        } else if tiles.get(tile) > 0 {
            return None;
        }
    }
    match double {
        Some(tile) => Some(Hand::Kokushi(tile, wait)),
        None => None,
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
        let results = search(
            &[M1, M1, M2, M2, M3, M3, X1, X1, X1, X2, X2, X2, P5, P5],
            M1,
        );
        assert_eq!(
            results,
            vec![Hand::Normal(
                P5,
                [Chi(M1), Chi(M1), Pon(X1), Pon(X2)],
                M1,
                Some(Chi(M1))
            ),]
        );
    }

    #[test]
    fn test_pairs() {
        let results = search(
            &[M1, M1, M3, M3, M5, M5, M7, M7, M9, M9, S1, S1, S2, S2],
            M1,
        );
        assert_eq!(results, vec![Hand::Pairs([M1, M3, M5, M7, M9, S1, S2], M1)]);
    }

    #[test]
    fn test_ryanpeiko() {
        let results = search(
            &[M1, M1, M2, M2, M3, M3, P1, P1, P2, P2, P3, P3, X1, X1],
            M1,
        );
        assert_eq!(
            results,
            vec![
                Hand::Normal(X1, [Chi(M1), Chi(M1), Chi(P1), Chi(P1)], M1, Some(Chi(M1))),
                Hand::Pairs([M1, M2, M3, P1, P2, P3, X1], M1),
            ]
        );
    }

    #[test]
    fn test_kokushi() {
        let results = search(
            &[M1, M9, P1, P9, S1, S9, S9, X1, X2, X3, X4, X5, X6, X7],
            M1,
        );
        assert_eq!(results, vec![Hand::Kokushi(S9, M1)]);
    }
}
