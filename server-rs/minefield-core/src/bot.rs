use std::collections::HashSet;

use crate::backtrack::{Backtrack, BacktrackStrategy};
use crate::search::search;
use crate::tiles::{Tile, TileSet};
use crate::yaku::score_hand;

enum BotSearch {
    Normal4,
    Normal3,
    Pairs,
    Kokushi,
}

impl BacktrackStrategy<Vec<Tile>> for BotSearch {
    fn generate(&self, bt: &Backtrack) -> Vec<Vec<Tile>> {
        use BotSearch::*;
        match self {
            // 4 groups + wait
            Normal4 if bt.remaining > 1 => bt.filter(bt.find_groups()),
            Normal4 => bt.find_single(),
            // 3 groups + incomplete group + pair
            Normal3 if bt.remaining > 4 => bt.filter(bt.find_groups()),
            Normal3 if bt.remaining > 2 => bt.find_incomplete_groups(),
            Normal3 => bt.find_pairs(),
            // 6 pairs + wait
            Pairs if bt.remaining > 1 => bt.filter(bt.find_pairs()),
            Pairs => bt.find_single(),
            // kokushi
            Kokushi => find_kokushi(&bt.tiles),
        }
    }

    fn check(&self, bt: &Backtrack) -> Vec<Vec<Tile>> {
        vec![bt.stack.as_slice().concat()]
    }
}

fn find_kokushi(tiles: &TileSet) -> Vec<Vec<Tile>> {
    let mut yaochu = vec![];
    for tile in tiles.distinct() {
        if tile.is_yaochu() {
            yaochu.push(tile);
        }
    }
    let mut result = vec![];
    // 13-way kokushi, no need for anything else
    if yaochu.len() == 13 {
        result.push(yaochu);
    } else if yaochu.len() == 12 {
        for tile in yaochu.iter() {
            if tiles.get(*tile) > 1 {
                let mut tenpai = yaochu.clone();
                tenpai.push(*tile);
                result.push(tenpai);
            }
        }
    }
    result
}

fn find_all_tenpai(tiles: &[Tile]) -> Vec<Vec<Tile>> {
    use BotSearch::*;
    let mut result = vec![];

    let mut bt = Backtrack::from_tiles(tiles, 13);
    for strategy in [Normal4, Normal3, Pairs, Kokushi].iter() {
        result.append(&mut bt.run(strategy));
    }
    result
}

pub fn find_best_tenpai(tiles: &[Tile], dora: Tile, player_wind: Tile) -> Option<Vec<Tile>> {
    let mut best_tenpai = None;
    let mut best_score = 0;

    let mut seen = HashSet::new();

    let tenpais = find_all_tenpai(tiles);
    for mut tiles in tenpais.into_iter() {
        tiles.sort();
        if seen.contains(&tiles) {
            continue;
        }
        seen.insert(tiles.clone());
        for wait in Tile::all() {
            tiles.push(wait);
            // TODO: evaluate tenpai based on waits
            for hand in search(&tiles, wait) {
                let score = score_hand(&hand, player_wind, dora);
                if best_score == 0 || score > best_score {
                    let mut tenpai = tiles.clone();
                    tenpai.pop();
                    best_tenpai = Some(tenpai);
                    best_score = score;
                }
            }
            tiles.pop();
        }
    }
    println!("best: {:?} score: {:}", best_tenpai, best_score);
    best_tenpai
}

pub struct Bot {
    initial_tiles: Vec<Tile>,
    tile_set: TileSet,
    safe_tiles: TileSet,
    dora: Tile,
    player_wind: Tile,
}

impl Bot {
    pub fn new(initial_tiles: &[Tile], dora_ind: Tile, player_wind: Tile) -> Self {
        Bot {
            initial_tiles: initial_tiles.to_vec(),
            tile_set: TileSet::from_tiles(initial_tiles),
            safe_tiles: TileSet::new(),
            dora: dora_ind.next_wrap(),
            player_wind,
        }
    }

    pub fn choose_hand(&mut self) -> (Vec<Tile>, bool) {
        let (hand, found) = match find_best_tenpai(&self.initial_tiles, self.dora, self.player_wind)
        {
            Some(hand) => (hand, true),
            None => (self.initial_tiles[..13].to_vec(), false),
        };
        self.tile_set.add_all(&hand, -1);

        (hand, found)
    }

    pub fn choose_discard(&mut self) -> Tile {
        let first_tile = self.tile_set.distinct().next().unwrap();
        self.tile_set.add(first_tile, -1);
        first_tile
    }

    pub fn opponent_discard(&mut self, tile: Tile) {
        self.safe_tiles.add(tile, 1)
    }
}

// Release only - debug mode is too slow
#[cfg(test)]
mod test {
    use super::*;
    use Tile::*;

    fn assert_bot(tiles: &[Tile], dora_ind: Tile, player_wind: Tile) {
        let dora = dora_ind.next_wrap();
        let best_tenpai = find_best_tenpai(&tiles, dora, player_wind);
        assert!(best_tenpai.is_some());
    }

    fn assert_bot_fails(tiles: &[Tile], dora_ind: Tile, player_wind: Tile) {
        let dora = dora_ind.next_wrap();
        let best_tenpai = find_best_tenpai(&tiles, dora, player_wind);
        assert!(best_tenpai.is_none());
    }

    #[test]
    fn test_choose_tenpai() {
        assert_bot(
            &[
                M2, M3, M5, M6, M7, M7, M8, M9, M9, P1, P3, P5, P6, P6, P7, P8, S1, S2, S2, S3, S4,
                S6, S7, S7, S8, X1, X2, X2, X4, X4, X4, X5, X6, X7,
            ],
            X4,
            X3,
        );
        assert_bot(
            &[
                M2, M3, M4, M4, M5, M8, P1, P2, P2, P3, P5, P6, P7, P7, P7, P8, P8, P9, P9, S1, S2,
                S3, S4, S5, S6, S8, S9, S9, X1, X2, X2, X5, X5, X5,
            ],
            X4,
            X1,
        );
        assert_bot(
            &[
                M2, M3, M3, M4, M5, M6, M6, M7, M8, M9, M9, P1, P2, P2, P5, P6, P9, S3, S5, S7, S7,
                S8, S8, S9, X3, X3, X4, X5, X5, X6, X7, X7, X7,
            ],
            M3,
            X3,
        );
    }

    #[test]
    fn test_kokushi() {
        assert_bot(
            &[
                M1, M2, M4, M5, M7, M8, M9, P1, P2, P4, P5, P7, P8, P9, S1, S2, S4, S5, S7, S8, S9,
                X1, X1, X1, X1, X2, X2, X3, X3, X4, X4, X5, X5, X7,
            ],
            M3,
            X3,
        );
    }

    #[test]
    fn test_nothing() {
        assert_bot_fails(
            // no tenpai possible
            &[
                M1, M2, M4, M5, M7, M8, P1, P2, P4, P5, P7, P8, S1, S2, S4, S5, S7, S8, X1, X1, X1,
                X1, X2, X2, X2, X2, X3, X3, X4, X4, X5, X5, X6, X7,
            ],
            M3,
            X3,
        );
    }
}
