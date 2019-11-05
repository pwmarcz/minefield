#![warn(clippy::all)]

extern crate num_enum;

pub mod tiles;
pub mod hand;
pub mod search;

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
        assert_eq!(2 + 2, 4);
    }
}
