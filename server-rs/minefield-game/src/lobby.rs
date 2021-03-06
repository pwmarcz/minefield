use std::collections::HashMap;

use failure::{Error, Fail};

use crate::db::Database;
use crate::protocol::Msg;
use crate::room::Room;

#[derive(Debug, Fail)]
pub enum LobbyError {
    #[fail(display = "unrecognized message")]
    UnrecognizedMessage,
    #[fail(display = "already joined")]
    AlreadyJoined,
    #[fail(display = "not joined")]
    NotJoined,
    #[fail(display = "wrong key")]
    WrongKey,
}

pub struct Lobby {
    database: Database,
    next_user_id: usize,
    rooms: HashMap<usize, Room>,
    user_to_room: HashMap<usize, usize>,
}

impl Lobby {
    pub fn new() -> Self {
        Self::open(":memory:").unwrap()
    }

    pub fn open(db_path: &str) -> Result<Self, Error> {
        let mut database = Database::open(db_path)?;
        let rooms = database.load_rooms()?;
        Ok(Lobby {
            database,
            next_user_id: 0,
            rooms,
            user_to_room: HashMap::new(),
        })
    }

    pub fn connect(&mut self) -> usize {
        let user_id = self.next_user_id;
        self.next_user_id += 1;
        user_id
    }

    pub fn disconnect(&mut self, user_id: usize) {
        if let Some(room_id) = self.user_to_room.get(&user_id).cloned() {
            let room = self.rooms.get_mut(&room_id).unwrap();
            room.disconnect(user_id);
            self.user_to_room.remove(&user_id);
            self.update_room(room_id);
        }
    }

    pub fn beat(&mut self) -> Vec<(usize, Msg)> {
        let mut messages = vec![];
        let room_ids: Vec<usize> = self.rooms.keys().copied().collect();
        for room_id in room_ids.iter() {
            let room = self.rooms.get_mut(room_id).unwrap();
            messages.append(&mut room.beat());
            self.update_room(*room_id);
        }
        messages
    }

    pub fn debug_dump(&self) -> String {
        serde_json::to_string(&self.rooms).unwrap()
    }

    fn update_room(&mut self, room_id: usize) {
        let room = self.rooms.get(&room_id).unwrap();

        if room.started() {
            self.database.save_room(room_id, &room).unwrap();
        } else if room.finished() {
            self.database.delete_room(room_id).unwrap();
        }

        if room.finished() {
            self.rooms.remove(&room_id);
        }
    }

    pub fn on_message(&mut self, user_id: usize, msg: Msg) -> Result<Vec<(usize, Msg)>, Error> {
        match msg {
            Msg::GetGames => Ok(self.describe_games(user_id)),
            Msg::NewGame { nick } => self.new_game(user_id, nick),
            Msg::CancelNewGame => self.cancel_new_game(user_id),
            Msg::Join { nick, key } => self.join(user_id, nick, key),
            Msg::Rejoin { key } => self.rejoin(user_id, key),
            Msg::Hand { .. } | Msg::Discard { .. } => self.on_room_message(user_id, msg),
            _ => Err(LobbyError::UnrecognizedMessage.into()),
        }
    }

    fn describe_games(&self, user_id: usize) -> Vec<(usize, Msg)> {
        vec![(
            user_id,
            Msg::Games {
                games: self
                    .rooms
                    .values()
                    .filter_map(|room| room.describe())
                    .collect(),
            },
        )]
    }

    fn new_game(&mut self, user_id: usize, nick: String) -> Result<Vec<(usize, Msg)>, Error> {
        self.ensure_no_room(user_id)?;
        let room = Room::new(user_id, nick);
        let room_id = self.database.new_room(&room).unwrap();
        self.rooms.insert(room_id, room);
        self.user_to_room.insert(user_id, room_id);
        Ok(self.describe_games(user_id))
    }

    fn cancel_new_game(&mut self, user_id: usize) -> Result<Vec<(usize, Msg)>, Error> {
        let (room_id, room) = self.ensure_room_mut(user_id)?;
        room.disconnect(user_id);
        self.user_to_room.remove(&user_id);
        self.update_room(room_id);
        Ok(self.describe_games(user_id))
    }

