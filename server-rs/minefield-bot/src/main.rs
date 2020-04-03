extern crate env_logger;
extern crate failure;
extern crate failure_derive;
extern crate log;
extern crate minefield_core;
extern crate serde_json;

mod bot;
mod comm;
mod protocol;

fn main() {
    env_logger::builder()
        .filter_level(log::LevelFilter::Info)
        .init();
    bot::run_bot("ws://localhost:8080/ws", "RustBot").unwrap();
}
