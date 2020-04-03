use failure::{Error, Fail};
use websocket::client::sync::Client;
use websocket::sync::Stream;
use websocket::{Message, OwnedMessage};

use log::info;

use crate::protocol::{deserialize_msg, serialize_msg, Msg};

#[derive(Debug, Fail)]
pub enum CommError {
    #[fail(display = "invalid message type")]
    InvalidMessageType,
    #[fail(display = "unexpected message")]
    UnexpectedMessage,
}

pub fn send_msg<S: Stream>(client: &mut Client<S>, msg: &Msg) -> Result<(), Error> {
    let data = serialize_msg(msg)?;

    info!("send: {:?}", msg);
    info!("send raw: {:}", data);

    client.send_message(&Message::text(data))?;
    Ok(())
}

pub fn recv_msg<S: Stream>(client: &mut Client<S>) -> Result<Msg, Error> {
    let message = client.recv_message()?;
    info!("recv raw: {:?}", message);

    let msg = match message {
        OwnedMessage::Text(data) => deserialize_msg(&data)?,
        _ => {
            return Err(CommError::InvalidMessageType.into());
        }
    };
    info!("recv: {:?}", msg);
    Ok(msg)
}
