use std::collections::HashMap;

use crate::game::Game;
use crate::protocol::Msg;

pub struct GameSet<T> {
    game_id_counter: usize,
    games: HashMap<usize, Game>,
    game_to_users: HashMap<usize, [Option<usize>; 2]>,
    game_to_meta: HashMap<usize, T>,
    users_to_game: HashMap<usize, (usize, usize)>,
}

impl<T> GameSet<T> {
    pub fn new() -> Self {
        GameSet {
            game_id_counter: 0,
            games: HashMap::new(),
            game_to_users: HashMap::new(),
            game_to_meta: HashMap::new(),
            users_to_game: HashMap::new(),
        }
    }

    pub fn new_game(&mut self, user_ids: &[usize; 2], meta: T) -> usize {
        let game = Game::new(&mut rand::thread_rng());

        let game_id = self.game_id_counter;
        self.game_id_counter += 1;
        self.games.insert(game_id, game);
        self.game_to_users
            .insert(game_id, [Some(user_ids[0]), Some(user_ids[1])]);
        self.game_to_meta.insert(game_id, meta);
        self.users_to_game.insert(user_ids[0], (game_id, 0));
        self.users_to_game.insert(user_ids[1], (game_id, 1));
        game_id
    }

    pub fn on_game_start(&mut self, game_id: usize) -> Vec<(usize, Msg)> {
        let game = self.games.get_mut(&game_id).unwrap();
        game.on_start();
        let messages = game.messages();
        self.translate_messages(messages, game_id)
    }

    pub fn beat(&mut self) -> Vec<(usize, Msg)> {
        let mut messages = vec![];
        let game_ids: Vec<usize> = self.games.keys().map(|k| *k).collect();
        for game_id in game_ids.iter() {
            let game = self.games.get_mut(&game_id).unwrap();
            game.beat();
            let game_messages = game.messages();
            messages.append(&mut self.translate_messages(game_messages, *game_id));
            self.remove_if_finished(*game_id);
        }

        messages
    }

    pub fn disconnect(&mut self, user_id: usize) {
        if let Some((game_id, i)) = self.users_to_game.get(&user_id).cloned() {
            let user_ids = self.game_to_users.get_mut(&game_id).unwrap();
            user_ids[i] = None;
            self.users_to_game.remove(&user_id);
        }
    }

    pub fn on_message(&mut self, user_id: usize, msg: Msg) -> Vec<(usize, Msg)> {
        if let Some((game_id, i)) = self.users_to_game.get(&user_id).cloned() {
            let game = self.games.get_mut(&game_id).unwrap();
            game.on_message(i, msg);
            let game_messages = game.messages();
            let messages = self.translate_messages(game_messages, game_id);
            self.remove_if_finished(game_id);
            messages
        } else {
            vec![]
        }
    }

    fn remove_if_finished(&mut self, game_id: usize) {
        let game = self.games.get(&game_id).unwrap();

        if game.finished {
            let user_ids = self.game_to_users.remove(&game_id).unwrap();
            if let Some(user_id) = user_ids[0] {
                self.users_to_game.remove(&user_id);
            }
            if let Some(user_id) = user_ids[1] {
                self.users_to_game.remove(&user_id);
            }

            self.games.remove(&game_id);
            self.game_to_meta.remove(&game_id);
        }
    }

    fn translate_messages(&self, messages: Vec<(usize, Msg)>, game_id: usize) -> Vec<(usize, Msg)> {
        let user_ids = self.game_to_users.get(&game_id).unwrap();
        messages
            .into_iter()
            .filter_map(|(i, msg)| match user_ids[i] {
                Some(user_id) => Some((user_id, msg)),
                None => None,
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use minefield_core::tiles::Tile;

    #[test]
    fn test_new_game() {
        let mut game_set = GameSet::<()>::new();
        let game_id = game_set.new_game(&[33, 55], ());
        let messages = game_set.on_game_start(game_id);
        assert_eq!(messages.len(), 4);
        // println!("{:?}", messages);
        assert!(matches!(messages[0], (33, Msg::PhaseOne { .. })));
        assert!(matches!(messages[1], (33, Msg::StartMove { .. })));
        assert!(matches!(messages[2], (55, Msg::PhaseOne { .. })));
        assert!(matches!(messages[3], (55, Msg::StartMove { .. })));

        assert_eq!(game_set.games.len(), 1);
        assert_eq!(game_set.users_to_game.len(), 2);
        assert_eq!(game_set.game_to_users.len(), 1);
        assert_eq!(game_set.game_to_meta.len(), 1);
    }

    #[test]
    fn test_on_message_abort() {
        let mut game_set = GameSet::<()>::new();
        let game_id = game_set.new_game(&[33, 55], ());
        game_set.on_game_start(game_id);

        let messages = game_set.on_message(55, Msg::Discard { tile: Tile::M1 });
        assert_eq!(messages.len(), 2);
        // println!("{:?}", messages);
        assert!(matches!(messages[0], (33, Msg::Abort { culprit: 1, .. })));
        assert!(matches!(messages[1], (55, Msg::Abort { culprit: 1, .. })));

        assert_eq!(game_set.games.len(), 0);
        assert_eq!(game_set.users_to_game.len(), 0);
        assert_eq!(game_set.game_to_users.len(), 0);
        assert_eq!(game_set.game_to_meta.len(), 0);
    }
}
