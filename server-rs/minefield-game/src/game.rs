use rand::seq::SliceRandom;

use minefield_core::score::Score;
use minefield_core::search::{find_all_waits, search};
use minefield_core::tiles::Tile;
use minefield_core::yaku;
use yaku::Yaku;

use crate::protocol::{MoveType, Msg};

const PLAYER_TILES: usize = 34;
const DISCARDS: usize = 17;
const DISCARD_TIME_LIMIT: usize = 15;
const HAND_TIME_LIMIT: usize = 3 * 60;
const EXTRA_TIME: usize = 10;

pub struct Game {
    east: usize,
    players: [Player; 2],
    dora_ind: Tile,
    uradora_ind: Tile,
    finished: bool,
    time: usize,
    messages: Vec<(usize, Msg)>,
}

pub enum GameError {
    Abort { culprit: usize, description: usize },
}

impl Game {
    pub fn new(rng: &mut impl rand::Rng) -> Self {
        let mut all_tiles = all_tiles();
        all_tiles.shuffle(rng);

        let east = rng.gen_range(0, 2);

        Self::fixed(&all_tiles, east)
    }

    pub fn fixed(all_tiles: &[Tile], east: usize) -> Self {
        let players = [
            Player::new(&all_tiles[0..PLAYER_TILES], east == 0),
            Player::new(&all_tiles[PLAYER_TILES..PLAYER_TILES * 2], east == 1),
        ];

        let dora_ind = all_tiles[PLAYER_TILES * 2];
        let uradora_ind = all_tiles[PLAYER_TILES * 2 + 1];

        Game {
            east,
            players,
            dora_ind,
            uradora_ind,
            finished: false,
            time: 0,
            messages: vec![],
        }
    }

    pub fn on_start(&mut self) {
        for i in 0..2 {
            self.send(
                i,
                Msg::PhaseOne {
                    tiles: self.players[i].tiles.clone(),
                    dora_ind: self.dora_ind,
                    you: i,
                    east: self.east,
                },
            );
            self.start_move(i, MoveType::Hand);
        }
    }

    pub fn on_message(&mut self, i: usize, msg: Msg) {
        assert!(!self.finished);
        match msg {
            Msg::Hand { hand } => {
                self.on_hand(i, &hand);
            }
            Msg::Discard { tile } => {
                self.on_discard(i, tile);
            }
            _ => self.abort(i, "unexpected message"),
        }
    }

    pub fn messages(&mut self) -> Vec<(usize, Msg)> {
        self.messages.split_off(0)
    }

    pub fn messages_at_most(&mut self, n: usize) -> Vec<(usize, Msg)> {
        let suffix = self
            .messages
            .split_off(std::cmp::min(n, self.messages.len()));
        std::mem::replace(&mut self.messages, suffix)
    }

    pub fn beat(&mut self) {
        assert!(!self.finished);

        self.time += 1;
        for i in 0..2 {
            if let Some(deadline) = self.players[i].deadline {
                if self.time == deadline {
                    return self.abort(i, "time limit exceeded");
                }
            }
        }
    }

    fn send(&mut self, i: usize, msg: Msg) {
        self.messages.push((i, msg));
    }

    fn send_both(&mut self, msg: Msg) {
        self.messages.push((0, msg.clone()));
        self.messages.push((1, msg));
    }

    fn start_move(&mut self, i: usize, move_type: MoveType) {
        assert!(self.players[i].deadline.is_none());
        let time_limit = match move_type {
            MoveType::Hand => HAND_TIME_LIMIT,
            MoveType::Discard => DISCARD_TIME_LIMIT,
        };
        self.players[i].deadline = Some(self.time + time_limit + EXTRA_TIME);
        self.send(
            i,
            Msg::StartMove {
                move_type,
                time_limit,
            },
        )
    }

    fn end_move(&mut self, i: usize) {
        assert!(self.players[i].deadline.is_some());
        self.players[i].deadline = None;
        self.send(i, Msg::EndMove);
    }

