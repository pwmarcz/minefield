extern crate env_logger;
extern crate failure;
extern crate hyper;
extern crate hyper_staticfile;
extern crate log;
extern crate tokio;

use clap::{App, Arg};
use std::net::SocketAddr;

mod server;

#[tokio::main]
async fn main() {
    env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .init();

    let matches = App::new("Minefield Bot")
        .arg(
            Arg::with_name("host")
                .long("host")
                .takes_value(true)
                .default_value("127.0.0.1"),
        )
        .arg(
            Arg::with_name("port")
                .long("port")
                .takes_value(true)
                .default_value("8000"),
        )
        .arg(
            Arg::with_name("static_path")
                .long("static-path")
                .takes_value(true),
        )
        .get_matches();

    let host = matches
        .value_of("host")
        .unwrap()
        .parse()
        .expect("error parsing host");
    let port = matches
        .value_of("port")
        .unwrap()
        .parse()
        .expect("error parsing port");
    let addr = SocketAddr::new(host, port);

    let static_path = matches.value_of("static_path");

    server::start_server(&addr, &static_path).await;
}
