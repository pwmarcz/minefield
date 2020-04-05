use crate::tiles::{Tile, TileSet};

pub struct Backtrack {
    pub tiles: TileSet,
    pub stack: Vec<Vec<Tile>>,
    pub remaining: usize,
}

pub trait BacktrackStrategy {
    type Item;

    fn generate(&self, bt: &Backtrack) -> Vec<Vec<Tile>>;
    fn check(&self, bt: &Backtrack) -> Vec<Self::Item>;
}

impl Backtrack {
    pub fn from_tiles(tiles: &[Tile], remaining: usize) -> Self {
        Backtrack {
            tiles: TileSet::from_tiles(tiles),
            stack: vec![],
            remaining,
        }
    }

    pub fn run<T>(&mut self, strategy: &impl BacktrackStrategy<Item = T>) -> Vec<T> {
        let mut results = vec![];
        self.go(strategy, &mut results);
        results
    }

    pub fn go<T>(&mut self, strategy: &impl BacktrackStrategy<Item = T>, results: &mut Vec<T>) {
        if self.remaining == 0 {
            results.append(&mut strategy.check(self));
            return;
        }
        let parts = strategy.generate(self);
        for part in parts.iter() {
            self.tiles.add_all(part, -1);
            self.stack.push(part.clone());
            self.remaining -= part.len();
            self.go(strategy, results);
            self.remaining += part.len();
            self.stack.pop();
            self.tiles.add_all(part, 1);
        }
    }

    pub fn find_groups(&self) -> Vec<Vec<Tile>> {
        let mut result = vec![];
        for t in self.tiles.distinct() {
            if self.tiles.get(t) >= 3 {
                result.push(vec![t, t, t]);
            }
            if t.has_next() && t.next().has_next() {
                let t2 = t.next();
                let t3 = t2.next();
                if self.tiles.get(t2) >= 1 && self.tiles.get(t3) >= 1 {
                    result.push(vec![t, t2, t3]);
                }
            }
        }
        result.sort();
        result
    }

    pub fn find_pairs(&self) -> Vec<Vec<Tile>> {
        let mut result = vec![];
        for t in self.tiles.distinct() {
            if self.tiles.get(t) >= 2 {
                result.push(vec![t, t]);
            }
        }
        result.sort();
        result
    }

    pub fn find_single(&self) -> Vec<Vec<Tile>> {
        let mut result = vec![];
        for t in self.tiles.distinct() {
            result.push(vec![t]);
        }
        result.sort();
        result
    }

    pub fn find_incomplete_groups(&self) -> Vec<Vec<Tile>> {
        let mut result = vec![];
        for t in self.tiles.distinct() {
            if self.tiles.get(t) >= 2 {
                result.push(vec![t, t]);
            }
            if t.has_next() {
                let t2 = t.next();
                if self.tiles.get(t2) >= 1 {
                    result.push(vec![t, t2]);
                }
                if t2.has_next() {
                    let t3 = t2.next();
                    if self.tiles.get(t3) >= 1 {
                        result.push(vec![t, t3]);
                    }
                }
            }
        }
        result.sort();
        result
    }

    pub fn filter(&self, mut parts: Vec<Vec<Tile>>) -> Vec<Vec<Tile>> {
        if let Some(last_part) = self.stack.last() {
            parts.retain(|part| part >= last_part);
        }
        parts
    }
}
