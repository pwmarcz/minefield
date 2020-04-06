use std::collections::HashMap;

use crate::game::Game;
use crate::protocol::{Msg, PGame};

#[derive(Default)]
pub struct Server {
    user_id_counter: usize,
    game_id_counter: usize,

    rooms: HashMap<usize, Room>,
    user_map: HashMap<usize, usize>,

    messages: Vec<(usize, Msg)>,
}

impl Server {
    pub fn new() -> Self {
        return Default::default();
    }

    pub fn messages(&mut self) -> Vec<(usize, Msg)> {
        self.messages.split_off(0)
    }

    pub fn on_connect(&mut self) -> usize {
        let id = self.user_id_counter;
        self.user_id_counter += 1;
        id
    }

    pub fn on_disconnect(&mut self, user_id: usize) {
        if let Some(room_id) = self.user_map.get(&user_id) {
            match self.rooms.get_mut(room_id) {
                Some(Room::WaitingRoom { .. }) => {
                    self.rooms.remove(room_id);
                }
                Some(Room::GameRoom { mut user_ids, .. }) => {
                    for i in 0..2 {
                        if user_ids[i] == Some(user_id) {
                            user_ids[i] = None;
                        }
                    }
                }
                None => unreachable!("room removed before player"),
            }
        }
        self.user_map.remove(&user_id);
    }

    pub fn on_message(&mut self, user_id: usize, msg: Msg) {
        match msg {
            Msg::GetGames => {
                let games: Vec<PGame> = self
                    .rooms
                    .values()
                    .map(|room| match room {
                        Room::WaitingRoom { nick, key, .. } => PGame::Player {
                            nick: nick.clone(),
                            key: key.clone(),
                        },
                        Room::GameRoom { nicks, .. } => PGame::Game {
                            nicks: [nicks[0].clone(), nicks[1].clone()],
                        },
                    })
                    .collect();
                self.send(user_id, Msg::Games { games });
            }

            Msg::NewGame { .. } => {}
            Msg::CancelNewGame => {}
            //Msg::Rejoin {..} => {}
            Msg::Join { .. } => {}
            Msg::Hand { .. } | Msg::Discard { .. } => {}
            _ => {
                // TODO warning
            }
        }
    }

    pub fn beat() {}

    fn send(&mut self, user_id: usize, msg: Msg) {
        self.messages.push((user_id, msg));
    }
}

enum Room {
    WaitingRoom {
        user_id: usize,
        nick: String,
        key: String,
    },
    GameRoom {
        game: Game,
        nicks: [String; 2],
        keys: [String; 2],
        user_ids: [Option<usize>; 2],
    },
}
