#![warn(clippy::all)]

extern crate num_enum;

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
