use rand::seq::SliceRandom;

use minefield_core::search::find_all_waits;
use minefield_core::tiles::Tile;

use crate::protocol::{MoveType, Msg};

const PLAYER_TILES: usize = 34;
const DISCARD_TIME_LIMIT: usize = 15;
const HAND_TIME_LIMIT: usize = 3 * 60;
const EXTRA_TIME: usize = 10;

pub type Buffer = Vec<(usize, Msg)>;

pub struct Game {
    east: usize,
    time_start: usize,
    players: [Player; 2],
    dora_ind: Tile,
    uradora_ind: Tile,
    finished: bool,
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

    pub fn on_start(&mut self, buffer: &mut Buffer, t: usize) {
        for i in 0..2 {
            self.send(
                buffer,
                i,
                Msg::PhaseOne {
                    tiles: self.players[i].tiles.clone(),
                    dora_ind: self.dora_ind,
                    you: i,
                    east: self.east,
                },
            );
            self.start_move(buffer, t, i, MoveType::Hand);
        }
    }

    fn start_move(&mut self, buffer: &mut Buffer, t: usize, i: usize, move_type: MoveType) {
        assert!(self.players[i].deadline.is_none());
        let time_limit = match move_type {
            MoveType::Hand => HAND_TIME_LIMIT,
            MoveType::Discard => DISCARD_TIME_LIMIT,
        };
        self.players[i].deadline = Some(t + time_limit + EXTRA_TIME);
        self.send(
            buffer,
            i,
            Msg::StartMove {
                move_type,
                time_limit,
            },
        )
    }

    fn end_move(&mut self, buffer: &mut Buffer, i: usize) {
        self.players[i].deadline = None;
        self.send(buffer, i, Msg::EndMove);
    }

    pub fn on_hand(&mut self, buffer: &mut Buffer, i: usize, hand: &[Tile]) {
        let player = &mut self.players[i];
        if let Err(description) = player.set_hand(hand) {
            return self.abort(buffer, i, description);
        }
        self.end_move(buffer, i);
    }

    pub fn abort(&mut self, buffer: &mut Buffer, culprit: usize, description: &str) {
        self.finished = true;
        for i in 0..2 {
            self.send(
                buffer,
                i,
                Msg::Abort {
                    culprit,
                    description: description.to_owned(),
                },
            );
        }
    }

    fn send(&self, buffer: &mut Buffer, i: usize, msg: Msg) {
        buffer.push((i, msg));
    }
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

impl Player {
    fn new(tiles: &[Tile], is_east: bool) -> Self {
        Player {
            tiles: tiles.to_vec(),
            is_east,
            deadline: None,
            phase2: None,
        }
    }

    fn set_hand(&mut self, hand: &[Tile]) -> Result<(), &'static str> {
        if self.phase2.is_some() {
            return Err("already submitted a hand");
        }
        if hand.len() != 13 {
            return Err("len != 13");
        }
        for tile in hand.iter() {
            match self.tiles.iter().position(|t| *t == *tile) {
                Some(idx) => {
                    self.tiles.remove(idx);
                }
                None => return Err("tile not found in choices"),
            }
        }
        let waits = find_all_waits(hand);

        self.phase2 = Some(Phase2 {
            hand: hand.to_vec(),
            discards: vec![],
            waits,
        });

        Ok(())
    }
}
