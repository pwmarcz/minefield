// use serde::ser::{Serialize, SerializeMap, SerializeSeq, Serializer};

use failure::{Error, Fail};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use minefield_core::tiles::Tile;
use minefield_core::yaku::Yaku;

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq)]
#[serde(tag = "type", content = "content")]
#[serde(rename_all = "snake_case")]
pub enum Msg {
    // client messages
    GetGames,
    NewGame(String),
    Rejoin(String),
    Join(String, String),
    CancelNewGame,
    Hand(Vec<Tile>),
    Discard(Tile),

    // server messages
    Games(Vec<Game>),
    Room {
        you: usize,
        nicks: [String; 2],
        key: String,
    },
    PhaseOne {
        tiles: Vec<Tile>,
        dora_ind: Tile,
        you: usize,
        east: usize,
    },
    PhaseTwo,
    Discarded {
        player: usize,
        tile: Tile,
    },
    Ron {
        hand: Vec<Tile>,
        tile: Tile,
        limit: usize,
        yaku: Vec<Yaku>,
        points: usize,
    },
    Draw,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq)]
pub struct Game {
    #[serde(rename = "type")]
    pub _type: String,
    pub nick: String,
    pub key: String,
}

#[derive(Debug, Fail)]
pub enum ProtocolError {
    #[fail(display = "invalid message")]
    BadMsg,
}

pub fn serialize_msg(msg: &Msg) -> Result<String, Error> {
    let value = serde_json::to_value(&msg)?;
    let type_str: String = serde_json::from_value(value["type"].clone())?;
    let content = value["content"].clone();
    let args_arr = match content {
        Value::Null => json!([]),
        Value::Array(values) if values.len() > 1 => Value::Array(values),
        _ => json!([content]),
    };
    let new_value = json!({
        "type": type_str,
        "args": args_arr,
    });

    let result = serde_json::to_string(&new_value)?;
    Ok(result)
}

pub fn deserialize_msg(data: &str) -> Result<Msg, Error> {
    let value: serde_json::Value = serde_json::from_str(data)?;
    let type_str: String = serde_json::from_value(value["type"].clone())?;
    let args: Vec<Value> = serde_json::from_value(value["args"].clone())?;
    let new_value = match args.len() {
        0 => json!({
            "type": type_str,
        }),
        1 => json!({
            "type": type_str,
            "content": args[0],
        }),
        _ => json!({
            "type": type_str,
            "content": Value::Array(args),
        }),
    };

    let result = serde_json::from_value(new_value)?;
    Ok(result)
}

#[cfg(test)]
mod test {
    use super::*;

    fn check(msg: Msg, text: &str) {
        assert_eq!(serialize_msg(&msg).unwrap(), text);
        assert_eq!(deserialize_msg(text).unwrap(), msg);
    }

    #[test]
    fn test_serialize_msg() {
        check(Msg::GetGames, r#"{"args":[],"type":"get_games"}"#);
        check(
            Msg::Games(vec![Game {
                _type: String::from("player"),
                nick: String::from("bot"),
                key: String::from("xxx"),
            }]),
            r#"{"args":[[{"key":"xxx","nick":"bot","type":"player"}]],"type":"games"}"#,
        );
        check(
            Msg::Join(String::from("bot"), String::from("xxx")),
            r#"{"args":["bot","xxx"],"type":"join"}"#,
        );
        check(
            Msg::Discard(Tile::X1),
            r#"{"args":["X1"],"type":"discard"}"#,
        )
    }
}
