use itertools::Itertools;

use crate::search::search;
use crate::tiles::{Tile, TileSet};

type Part = Vec<Tile>;

fn full_groups(tiles: &TileSet) -> Vec<Part> {
    let mut result = vec![];
    for tile in tiles.distinct() {
        if tile.has_next() && tile.next().has_next() {
            let t2 = tile.next();
            let t3 = t2.next();
            if tiles.get(t2) > 0 && tiles.get(t3) > 0 {
                result.push(vec![tile, t2, t3]);
            }
        }

        if tiles.get(tile) >= 3 {
            result.push(vec![tile, tile, tile]);
        }
    }
    result
}

fn pairs(tiles: &TileSet) -> Vec<Tile> {
    let mut result = vec![];
    for tile in tiles.distinct() {
        if tiles.get(tile) >= 2 {
            result.push(tile);
        }
    }
    result
}

fn tenpai_4groups(tiles: &TileSet, groups: &[Part]) -> Vec<Part> {
    let mut result = vec![];

    for comb in groups.iter().combinations_with_replacement(4) {
        let mut current: Vec<Tile> = vec![];
        for group in comb.into_iter() {
            for tile in group.iter() {
                current.push(*tile);
            }
        }
        for tile in tiles.distinct() {
            current.push(tile);
            let ts = TileSet::make(&current);
            if tiles.contains(&ts) {
                result.push(current.clone());
            }
            current.truncate(current.len() - 1);
        }
    }
    result
}

#[cfg(test)]
mod test {
    use super::*;
    use Tile::*;

    //#[test]
    fn test_choose_tenpai() {
        let tiles = TileSet::make(&[
            M2, M3, M5, M6, M7, M7, M8, M9, M9, P1, P3, P5, P6, P6, P7, P8, S1, S2, S2, S3, S4, S6,
            S7, S7, S8, X1, X2, X2, X4, X4, X4, X5, X6, X7,
        ]);
        // let pairs = pairs(&tiles);
        let groups = full_groups(&tiles);
        let tenpais: Vec<Part> = tenpai_4groups(&tiles, &groups);

        for tenpai in tenpais.iter() {
            println!("tenpai: {:?}", tenpai);
            for wait in Tile::all() {
                let mut tiles = tenpai.clone();
                tiles.push(wait);
                let hands = search(&tiles, wait);
                if hands.len() > 0 {
                    println!("hands: {:?}", hands);
                }
            }
            println!();
        }
    }
}