    fn on_hand(&mut self, i: usize, hand: &[Tile]) {
        let player = &mut self.players[i];
        if let Err(description) = player.set_hand(hand) {
            return self.abort(i, description);
        }
        self.end_move(i);

        // For replay
        self.send(
            i,
            Msg::Hand {
                hand: hand.to_vec(),
            },
        );

        if self.is_phase2() {
            self.send_both(Msg::PhaseTwo);

            self.start_move(self.east, MoveType::Discard);
        } else {
            self.send(i, Msg::WaitForPhaseTwo);
        }
    }

    fn is_phase2(&self) -> bool {
        !self.players[0].hand.is_empty() && !self.players[1].hand.is_empty()
    }

    fn abort(&mut self, culprit: usize, description: &str) {
        self.finished = true;

        self.send_both(Msg::Abort {
            culprit,
            description: description.to_owned(),
        });
    }

    pub fn on_discard(&mut self, i: usize, tile: Tile) {
        if !self.is_phase2() {
            return self.abort(i, "discard too soon");
        }

        if let Err(description) = self.players[i].discard(tile) {
            return self.abort(i, description);
        }
        self.end_move(i);
        for j in 0..2 {
            self.send(j, Msg::Discarded { player: i, tile });
        }

        // ron
        if let Some(msg) =
            self.players[1 - i].check_ron(1 - i, tile, self.dora_ind, self.uradora_ind)
        {
            self.send_both(msg);
            self.finished = true;
            return;
        }

        // draw
        if self.players[0].finished() && self.players[1].finished() {
            self.send_both(Msg::Draw);
            self.finished = true;
            return;
        }

        // normal turn
        self.start_move(1 - i, MoveType::Discard);
    }
}

fn all_tiles() -> Vec<Tile> {
    let mut result = vec![];
    for _ in 0..4 {
        result.append(&mut Tile::all().collect());
    }
    result
}

struct Player {
    tiles: Vec<Tile>,
    is_east: bool,
    deadline: Option<usize>,
    hand: Vec<Tile>,
    discards: Vec<Tile>,
    furiten: bool,
    waits: Vec<Tile>,
}

impl Player {
    fn new(tiles: &[Tile], is_east: bool) -> Self {
        Player {
            tiles: tiles.to_vec(),
            is_east,
            deadline: None,
            hand: vec![],
            discards: vec![],
            furiten: false,
            waits: vec![],
        }
    }

    fn set_hand(&mut self, hand: &[Tile]) -> Result<(), &'static str> {
        if !self.deadline.is_some() || !self.hand.is_empty() {
            return Err("not expecting a hand");
        }
        if hand.len() != 13 {
            return Err("len != 13");
        }
        for tile in hand.iter() {
            let idx = self.find_choice(*tile)?;
            self.tiles.remove(idx);
        }
        let waits = find_all_waits(hand);

        self.hand = hand.to_vec();
        self.waits = waits;

