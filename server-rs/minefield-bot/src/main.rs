extern crate failure;
extern crate failure_derive;
extern crate minefield_core;
extern crate serde_json;

use failure::Error;
use websocket::client::sync::Client;
use websocket::sync::Stream;
use websocket::{ClientBuilder, Message, OwnedMessage};

mod protocol;

use protocol::Msg;

fn send_msg<S: Stream>(client: &mut Client<S>, msg: &Msg) -> Result<(), Error> {
    let data = protocol::serialize_msg(msg)?;
    client.send_message(&Message::text(data))?;
    Ok(())
}

fn recv_msg<S: Stream>(client: &mut Client<S>) -> Result<Msg, Error> {
    let message = client.recv_message()?;
    match message {
        OwnedMessage::Text(data) => protocol::deserialize_msg(&data),
        _ => Err(protocol::ProtocolError::BadMsg.into()),
    }
}

fn main() {
    let mut builder = ClientBuilder::new("ws://localhost:8080/ws").unwrap();

    let mut client = builder.connect(None).unwrap();
    send_msg(&mut client, &Msg::GetGames).unwrap();

    let msg = recv_msg(&mut client).unwrap();

    println!("message: {:?}", msg);
    println!("Hello, world!");
}
