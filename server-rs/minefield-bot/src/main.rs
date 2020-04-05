extern crate clap;
extern crate env_logger;
extern crate failure;
extern crate failure_derive;
extern crate log;
extern crate serde_json;

extern crate minefield_core;
extern crate minefield_game;

mod bot;
mod comm;

use clap::{App, Arg};

fn main() {
    env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .init();

    let matches = App::new("Minefield Bot")
        .arg(
            Arg::with_name("server_url")
                .long("server-url")
                .takes_value(true),
        )
        .arg(Arg::with_name("nick").long("nick").takes_value(true))
        .arg(
            Arg::with_name("spawn")
                .long("spawn")
                .help("Keep spawning new bots after the existing one starts a game"),
        )
        .get_matches();

    let server_url = matches
        .value_of("server_url")
        .unwrap_or("ws://localhost:8080/ws");

    let nick = matches.value_of("nick").unwrap_or("RustBot");

    if matches.is_present("spawn") {
        bot::spawn_bots(server_url, nick).unwrap();
    } else {
        bot::run_bot(server_url, nick).unwrap();
    }
}
