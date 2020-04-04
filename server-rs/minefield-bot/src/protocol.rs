// use serde::ser::{Serialize, SerializeMap, SerializeSeq, Serializer};

use serde::{Deserialize, Serialize};

use minefield_core::tiles::Tile;
use minefield_core::yaku::Yaku;

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq)]
#[serde(tag = "type")]
#[serde(rename_all = "snake_case")]
pub enum Msg {
    // client messages
    GetGames,
    NewGame {
        nick: String,
    },
    Rejoin {
        key: String,
    },
    Join {
        nick: String,
        key: String,
    },
    CancelNewGame,
    Hand {
        hand: Vec<Tile>,
    },
    Discard {
        tile: Tile,
    },

    // server messages
    Games {
        games: Vec<Game>,
    },
    Room {
        you: usize,
        nicks: [String; 2],
        key: String,
    },
    StartMove {
        move_type: MoveType,
        time_limit: usize,
    },
    EndMove,
    PhaseOne {
        tiles: Vec<Tile>,
        dora_ind: Tile,
        you: usize,
        east: usize,
    },
    WaitForPhaseTwo,
    PhaseTwo,
    Discarded {
        player: usize,
        tile: Tile,
    },
    Ron {
        player: usize,
        hand: Vec<Tile>,
        tile: Tile,
        limit: usize,
        yaku: Vec<Yaku>,
        points: usize,
    },
    Draw,
    Abort {
        description: String,
    },
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MoveType {
    Hand,
    Discard,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq)]
pub struct Game {
    #[serde(rename = "type")]
    pub type_: String,
    pub nick: String,
    pub key: String,
}

#[cfg(test)]
mod test {
    use super::*;

    fn check(msg: Msg, text: &str) {
        assert_eq!(serde_json::to_string(&msg).unwrap(), text);
        assert_eq!(serde_json::from_str::<Msg>(text).unwrap(), msg);
    }

    #[test]
    fn test_serialize_msg() {
        check(Msg::GetGames, r#"{"type":"get_games"}"#);
        check(
            Msg::Games {
                games: vec![Game {
                    type_: String::from("player"),
                    nick: String::from("bot"),
                    key: String::from("xxx"),
                }],
            },
            r#"{"type":"games","games":[{"type":"player","nick":"bot","key":"xxx"}]}"#,
        );
        check(
            Msg::Join {
                nick: String::from("bot"),
                key: String::from("xxx"),
            },
            r#"{"type":"join","nick":"bot","key":"xxx"}"#,
        );
        check(
            Msg::Discard { tile: Tile::X1 },
            r#"{"type":"discard","tile":"X1"}"#,
        )
    }
}
