extern crate minefield_core;
extern crate serde_json;

mod protocol;

use protocol::{Game, Msg};

use websocket::{ClientBuilder, Message};

fn main() {
    let mut builder = ClientBuilder::new("ws://localhost:8080/ws").unwrap();

    let get_games = serde_json::to_string(&Msg::GetGames).unwrap();
    println!("{:?}", get_games);

    let games = serde_json::to_string(&Msg::Games(vec![Game {
        _type: String::from("player"),
        nick: String::from("bot"),
        key: String::from("xxx"),
    }]))
    .unwrap();
    println!("{:?}", games);

    let mut client = builder.connect(None).unwrap();
    client
        .send_message(&Message::text("{\"type\": \"get_games\", \"args\": []}"))
        .unwrap();

    let message = client.recv_message().unwrap();

    println!("message: {:?}", message);
    println!("Hello, world!");
}
