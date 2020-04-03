use failure::Error;
use log::{error, info, warn};
use websocket::client::sync::Client;
use websocket::sync::Stream;
use websocket::ClientBuilder;

use minefield_core::bot::find_best_tenpai;
use minefield_core::tiles::{Tile, TileSet};

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
            } => return play(client, tiles, dora_ind, you, east),
            msg => {
                error!("unknown message {:?}", msg);
                return Err(comm::CommError::UnexpectedMessage.into());
            }
        }
    }
}

fn play<S: Stream>(
    mut client: Client<S>,
    tiles: Vec<Tile>,
    dora_ind: Tile,
    you: usize,
    east: usize,
) -> Result<(), Error> {
    let dora = dora_ind.next_wrap();
    let player_wind = if you == east { Tile::X1 } else { Tile::X3 };
    let mut tile_set = TileSet::make(&tiles);

    loop {
        match comm::recv_msg(&mut client)? {
            Msg::StartMove { type_, .. } => match type_ {
                MoveType::Hand => {
                    info!("looking for tenpai...");
                    let hand = match find_best_tenpai(&tiles, dora, player_wind) {
                        Some(hand) => hand,
                        None => {
                            warn!("no tenpai!");
                            tiles[..13].to_vec()
                        }
                    };
                    tile_set.add_all(&hand, -1);
                    comm::send_msg(&mut client, &Msg::Hand(hand))?;
                }

                MoveType::Discard => {
                    // TODO choose discard
                    let first_tile = tile_set.distinct().next().unwrap();
                    tile_set.add(first_tile, -1);
                    comm::send_msg(&mut client, &Msg::Discard(first_tile))?;
                }
            },
            Msg::Hand(_) => {}
            Msg::EndMove => {}
            Msg::WaitForPhaseTwo => {}
            Msg::PhaseTwo => {}
            // TODO record discard
            Msg::Discarded { .. } => {}

            Msg::Ron { .. } | Msg::Draw { .. } | Msg::Abort { .. } => return Ok(()),

            msg => {
                error!("unknown message {:?}", msg);
                return Err(comm::CommError::UnexpectedMessage.into());
            }
        }
    }
}
