use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use failure::{Error, Fail};
use futures::stream::{SplitSink, SplitStream};
use futures::{SinkExt, StreamExt};
use hyper::upgrade::Upgraded;
use log::{error, info};
use serde_json;
use tokio::sync::mpsc::{unbounded_channel, UnboundedReceiver, UnboundedSender};
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::WebSocketStream;

use minefield_game::lobby::Lobby;

type Reader = SplitStream<WebSocketStream<Upgraded>>;
type Writer = SplitSink<WebSocketStream<Upgraded>, Message>;

pub struct GameServer {
    lobby: Arc<Mutex<Lobby>>,
    senders: Arc<Mutex<HashMap<usize, UnboundedSender<String>>>>,
}

impl Clone for GameServer {
    fn clone(&self) -> Self {
        GameServer {
            lobby: self.lobby.clone(),
            senders: self.senders.clone(),
        }
    }
}

use minefield_game::protocol::Msg;

#[derive(Debug, Fail)]
pub enum CommError {
    #[fail(display = "invalid message type")]
    InvalidMessageType,
}

impl GameServer {
    pub fn new() -> Self {
        let lobby = Lobby::new();
        GameServer {
            lobby: Arc::new(Mutex::new(lobby)),
            senders: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn connect(&self, reader: Reader, writer: Writer) {
        tokio::task::spawn(self.clone().handle_user(reader, writer));
        // self.streams.insert(0, stream);
    }

    pub fn start_beat(&self) {
        tokio::task::spawn(self.clone().run_beat());
    }

    fn lobby(&self) -> std::sync::MutexGuard<'_, Lobby> {
        self.lobby.lock().unwrap()
    }

    async fn handle_user(self, reader: Reader, writer: Writer) {
        let user_id = self.lobby().connect();

        let (sender, receiver) = unbounded_channel();
        self.senders.lock().unwrap().insert(user_id, sender);
        tokio::task::spawn(self.clone().write_messages(writer, receiver, user_id));

        info!("[{}] connect", user_id);
        if let Err(err) = self.read_messages(reader, user_id).await {
            error!("[{}] {}", user_id, err);
        }
        info!("[{}] disconnect", user_id);
        self.lobby().disconnect(user_id);
        self.senders.lock().unwrap().remove(&user_id);
    }

    async fn read_messages(&self, mut reader: Reader, user_id: usize) -> Result<(), Error> {
        while let Some(message) = reader.next().await {
            let message = message?;
            match message {
                Message::Text(text) => {
                    info!("[{}] recv {}", user_id, text);
                    let msg = serde_json::from_str(&text)?;
                    let messages = self.lobby().on_message(user_id, msg)?;
                    self.send_messages(messages)?;
                }
                Message::Close(_) => {
                    break;
                }
                _ => {
                    error!("[{}] ignoring unrecognized message: {:?}", user_id, message);
                    return Err(CommError::InvalidMessageType.into());
                }
            }
        }

        Ok(())
    }

    fn send_messages(&self, messages: Vec<(usize, Msg)>) -> Result<(), Error> {
        for (user_id, msg) in messages.into_iter() {
            let senders = self.senders.lock().unwrap();
            if let Some(sender) = senders.get(&user_id) {
                let text = serde_json::to_string(&msg)?;
                sender.send(text)?;
            }
        }
        Ok(())
    }

    async fn write_messages(
        self,
        mut writer: Writer,
        mut receiver: UnboundedReceiver<String>,
        user_id: usize,
    ) {
        while let Some(text) = receiver.next().await {
            info!("[{}] send {}", user_id, text);
            if let Err(err) = writer.send(Message::Text(text)).await {
                error!("[{}] send error: {:?}", user_id, err);
                break;
            }
        }
    }

    async fn run_beat(self) {
        loop {
            let now = tokio::time::Instant::now();
            let deadline = now + tokio::time::Duration::from_secs(1);
            if let Err(err) = self.beat() {
                error!("beat error: {:?}", err);
            }
            tokio::time::delay_until(deadline).await;
        }
    }

    fn beat(&self) -> Result<(), Error> {
        // info!("beat");
        let messages = self.lobby().beat();
        self.send_messages(messages)
    }
}