    fn join(
        &mut self,
        user_id: usize,
        nick: String,
        key: String,
    ) -> Result<Vec<(usize, Msg)>, Error> {
        let found = self.rooms.iter_mut().find(|(_, room)| room.room_key == key);
        if let Some((room_id, room)) = found {
            let result = room.connect(user_id, nick)?;
            self.user_to_room.insert(user_id, *room_id);
            Ok(result)
        } else {
            Err(LobbyError::WrongKey.into())
        }
    }

    fn rejoin(&mut self, user_id: usize, key: String) -> Result<Vec<(usize, Msg)>, Error> {
        let found = self.rooms.iter_mut().find_map(|(room_id, room)| {
            for i in 0..2 {
                if room.player_keys[i] == key {
                    return Some((room_id, i, room));
                }
            }
            None
        });
        if let Some((room_id, i, room)) = found {
            let result = room.rejoin(user_id, i)?;
            self.user_to_room.insert(user_id, *room_id);
            Ok(result)
        } else {
            Err(LobbyError::WrongKey.into())
        }
    }

    fn on_room_message(&mut self, user_id: usize, msg: Msg) -> Result<Vec<(usize, Msg)>, Error> {
        let (room_id, room) = self.ensure_room_mut(user_id)?;
        let result = room.on_message(user_id, msg)?;
        self.update_room(room_id);
        Ok(result)
    }

    fn ensure_no_room(&self, user_id: usize) -> Result<(), Error> {
        if self.rooms.get(&user_id).is_some() {
            Err(LobbyError::AlreadyJoined.into())
        } else {
            Ok(())
        }
    }

    fn ensure_room_mut(&mut self, user_id: usize) -> Result<(usize, &mut Room), Error> {
        if let Some(room_id) = self.user_to_room.get(&user_id) {
            let room = self.rooms.get_mut(room_id).unwrap();
            Ok((*room_id, room))
        } else {
            Err(LobbyError::NotJoined.into())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::protocol::PGame;

    #[test]
    fn new_game_and_join() {
        let mut lobby = Lobby::new();
        lobby.next_user_id = 55;

        assert_eq!(lobby.connect(), 55);
        let messages = lobby
            .on_message(
                55,
                Msg::NewGame {
                    nick: "Akagi".to_owned(),
                },
            )
            .unwrap();
        assert_eq!(messages.len(), 1);
        assert!(matches!(messages[0], (55, Msg::Games { .. })));

        assert_eq!(lobby.connect(), 56);
        let messages = lobby.on_message(56, Msg::GetGames).unwrap();
        assert_eq!(messages.len(), 1);
        let key = match &messages[0] {
            (user_id, Msg::Games { games }) => {
                assert_eq!(*user_id, 56);
                assert_eq!(games.len(), 1);
                match &games[0] {
                    PGame::Player { nick, key } => {
                        assert_eq!(nick, "Akagi");
                        key.clone()
                    }
                    _ => unreachable!(),
                }
            }
            _ => unreachable!(),
        };

        let messages = lobby
            .on_message(
                56,
                Msg::Join {
                    nick: "Washizu".to_owned(),
                    key,
                },
            )
            .unwrap();
        assert_eq!(messages.len(), 6);
        assert!(matches!(messages[0], (55, Msg::Room { .. })));
        assert!(matches!(messages[1], (56, Msg::Room { .. })));
        assert!(matches!(messages[2], (55, Msg::PhaseOne { .. })));
        assert!(matches!(messages[3], (55, Msg::StartMove { .. })));
        assert!(matches!(messages[4], (56, Msg::PhaseOne { .. })));
        assert!(matches!(messages[5], (56, Msg::StartMove { .. })));

        let key = match &messages[1].1 {
            Msg::Room { key, .. } => key.clone(),
            _ => unreachable!(),
        };

        lobby.disconnect(56);
        assert_eq!(lobby.connect(), 57);
        let messages = lobby.on_message(57, Msg::Rejoin { key }).unwrap();
        assert_eq!(messages.len(), 4);
        assert!(matches!(messages[0], (57, Msg::Replay { .. })));
        assert!(matches!(messages[1], (57, Msg::Replay { .. })));
        assert!(matches!(messages[2], (57, Msg::Replay { .. })));
        assert!(matches!(messages[3], (57, Msg::Replay { .. })));
    }
}
