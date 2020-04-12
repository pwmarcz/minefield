use std::thread;

use failure::Error;
use log::{error, info};
use rand_distr::{Distribution, Normal};
use websocket::ClientBuilder;

use minefield_core::bot::Bot;
use minefield_core::tiles::Tile;
use minefield_game::protocol::{MoveType, Msg};

use crate::comm;

type Client =
    websocket::client::sync::Client<Box<dyn websocket::sync::stream::NetworkStream + Send>>;

pub fn run_bot(url: &str, nick: &str) -> Result<(), Error> {
    let (client, bot, you) = connect(url, nick)?;
    play(client, bot, you)
}

pub fn spawn_bots(url: &str, nick: &str) -> Result<(), Error> {
    loop {
        let (client, bot, you) = connect(url, nick)?;
        thread::spawn(move || {
            play(client, bot, you).unwrap();
        });
    }
}

pub fn connect(url: &str, nick: &str) -> Result<(Client, Bot, usize), Error> {
    let mut builder = ClientBuilder::new(url)?;
    let mut client = builder.connect(None)?;

    comm::send_msg(
        &mut client,
        &Msg::NewGame {
            nick: nick.to_owned(),
        },
    )?;

    loop {
        match comm::recv_msg(&mut client)? {
            Msg::Room { .. } | Msg::Games { .. } => (),

            Msg::PhaseOne {
                tiles,
                dora_ind,
                you,
                east,
            } => {
                let player_wind = if you == east { Tile::X1 } else { Tile::X3 };
                let bot = Bot::new(&tiles, dora_ind, player_wind);
                return Ok((client, bot, you));
            }
            msg => {
                error!("unknown message {:?}", msg);
                return Err(comm::CommError::UnexpectedMessage.into());
            }
        }
    }
}

fn play(mut client: Client, mut bot: Bot, you: usize) -> Result<(), Error> {
    let mut rng = rand::thread_rng();

    loop {
        match comm::recv_msg(&mut client)? {
            Msg::StartMove { move_type, .. } => match move_type {
                MoveType::Hand => {
                    info!("looking for tenpai...");
                    let hand = bot.choose_hand();
                    comm::send_msg(&mut client, &Msg::Hand { hand })?;
                }

                MoveType::Discard => {
                    let delay_s: f32 = Normal::new(2.0, 1.0).unwrap().sample(&mut rng);
                    let delay_ms: u64 = (delay_s.max(0.0).min(8.0) * 1000.0) as u64;
                    std::thread::sleep(std::time::Duration::from_millis(delay_ms));

                    let tile = bot.choose_discard();
                    comm::send_msg(&mut client, &Msg::Discard { tile })?;
                }
            },
            Msg::Hand { .. } => {}
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
