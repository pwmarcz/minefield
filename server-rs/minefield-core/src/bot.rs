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

pub fn find_best_tenpai(all_tiles: &[Tile], dora: Tile, player_wind: Tile) -> Option<Vec<Tile>> {
    let tile_set = TileSet::from_tiles(all_tiles);
    let mut best_tenpai = None;
    let mut best_value = 0.0;

    let mut seen = HashSet::new();

    let tenpais = find_all_tenpai(all_tiles);
    for mut tiles in tenpais.into_iter() {
        tiles.sort();
        if seen.contains(&tiles) {
            continue;
        }
        seen.insert(tiles.clone());

        if let Some(value) = eval_tenpai(&tiles, dora, player_wind, &tile_set) {
            if value > best_value {
                best_tenpai = Some(tiles);
                best_value = value;
            }
        }
    }
    println!("best: {:?} value: {:}", best_tenpai, best_value);
    best_tenpai
}

fn eval_tenpai(tiles: &[Tile], dora: Tile, player_wind: Tile, tile_set: &TileSet) -> Option<f64> {
    let mut tiles = tiles.to_vec();
    let mut all = vec![];
    let mut good = vec![];
    let mut all_count = 0;
    let mut good_count = 0;

    for wait in Tile::all() {
        tiles.push(wait);
        let hands = search(&tiles, wait);
        let max_score = hands
            .iter()
            .map(|hand| score_hand(hand, player_wind, dora))
            .max()
            .unwrap_or(0);

        let count = 4 - tile_set.get(wait);
        // TODO dora
        if count == 0 {
            continue;
        }

        all.push((count, max_score));
        all_count += count;
        if max_score > 0 {
            good.push((count, max_score));
            good_count += count;
        }

        tiles.pop();
    }

    if good_count == 0 {
        return None;
    }

    let mut prob_none: f64 = 1.0; // probability that no waits are in 17 random tiles
    for i in 0..all_count {
        prob_none *= ((84 - i) as f64) / 101.0; // 101 = 136 - 34 - 1; 84 = 101 - 17;
    }
    let prob_some = 1.0 - prob_none;
    let expected_win = good
        .iter()
        .map(|(count, score)| (*count as f64) * (*score as f64))
        .sum::<f64>()
        / (all_count as f64);

    Some(prob_some * expected_win * (good_count as f64) / (all_count as f64))
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
