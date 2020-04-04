use failure::Error;
use log::{error, info};
use websocket::client::sync::Client;
use websocket::sync::Stream;
use websocket::ClientBuilder;

use minefield_core::bot::Bot;
use minefield_core::tiles::Tile;

use crate::comm;
use crate::protocol::{MoveType, Msg};

pub fn run_bot(url: &str, nick: &str) -> Result<(), Error> {
    let mut builder = ClientBuilder::new(url)?;
    let mut client = builder.connect(None)?;

    comm::send_msg(&mut client, &Msg::NewGame(nick.to_owned()))?;

    loop {
        match comm::recv_msg(&mut client)? {
            Msg::Room { .. } => (),

            Msg::PhaseOne {
                tiles,
                dora_ind,
                you,
                east,
            } => {
                let player_wind = if you == east { Tile::X1 } else { Tile::X3 };
                let bot = Bot::new(&tiles, dora_ind, player_wind);
                return play(client, bot, you);
            }
            msg => {
                error!("unknown message {:?}", msg);
                return Err(comm::CommError::UnexpectedMessage.into());
            }
        }
    }
}

fn play<S: Stream>(mut client: Client<S>, mut bot: Bot, you: usize) -> Result<(), Error> {
    loop {
        match comm::recv_msg(&mut client)? {
            Msg::StartMove { type_, .. } => match type_ {
                MoveType::Hand => {
                    info!("looking for tenpai...");
                    let hand = bot.choose_hand();
                    comm::send_msg(&mut client, &Msg::Hand(hand))?;
                }

                MoveType::Discard => {
                    let tile = bot.choose_discard();
                    comm::send_msg(&mut client, &Msg::Discard(tile))?;
                }
            },
            Msg::Hand(_) => {}
            Msg::EndMove => {}
            Msg::WaitForPhaseTwo => {}
            Msg::PhaseTwo => {}

            Msg::Discarded { player, tile } => {
                if player != you {
                    bot.opponent_discard(tile);
                }
            }

            Msg::Ron { .. } | Msg::Draw { .. } | Msg::Abort { .. } => return Ok(()),

            msg => {
                error!("unknown message {:?}", msg);
                return Err(comm::CommError::UnexpectedMessage.into());
            }
        }
    }
}
