use failure::{Error, Fail};
use websocket::client::sync::Client;
use websocket::sync::Stream;
use websocket::{Message, OwnedMessage};

use log::info;

use minefield_game::protocol::Msg;

#[derive(Debug, Fail)]
pub enum CommError {
    #[fail(display = "invalid message type")]
    InvalidMessageType,
    #[fail(display = "unexpected message")]
    UnexpectedMessage,
}

pub fn send_msg<S: Stream>(client: &mut Client<S>, msg: &Msg) -> Result<(), Error> {
    let data = serde_json::to_string(msg)?;

    info!("send: {:?}", msg);
    info!("send raw: {:}", data);

    client.send_message(&Message::text(data))?;
    Ok(())
}

pub fn recv_msg<S: Stream>(client: &mut Client<S>) -> Result<Msg, Error> {
    let message = client.recv_message()?;
    info!("recv raw: {:?}", message);

    let msg = match message {
        OwnedMessage::Text(data) => serde_json::from_str(&data)?,
        _ => {
            return Err(CommError::InvalidMessageType.into());
        }
    };
    info!("recv: {:?}", msg);
    Ok(msg)
}
