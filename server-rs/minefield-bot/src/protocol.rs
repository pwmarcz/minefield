// use serde::ser::{Serialize, SerializeMap, SerializeSeq, Serializer};

use failure::{Error, Fail};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq)]
#[serde(tag = "type", content = "content")]
#[serde(rename_all = "snake_case")]
pub enum Msg {
    GetGames,
    Games(Vec<Game>),
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
    let args_arr = if content == Value::Null {
        json!([])
    } else {
        json!([content])
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
        0 => Ok(json!({
            "type": type_str,
        })),
        1 => Ok(json!({
            "type": type_str,
            "content": args[0],
        })),
        _ => Err(ProtocolError::BadMsg),
    }?;

    let result = serde_json::from_value(new_value)?;
    Ok(result)
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_serialize_msg() {
        assert_eq!(
            serialize_msg(&Msg::GetGames).unwrap(),
            r#"{"args":[],"type":"get_games"}"#
        );
        assert_eq!(
            serialize_msg(&Msg::Games(vec![Game {
                _type: String::from("player"),
                nick: String::from("bot"),
                key: String::from("xxx"),
            }]))
            .unwrap(),
            r#"{"args":[[{"key":"xxx","nick":"bot","type":"player"}]],"type":"games"}"#
        );
    }

    #[test]
    fn test_deserialize_msg() {
        assert_eq!(
            deserialize_msg(r#"{"args":[],"type":"get_games"}"#).unwrap(),
            Msg::GetGames
        );
        assert_eq!(
            deserialize_msg(
                r#"{"args":[[{"key":"xxx","nick":"bot","type":"player"}]],"type":"games"}"#
            )
            .unwrap(),
            Msg::Games(vec![Game {
                _type: String::from("player"),
                nick: String::from("bot"),
                key: String::from("xxx"),
            }])
        );
    }
}