        Ok(())
    }

    fn find_choice(&self, tile: Tile) -> Result<usize, &'static str> {
        self.tiles
            .iter()
            .position(|t| *t == tile)
            .ok_or("tile not found in choices")
    }

    fn discard(&mut self, tile: Tile) -> Result<(), &'static str> {
        if !self.deadline.is_some() || self.hand.is_empty() {
            return Err("not expecting a discard");
        }
        let idx = self.find_choice(tile)?;
        self.tiles.remove(idx);
        assert!(self.discards.len() < DISCARDS);
        self.discards.push(tile);
        if self.waits.contains(&tile) {
            self.furiten = true;
        }
        Ok(())
    }

    fn finished(&self) -> bool {
        self.discards.len() == DISCARDS
    }

    fn check_ron(
        &mut self,
        i: usize,
        tile: Tile,
        dora_ind: Tile,
        uradora_ind: Tile,
    ) -> Option<Msg> {
        if !self.waits.contains(&tile) {
            return None;
        }
        if self.furiten {
            return None;
        }

        let player_wind = if self.is_east { Tile::X1 } else { Tile::X3 };
        let dora = dora_ind.next_wrap();
        let uradora = uradora_ind.next_wrap();
        let turn = if self.is_east {
            self.discards.len() - 1
        } else {
            self.discards.len()
        };

        let mut full_hand = self.hand.clone();
        full_hand.push(tile);
        let hands = search(&full_hand, tile);
        let scored_hands = hands.iter().filter_map(|hand| {
            let mut special = vec![Yaku::Riichi];
            if turn == 0 {
                special.push(Yaku::Ippatsu);
            }
            if turn == DISCARDS - 1 {
                special.push(Yaku::Hotei);
            }
            let mut score = Score::from_hand(hand, player_wind, &special);

            // Check if mangan (with dora)
            score.add_dora(dora);
            if score.limit() == 0 {
                return None;
            }

            // Return score (with dora and uradora)
            score.add_dora(uradora);
            Some(score)
        });

        if let Some(score) = scored_hands.max_by_key(|score| score.limit()) {
            Some(Msg::Ron {
                player: i,
                hand: self.hand.clone(),
                tile,
                yaku: score.yaku.clone(),
                dora: score.dora_count,
                uradora_ind,
                limit: score.limit(),
                points: score.points(),
            })
        } else {
            self.furiten = true;
            None
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use Tile::*;

    fn game() -> Game {
        Game::fixed(&all_tiles(), 0)
    }

    fn assert_aborted(game: &mut Game, culprit: usize, description: &str) {
        let abort = Msg::Abort {
            culprit,
            description: description.to_owned(),
        };
        assert_eq!(game.messages(), vec![(0, abort.clone()), (1, abort)]);
    }

    #[test]
    fn test_init() {
        let mut game = game();
        let all_tiles = all_tiles();
        game.on_start();
        assert_eq!(
            game.messages(),
            vec![
                (
                    0,
                    Msg::PhaseOne {
                        tiles: all_tiles[0..PLAYER_TILES].to_vec(),
                        dora_ind: M1,
                        you: 0,
                        east: 0
                    }
                ),
                (
                    0,
                    Msg::StartMove {
                        move_type: MoveType::Hand,
                        time_limit: HAND_TIME_LIMIT
                    }
                ),
                (
                    1,
                    Msg::PhaseOne {
                        tiles: all_tiles[PLAYER_TILES..2 * PLAYER_TILES].to_vec(),
                        dora_ind: M1,
                        you: 1,
                        east: 0
                    }
                ),
                (
                    1,
                    Msg::StartMove {
                        move_type: MoveType::Hand,
                        time_limit: HAND_TIME_LIMIT
                    }
                )
            ]
        );
    }

    fn start_game(hand_0: &[Tile], hand_1: &[Tile]) -> Game {
        let mut game = game();
        game.on_start();
        game.messages();
        game.on_message(
            0,
            Msg::Hand {
                hand: hand_0.to_vec(),
            },
        );
        assert_eq!(
            game.messages(),
            vec![
                (0, Msg::EndMove),
                (
                    0,
                    Msg::Hand {
                        hand: hand_0.to_vec()
                    }
                ),
                (0, Msg::WaitForPhaseTwo)
            ]
        );
        game.on_message(
            1,
            Msg::Hand {
                hand: hand_1.to_vec(),
            },
        );
        assert_eq!(
            game.messages_at_most(4),
            vec![
                (1, Msg::EndMove),
                (
                    1,
                    Msg::Hand {
                        hand: hand_1.to_vec()
                    }
                ),
                (0, Msg::PhaseTwo),
                (1, Msg::PhaseTwo),
            ]
        );
        game
    }

    fn discard(game: &mut Game, player: usize, tile: Tile) {
        assert_eq!(
            game.messages(),
            vec![(
                player,
                Msg::StartMove {
                    move_type: MoveType::Discard,
                    time_limit: DISCARD_TIME_LIMIT
                }
            )]
        );
        game.on_message(player, Msg::Discard { tile });
        assert_eq!(
            game.messages_at_most(3),
            vec![
                (player, Msg::EndMove),
                (0, Msg::Discarded { player, tile }),
                (1, Msg::Discarded { player, tile }),
            ]
        );
    }

    #[test]
    fn test_draw() {
        let mut game = start_game(
            &[M1, M2, M3, M4, M5, M6, M7, M8, M9, P1, P2, P3, P4],
            &[M1, M2, M3, M4, M5, M6, M7, M8, M9, P1, P2, P3, P4],
        );
        for _ in 0..DISCARDS {
            for player in 0..2 {
                let tile = game.players[player].tiles[0];
                discard(&mut game, player, tile);
            }
        }
        assert_eq!(game.messages(), vec![(0, Msg::Draw), (1, Msg::Draw)]);
        assert_eq!(game.finished, true);
    }

    #[test]
    fn test_win() {
        // P0: 13-sided kokushi
        // P1: riichi ippatsu dora - 3 fan, not enough for mangan
        let mut game = start_game(
            &[M1, M9, P1, P9, S1, S9, X1, X2, X3, X4, X5, X6, X7],
            &[M1, M2, M3, M4, M5, M6, P7, P8, P9, S1, S2, S3, S4],
        );

        // P1's winning tile - no ron, furiten
        discard(&mut game, 0, S4);
        assert_eq!(game.finished, false);
        assert_eq!(game.players[1].furiten, true);

        // Rising Sun!
        discard(&mut game, 1, P1);
        let ron = Msg::Ron {
            player: 0,
            yaku: vec![Yaku::Kokushi],
            hand: vec![M1, M9, P1, P9, S1, S9, X1, X2, X3, X4, X5, X6, X7],
            points: 32000,
            limit: 5,
            dora: 0,
            uradora_ind: M2,
            tile: P1,
        };
        assert_eq!(game.messages(), vec![(0, ron.clone()), (1, ron)]);
        assert_eq!(game.finished, true);
    }

    #[test]
    fn test_furiten() {
        // P0: junk
        // P1: riichi tanyao sanshoku on S5, but only riichi tanyao on S8
        let mut game = start_game(
            &[M2, M9, P1, P9, S1, S9, X1, X2, X3, X4, X5, X6, X7],
            &[M6, M7, M8, P6, P7, P8, S2, S3, S4, S5, S6, S7, S8],
        );

        // P1's winning tile - no ron, furiten
        discard(&mut game, 0, S8);
        assert_eq!(game.finished, false);
        assert_eq!(game.players[1].furiten, true);

        discard(&mut game, 1, P1);

        // P1 would win now, but she's in furiten
        discard(&mut game, 0, S5);
        assert_eq!(game.finished, false);
    }

    #[test]
    fn test_short_hand() {
        let mut game = game();
        game.on_start();
        game.messages();
        game.on_message(
            1,
            Msg::Hand {
                hand: vec![M1, M2, M3],
            },
        );
        assert_aborted(&mut game, 1, "len != 13");
    }

    #[test]
    fn test_tiles_outside_initial() {
        let mut game = game();
        game.on_start();
        game.messages();
        game.on_message(
            1,
            Msg::Hand {
                hand: vec![M1, M1, M1, M1, M1, M1, M1, M1, M1, M1, M1, M1, M1],
            },
        );
        assert_aborted(&mut game, 1, "tile not found in choices");
    }

    #[test]
    fn test_hand_time_limit() {
        let mut game = game();
        game.on_start();
        game.messages();
        game.on_message(
            0,
            Msg::Hand {
                hand: vec![M2, M9, P1, P9, S1, S9, X1, X2, X3, X4, X5, X6, X7],
            },
        );
        game.messages();
        for _ in 0..HAND_TIME_LIMIT + EXTRA_TIME {
            game.beat();
        }
        assert_aborted(&mut game, 1, "time limit exceeded");
    }

    #[test]
    fn test_discard_time_limit() {
        let mut game = start_game(
            &[M1, M2, M3, M4, M5, M6, M7, M8, M9, P1, P2, P3, P4],
            &[M1, M2, M3, M4, M5, M6, M7, M8, M9, P1, P2, P3, P4],
        );
        game.messages();
        for _ in 0..DISCARD_TIME_LIMIT + EXTRA_TIME {
            game.beat();
        }
        assert_aborted(&mut game, 0, "time limit exceeded");
    }
}
