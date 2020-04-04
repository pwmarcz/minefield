#![warn(clippy::all)]

extern crate env_logger;
extern crate log;

pub mod backtrack;
pub mod bot;
pub mod fu;
pub mod hand;
pub mod search;
pub mod tiles;
pub mod yaku;

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        assert_eq!(2 + 2, 4);
    }
}
