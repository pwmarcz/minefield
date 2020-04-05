use rand::seq::SliceRandom;

use minefield_core::tiles::Tile;

use crate::protocol::Msg;

const PLAYER_TILES: usize = 34;

pub type Response = Vec<(usize, Msg)>;

pub struct Game {
    east: usize,
    time_start: usize,
    players: [Player; 2],
    dora_ind: Tile,
    uradora_ind: Tile,
    finished: bool,
}

pub struct Player {
    tiles: Vec<Tile>,
    is_east: bool,
    deadline: Option<usize>,
    phase2: Option<Phase2>,
}

pub struct Phase2 {
    hand: Vec<Tile>,
    discards: Vec<Tile>,
    waits: Vec<Tile>,
}

pub enum GameError {
    Abort { culprit: usize, description: usize },
}

impl Game {
    pub fn new(rng: &mut impl rand::Rng, time_start: usize) -> Self {
        let mut all_tiles: Vec<Tile> = Tile::all().collect();
        all_tiles.shuffle(rng);

        let east = rng.gen_range(0, 2);

        let players = [
            Player::new(&all_tiles[0..PLAYER_TILES], east == 0),
            Player::new(&all_tiles[PLAYER_TILES..PLAYER_TILES * 2], east == 1),
        ];

        let dora_ind = all_tiles[PLAYER_TILES * 2];
        let uradora_ind = all_tiles[PLAYER_TILES * 2 + 1];

        Game {
            east,
            time_start,
            players,
            dora_ind,
            uradora_ind,
            finished: false,
        }
    }

    pub fn on_start(&self) -> Response {
        return self.send_to_both(|i| Msg::PhaseOne {
            tiles: self.players[i].tiles.clone(),
            dora_ind: self.dora_ind,
            you: i,
            east: self.east,
        });
    }

    // pub fn on_hand(&mut self, i: usize, hand: &[Tile]) -> Response {
    //     let mut player = &self.players[i];
    //     if player.phase2.is_some() {
    //         return self.abort(i, "received hand in wrong phase");
    //     }
    //     if let Err(description) = player.set_hand(hand) {
    //         return self.abort(i, reason);
    //     }
    // }

    pub fn abort(&mut self, culprit: usize, description: &str) -> Response {
        self.finished = true;
        self.send_to_both(|_| Msg::Abort {
            culprit,
            description: description.to_owned(),
        })
    }

    fn send_to_both<F>(&self, f: F) -> Response
    where
        F: Fn(usize) -> Msg,
    {
        return vec![(0, f(0)), (1, f(1))];
    }
}

impl Player {
    fn new(tiles: &[Tile], is_east: bool) -> Self {
        Player {
            tiles: tiles.to_vec(),
            is_east,
            deadline: None,
            phase2: None,
        }
    }
}
