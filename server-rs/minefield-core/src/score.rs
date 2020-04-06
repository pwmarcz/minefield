use crate::fu::fu;
use crate::hand::Hand;
use crate::tiles::Tile;
use crate::yaku::{yaku, Yaku};

const BASE_POINTS: [usize; 7] = [0, 8000, 12000, 16000, 24000, 32000, 64000];

#[derive(Debug)]
pub struct Score {
    pub yaku: Vec<Yaku>,
    pub tiles: Vec<Tile>,
    pub fu: usize,
    pub dora_count: usize,
}

impl Score {
    pub fn from_hand(hand: &Hand, player_wind: Tile, special: &[Yaku]) -> Self {
        let tiles = hand.tiles();
        let yaku = yaku(hand, player_wind, special);
        let fu = fu(hand, player_wind);
        Score {
            yaku,
            tiles,
            fu,
            dora_count: 0,
        }
    }

    pub fn count_dora(&self, dora: Tile) -> usize {
        let mut result = 0;
        for tile in self.tiles.iter() {
            if *tile == dora {
                result += 1;
            }
        }
        result
    }

    pub fn add_dora(&mut self, dora: Tile) {
        self.dora_count += self.count_dora(dora);
    }

    pub fn with_dora(&mut self, dora: Tile) -> &mut Self {
        self.dora_count += self.count_dora(dora);
        self
    }

    pub fn fan(&self) -> usize {
        self.yaku.iter().map(|y| y.fan()).sum()
    }

    pub fn limit(&self) -> usize {
        let mut fan = self.fan();
        if fan < 13 {
            fan = std::cmp::min(13, fan + self.dora_count);
        }

        match fan {
            // no mangan
            0..=2 => 0,
            3 if self.fu < 60 => 0,
            4 if self.fu < 30 => 0,
            // mangan
            3..=5 => 1,
            // haneman
            6..=7 => 2,
            // baiman
            8..=10 => 3,
            // sanbaiman
            11..=12 => 4,
            // yakuman
            13 => 5,
            // double yakuman
            _ => 6,
        }
    }

    pub fn points(&self) -> usize {
        BASE_POINTS[self.limit()]
    }
}
