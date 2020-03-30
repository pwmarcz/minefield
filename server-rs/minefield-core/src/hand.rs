use crate::tiles::{Suit, Tile};

#[derive(Debug, Copy, Clone, PartialEq, PartialOrd, Eq, Ord)]
pub enum Group {
    Pon(Tile),
    Chi(Tile),
}

use Group::*;

impl Group {
    pub fn is_chi(self) -> bool {
        match self {
            Chi(_) => true,
            _ => false,
        }
    }

    pub fn is_pon(self) -> bool {
        match self {
            Pon(_) => true,
            _ => false,
        }
    }

    pub fn has_yaochu(self) -> bool {
        use Tile::*;
        match self {
            Pon(t) => t.is_yaochu(),
            Chi(t) => !((M2 <= t && t <= M6) || (P2 <= t && t <= P6) || (S2 <= t && t <= S6)),
        }
    }

    pub fn has_terminal(self) -> bool {
        use Tile::*;
        match self {
            Pon(t) => t.is_terminal(),
            Chi(t) => !((M2 <= t && t <= M6) || (P2 <= t && t <= P6) || (S2 <= t && t <= S6)),
        }
    }

    pub fn has_honor(self) -> bool {
        match self {
            Pon(t) => t.is_honor(),
            Chi(_) => false,
        }
    }

    pub fn suit(self) -> Suit {
        match self {
            Pon(t) => t.suit(),
            Chi(t) => t.suit(),
        }
    }

    pub fn add_to(self, tiles: &mut Vec<Tile>) {
        match self {
            Pon(t) => {
                tiles.push(t);
                tiles.push(t);
                tiles.push(t);
            }
            Chi(t) => {
                tiles.push(t);
                tiles.push(t.next());
                tiles.push(t.next().next());
            }
        }
    }

    pub fn is_open_wait(self, wait: Tile) -> bool {
        use Tile::*;
        match self {
            Pon(_) => false,
            Chi(t) => {
                (wait == t && t != M7 && t != P7 && t != S7)
                    || (wait == t.next().next() && t != M1 && t != P1 && t != S1)
            }
        }
    }
}

#[derive(Debug, PartialEq, PartialOrd, Eq, Ord)]
pub enum Hand {
    // pair, groups, wait, group_num
    Normal(Tile, [Group; 4], Tile, Option<u8>),
    // pair, groups, wait
    Pairs([Tile; 7], Tile),
    // double, wait
    Kokushi(Tile, Tile),
}

#[derive(Debug, Copy, Clone, PartialEq, PartialOrd, Eq, Ord)]
pub enum Yaku {
    // 1
    Pinfu,
    Iipeiko,
    Tanyao,
    Wind,
    Haku,
    Hatsu,
    Chun,
    // 2
    Sanshokudojun,
    Sanshokudoko,
    Itsuu,
    Chitoitsu,
    Chanta,
    Honroto,
    Toitoi,
    Sananko,
    Shosangen,
    // 3
    Ryanpeiko,
    Junchan,
    Honitsu,
    // 6
    Chinitsu,
    // yakuman
    Daisangen,
    Kokushi,
    Suuanko,
    Suushi,
    Chinroto,
    Tsuuiiso,
    Ryuuiiso,
    Chuuren,
    // special
    Ippatsu,
    Hotei,
}

impl Yaku {
    pub fn fan(self) -> usize {
        use Yaku::*;
        match self {
            Pinfu | Iipeiko | Tanyao | Wind | Haku | Hatsu | Chun => 1,
            Sanshokudojun | Sanshokudoko | Itsuu | Chitoitsu | Chanta | Honroto | Toitoi
            | Sananko | Shosangen => 2,
            Ryanpeiko | Junchan | Honitsu => 3,
            Chinitsu => 6,
            Daisangen | Kokushi | Suuanko | Suushi | Chinroto | Tsuuiiso | Ryuuiiso | Chuuren => 13,
            Ippatsu | Hotei => 1,
        }
    }
}

impl Hand {
    pub fn yaku(&self, player_wind: Tile) -> Vec<Yaku> {
        yaku::find_all(self, player_wind)
    }

    pub fn fu(&self, player_wind: Tile) -> usize {
        match self {
            Hand::Normal(pair, groups, wait, wait_type) => {
                let wait_group = wait_type.map(|i| groups[i as usize]);
                let is_open_wait = wait_group.map_or(false, |g| g.is_open_wait(*wait));

                // pinfu
                if groups.iter().all(|g| g.is_chi())
                    && !pair.is_yakuhai(player_wind)
                    && is_open_wait
                {
                    return 30;
                }

                let mut fu = 30;

                if pair.is_yakuhai(player_wind) {
                    fu += 2;
                }
                if !wait_group.map_or(false, |g| g.is_pon()) && !is_open_wait {
                    fu += 2;
                }
                for group in groups.iter() {
                    if let Pon(tile) = group {
                        let mut p = 2;
                        if tile.is_yaochu() {
                            p *= 2;
                        }
                        // Closed pon
                        if !wait_group.map_or(false, |g| g == *group) {
                            p *= 2;
                        }
                        fu += p;
                    }
                }

                (fu + 9) / 10 * 10
            }
            Hand::Pairs(_, _) => 25,
            Hand::Kokushi(_, _) => 30,
        }
    }

    pub fn suits(&self) -> u8 {
        let mut result = 0;
        match self {
            Hand::Normal(pair, groups, _, _) => {
                result |= pair.suit() as u8;
                for group in groups.iter() {
                    result |= group.suit() as u8;
                }
            }
            Hand::Pairs(pairs, _) => {
                for pair in pairs.iter() {
                    result |= pair.suit() as u8;
                }
            }
            Hand::Kokushi(_, _) => {
                result = Suit::Man as u8 | Suit::Pin as u8 | Suit::Sou as u8 | Suit::Honor as u8;
            }
        }
        result
    }

    pub fn tiles(&self) -> Vec<Tile> {
        let mut result: Vec<Tile> = vec![];
        match self {
            Hand::Normal(pair, groups, _, _) => {
                // Gather all tiles
                result.push(*pair);
                result.push(*pair);
                for g in groups.iter() {
                    g.add_to(&mut result);
                }
            }
            Hand::Pairs(pairs, _) => {
                for pair in pairs.iter() {
                    result.push(*pair);
                    result.push(*pair);
                }
            }
            Hand::Kokushi(double, _) => {
                for t in Tile::all() {
                    if t.is_yaochu() {
                        result.push(t);
                    }
                }
                result.push(*double);
            }
        }
        result.sort();
        result
    }
}

mod yaku {
    use super::*;

    pub fn find_all(hand: &Hand, player_wind: Tile) -> Vec<Yaku> {
        use Tile::*;

        let wind = X1; // TODO

        let mut result = vec![];

        let suits = hand.suits();
        let tiles = hand.tiles();

        if let Some(yaku) = pure_yaku(suits, &tiles) {
            result.push(yaku);
        }

        if tiles.iter().all(|t| t.is_green()) {
            result.push(Yaku::Ryuuiiso);
        }

        match hand {
            Hand::Normal(pair, groups, wait, wait_type) => {
                let mut pon_count = 0;
                for group in groups.iter() {
                    if group.is_pon() {
                        pon_count += 1;
                    }
                }

                let wait_group = wait_type.map(|i| groups[i as usize]);

                if groups[0] == groups[1] && groups[2] == groups[3] {
                    result.push(Yaku::Ryanpeiko);
                } else if groups[0] == groups[1] || groups[1] == groups[2] || groups[2] == groups[3]
                {
                    result.push(Yaku::Iipeiko);
                }

                if pon_count == 0
                    && !pair.is_yakuhai(player_wind)
                    && wait_group.map_or(false, |g| g.is_open_wait(*wait))
                {
                    result.push(Yaku::Pinfu);
                }

                if pon_count == 4 {
                    result.push(Yaku::Toitoi);
                    if wait_type.is_none() {
                        result.push(Yaku::Suuanko);
                    } else {
                        result.push(Yaku::Sananko);
                    }
                }

                if pon_count == 3 && wait_group.map_or(true, |g| g.is_chi()) {
                    result.push(Yaku::Sananko);
                }

                if sanshokudojun(*groups) {
                    result.push(Yaku::Sanshokudojun);
                }
                if sanshokudoko(*groups) {
                    result.push(Yaku::Sanshokudoko);
                }
                if itsuu(*groups) {
                    result.push(Yaku::Itsuu);
                }

                // TODO wind
                if pon(*groups, wind) {
                    result.push(Yaku::Wind);
                }
                if pon(*groups, X5) {
                    result.push(Yaku::Haku);
                }
                if pon(*groups, X6) {
                    result.push(Yaku::Hatsu);
                }
                if pon(*groups, X7) {
                    result.push(Yaku::Chun);
                }
                if pon(*groups, X5) && pon(*groups, X6) && pon(*groups, X7) {
                    result.push(Yaku::Daisangen);
                } else if find(&tiles, X5) && find(&tiles, X6) && find(&tiles, X7) {
                    result.push(Yaku::Shosangen);
                }

                if find(&tiles, X1) && find(&tiles, X2) && find(&tiles, X3) && find(&tiles, X4) {
                    result.push(Yaku::Suushi);
                }

                if groups.iter().any(|g| g.is_chi()) {
                    if pair.is_terminal() && groups.iter().all(|g| g.has_terminal()) {
                        result.push(Yaku::Junchan);
                    } else if pair.is_yaochu() && groups.iter().all(|g| g.has_yaochu()) {
                        result.push(Yaku::Chanta);
                    }
                }

                if chuuren(suits, &tiles) {
                    result.push(Yaku::Chuuren);
                }
            }
            Hand::Pairs(_, _) => {
                result.push(Yaku::Chitoitsu);
            }
            Hand::Kokushi(_, _) => {
                result.push(Yaku::Kokushi);
            }
        }

        result.sort();

        if result.iter().any(|y| y.fan() == 13) {
            let yakumans: Vec<Yaku> = result.into_iter().filter(|y| y.fan() == 13).collect();
            return yakumans;
        }

        result
    }

    fn pure_yaku(suits: u8, tiles: &[Tile]) -> Option<Yaku> {
        if tiles.iter().all(|t| !t.is_yaochu()) {
            return Some(Yaku::Tanyao);
        } else if tiles.iter().all(|t| t.is_terminal()) {
            return Some(Yaku::Chinroto);
        } else if tiles.iter().all(|t| t.is_honor()) {
            return Some(Yaku::Tsuuiiso);
        } else if tiles.iter().all(|t| t.is_yaochu()) {
            return Some(Yaku::Honroto);
        }

        match suits {
            2 | 4 | 8 => Some(Yaku::Chinitsu),
            3 | 5 | 9 => Some(Yaku::Honitsu),
            _ => None,
        }
    }

    fn pon(groups: [Group; 4], tile: Tile) -> bool {
        for &group in groups.iter() {
            match group {
                Pon(t) if t == tile => return true,
                _ => (),
            }
        }
        false
    }

    fn find(tiles: &[Tile], tile: Tile) -> bool {
        tiles.binary_search(&tile).is_ok()
    }

    fn three<F>(groups: [Group; 4], f: F) -> bool
    where
        F: Fn(Group, Group, Group) -> bool,
    {
        f(groups[0], groups[1], groups[2])
            || f(groups[0], groups[1], groups[3])
            || f(groups[0], groups[2], groups[2])
            || f(groups[1], groups[2], groups[3])
    }

    fn sanshokudojun(groups: [Group; 4]) -> bool {
        three(groups, |g1, g2, g3| match (g1, g2, g3) {
            (Chi(t1), Chi(t2), Chi(t3)) => Tile::sanshoku(t1, t2, t3),
            _ => false,
        })
    }

    fn sanshokudoko(groups: [Group; 4]) -> bool {
        three(groups, |g1, g2, g3| match (g1, g2, g3) {
            (Pon(t1), Pon(t2), Pon(t3)) => Tile::sanshoku(t1, t2, t3),
            _ => false,
        })
    }

    fn itsuu(groups: [Group; 4]) -> bool {
        three(groups, |g1, g2, g3| match (g1, g2, g3) {
            (Chi(t1), Chi(t2), Chi(t3)) => Tile::itsuu(t1, t2, t3),
            _ => false,
        })
    }

    fn chuuren(suits: u8, tiles: &[Tile]) -> bool {
        // Needs to be all in the same (number) suit
        if !(suits == 2 || suits == 4 || suits == 8) {
            return false;
        }

        // First 3 the same and terminal
        if !(tiles[0].is_terminal() && tiles[0] == tiles[1] && tiles[1] == tiles[2]) {
            return false;
        }

        // Last 3 the same and terminal
        if !(tiles[tiles.len() - 1].is_terminal()
            && tiles[tiles.len() - 1] == tiles[tiles.len() - 2]
            && tiles[tiles.len() - 2] == tiles[tiles.len() - 3])
        {
            return false;
        }

        // No gaps
        for i in 1..tiles.len() {
            if tiles[i - 1].has_next() && tiles[i - 1].next() < tiles[i] {
                return false;
            }
        }
        true
    }
}

#[cfg(test)]
mod tests {
    use super::Yaku::*;
    use super::*;
    use crate::search::Search;
    use crate::tiles::Tile::*;

    fn assert_yaku(tiles: &[Tile; 14], wait: Tile, expected: Vec<Vec<Yaku>>) {
        let player_wind = X1;
        let mut search = Search::from_tiles(tiles, wait);
        let mut result = vec![];

        println!("tiles: {:?}", tiles);
        for hand in search.find_all().iter() {
            println!("hand: {:?}", hand);
            result.push(hand.yaku(player_wind));
        }
        assert_eq!(result, expected);
    }

    fn assert_fu(tiles: &[Tile; 14], wait: Tile, expected: &[usize]) {
        let player_wind = X1;
        let mut search = Search::from_tiles(tiles, wait);
        let mut result = vec![];

        println!("tiles: {:?}", tiles);
        for hand in search.find_all().iter() {
            println!("hand: {:?}", hand);
            result.push(hand.fu(player_wind));
        }
        assert_eq!(result, expected);
    }

    #[test]
    fn test_yaku() {
        assert_yaku(
            &[M2, M2, M3, M3, M4, M4, P2, P3, P4, P7, P7, P7, S2, S2],
            M3,
            vec![vec![Iipeiko, Tanyao]],
        );
        assert_yaku(
            &[M1, M2, M3, M4, M5, M6, M6, M7, M8, P2, P2, P2, X1, X1],
            M1,
            vec![vec![]],
        );
        // fake pinfu
        assert_yaku(
            &[M1, M2, M3, M4, M5, M6, M6, M7, M8, P2, P3, P4, X2, X2],
            M3,
            vec![vec![]],
        );
        assert_yaku(
            &[M1, M1, M1, M1, M2, M2, M2, M2, M3, M3, M3, M3, M9, M9],
            M1,
            vec![
                vec![Chinitsu],
                vec![Sananko, Chinitsu],
                vec![Pinfu, Ryanpeiko, Junchan, Chinitsu],
            ],
        );
        assert_yaku(
            &[M1, M2, M2, M3, M3, M3, M3, M4, M4, M4, M5, M5, M6, M6],
            M1,
            vec![
                vec![Pinfu, Iipeiko, Chinitsu],
                vec![Pinfu, Iipeiko, Chinitsu],
            ],
        );
        assert_yaku(
            &[M1, M1, M2, M2, M3, M3, M7, M7, M8, M8, M9, M9, X5, X5],
            M3,
            vec![vec![Chanta, Ryanpeiko, Honitsu], vec![Chitoitsu, Honitsu]],
        );
    }

    #[test]
    fn test_pinfu() {
        assert_yaku(
            &[M1, M1, M1, M2, M3, M4, M5, M6, M6, M7, M8, P2, P3, P4],
            M1,
            vec![vec![], vec![Pinfu]],
        );
        assert_yaku(
            &[M1, M2, M3, M4, M5, M6, M6, M7, M8, P2, P3, P4, X1, X1],
            M1,
            vec![vec![]],
        );
        assert_yaku(
            &[M1, M2, M3, M4, M5, M6, M6, M7, M8, P2, P3, P4, X2, X2],
            M3,
            vec![vec![]],
        );
    }

    #[test]
    fn test_honitsu() {
        assert_yaku(
            &[M2, M3, M4, M5, M6, M7, M8, M8, M8, M9, M9, X5, X5, X5],
            X5,
            vec![vec![Haku, Honitsu]],
        );
        assert_yaku(
            &[X1, X1, M2, M3, M4, M5, M6, M7, M8, M8, M8, M9, M9, M9],
            X1,
            vec![vec![Honitsu]],
        );
    }

    #[test]
    fn test_tanyao() {
        assert_yaku(
            &[M2, M3, M4, M5, M6, M7, P3, P3, P3, P5, P6, P7, S4, S4],
            M7,
            vec![vec![Tanyao]],
        );
        assert_yaku(
            &[M2, M3, M4, M5, M6, M7, P2, P3, P4, P5, P6, P7, P8, P8],
            P7,
            vec![vec![Pinfu, Tanyao]],
        );
    }

    #[test]
    fn test_fanpai() {
        assert_yaku(
            &[M2, M3, M4, M5, M6, M7, P2, P3, P4, P8, P8, X5, X5, X5],
            X5,
            vec![vec![Haku]],
        );
        assert_yaku(
            &[M2, M3, M4, M5, M6, M7, P2, P3, P4, X6, X6, X6, X7, X7],
            M2,
            vec![vec![Hatsu]],
        );
        assert_yaku(
            &[M2, M3, M4, M5, M6, M7, P2, P3, P4, X1, X1, X1, X7, X7],
            M2,
            vec![vec![Wind]],
        );
    }
    #[test]
    fn test_sanshoku() {
        assert_yaku(
            &[M4, M5, M6, P4, P4, P4, P5, P6, S4, S5, S6, S7, S8, S9],
            M5,
            vec![vec![Sanshokudojun]],
        );
        assert_yaku(
            &[M1, M1, M1, M2, M3, M4, P1, P1, P1, S1, S1, S1, S2, S2],
            S1,
            vec![vec![Sanshokudoko]],
        );
    }

    #[test]
    fn test_itsuu() {
        assert_yaku(
            &[M1, M2, M3, S1, S2, S3, S4, S5, S6, S7, S8, S9, P5, P5],
            S5,
            vec![vec![Itsuu]],
        );
    }

    #[test]
    fn test_toitoi() {
        assert_yaku(
            &[M1, M1, M1, P2, P2, P2, S3, S3, S3, S5, S5, S9, S9, S9],
            S3,
            vec![vec![Toitoi, Sananko]],
        );
        assert_yaku(
            &[M1, M1, M1, P2, P2, P2, S3, S3, S3, S5, S5, S7, S8, S9],
            S3,
            vec![vec![]],
        );
    }

    #[test]
    fn test_honroto() {
        assert_yaku(
            &[M1, M1, M1, M9, M9, M9, P9, P9, P9, S1, S1, X3, X3, X3],
            X3,
            vec![vec![Honroto, Toitoi, Sananko]],
        );
        assert_yaku(
            &[M1, M1, M9, M9, P1, P1, P9, P9, S1, S1, X3, X3, X5, X5],
            X3,
            vec![vec![Chitoitsu, Honroto]],
        );
    }

    #[test]
    fn test_shousangen() {
        assert_yaku(
            &[P1, P2, P3, S5, S5, S5, X5, X5, X5, X6, X6, X6, X7, X7],
            S5,
            vec![vec![Haku, Hatsu, Shosangen]],
        );
        assert_yaku(
            &[P1, P2, P3, S9, S9, S9, X5, X5, X5, X6, X6, X7, X7, X7],
            P1,
            vec![vec![Haku, Chun, Chanta, Sananko, Shosangen]],
        );
    }

    #[test]
    fn test_daisangen() {
        assert_yaku(
            &[P1, P2, P3, S5, S5, X5, X5, X5, X6, X6, X6, X7, X7, X7],
            S5,
            vec![vec![Daisangen]],
        );
    }

    #[test]
    fn test_kokushi() {
        assert_yaku(
            &[M1, M9, P1, P9, S1, S9, S9, X1, X2, X3, X4, X5, X6, X7],
            S1,
            vec![vec![Kokushi]],
        );
        assert_yaku(
            &[M1, M9, P1, P9, S1, S9, X1, X2, X3, X4, X5, X5, X6, X7],
            X5,
            vec![vec![Kokushi]],
        );
    }

    #[test]
    fn test_suuanko() {
        assert_yaku(
            &[M2, M2, M2, P3, P3, P3, P7, P7, P7, S5, S5, X7, X7, X7],
            S5,
            vec![vec![Suuanko]],
        );
    }

    #[test]
    fn test_suushi() {
        assert_yaku(
            &[M3, M4, M5, X1, X1, X1, X2, X2, X3, X3, X3, X4, X4, X4],
            X2,
            vec![vec![Suushi]],
        );
        assert_yaku(
            &[M3, M3, X1, X1, X1, X2, X2, X2, X3, X3, X3, X4, X4, X4],
            X2,
            vec![vec![Suushi]],
        );
    }

    #[test]
    fn test_chinroto() {
        assert_yaku(
            &[M1, M1, M1, P1, P1, P1, P9, P9, P9, S1, S1, S1, S9, S9],
            P1,
            vec![vec![Chinroto]],
        );
    }

    #[test]
    fn test_tsuuiiso() {
        assert_yaku(
            &[X1, X1, X1, X3, X3, X4, X4, X4, X5, X5, X5, X7, X7, X7],
            X1,
            vec![vec![Tsuuiiso]],
        );
        assert_yaku(
            &[X1, X1, X2, X2, X3, X3, X4, X4, X5, X5, X6, X6, X7, X7],
            X1,
            vec![vec![Tsuuiiso]],
        );
    }

    #[test]
    fn test_ryuuiiso() {
        assert_yaku(
            &[S2, S2, S3, S3, S4, S4, S6, S6, S6, S8, S8, X6, X6, X6],
            X6,
            vec![vec![Ryuuiiso]],
        );
        assert_yaku(
            &[S2, S2, S2, S3, S3, S3, S4, S4, S4, S6, S6, S6, S8, S8],
            S6,
            vec![vec![Ryuuiiso], vec![Ryuuiiso]],
        );
    }

    #[test]
    fn test_chuuren() {
        assert_yaku(
            &[S1, S1, S1, S2, S3, S3, S4, S5, S6, S7, S8, S9, S9, S9],
            S5,
            vec![vec![Chuuren]],
        );
        assert_yaku(
            &[M1, M1, M1, M2, M3, M4, M4, M5, M6, M7, M8, M9, M9, M9],
            M4,
            vec![vec![Chuuren], vec![Chuuren]],
        );
    }
    #[test]
    fn test_fu_waits() {
        // pinfu
        assert_fu(
            &[M1, M2, M3, P1, P2, P3, S1, S2, S3, S4, S5, S6, S7, S7],
            S6,
            &[30],
        );
        // not a pinfu: middle wait (2)
        assert_fu(
            &[M1, M2, M3, P1, P2, P3, S1, S2, S3, S4, S5, S6, S7, S7],
            S5,
            &[40],
        );
        // edge wait (2)
        assert_fu(
            &[M1, M2, M3, P1, P2, P3, S1, S2, S3, S4, S5, S6, S7, S7],
            M3,
            &[40],
        );
        // 30 + 4 + 4 + 2(open) + dual pon wait (0)
        assert_fu(
            &[M2, M2, M2, M4, M4, M4, M6, M6, M6, M7, M8, M9, P1, P1],
            M2,
            &[40],
        );
    }
    #[test]
    fn test_fu_pons() {
        // 30 + 8 + 4
        assert_fu(
            &[M1, M1, M1, M2, M2, M2, M5, M6, M7, M7, M8, M9, P1, P1],
            M9,
            &[50],
        );
        // same with non-player wind, player wind, dragon
        assert_fu(
            &[M2, M2, M2, M5, M6, M7, M7, M8, M9, P1, P1, X2, X2, X2],
            M9,
            &[50],
        );
        assert_fu(
            &[M2, M2, M2, M5, M6, M7, M7, M8, M9, P1, P1, X1, X1, X1],
            M9,
            &[50],
        );
        assert_fu(
            &[M2, M2, M2, M5, M6, M7, M7, M8, M9, P1, P1, X7, X7, X7],
            M9,
            &[50],
        );
        // 30 + 4(open) + 4
        assert_fu(
            &[M1, M1, M1, M2, M2, M2, M5, M6, M7, M7, M8, M9, P1, P1],
            M1,
            &[40],
        );
    }
    #[test]
    fn test_fu_head() {
        // non-terminal
        assert_fu(
            &[M1, M2, M3, P1, P2, P3, S1, S2, S3, S4, S5, S6, S8, S8],
            S6,
            &[30],
        );
        // terminal
        assert_fu(
            &[M1, M2, M3, P1, P2, P3, S1, S2, S3, S4, S5, S6, S9, S9],
            S6,
            &[30],
        );
        // non-player wind
        assert_fu(
            &[M1, M2, M3, P1, P2, P3, S1, S2, S3, S4, S5, S6, X2, X2],
            S6,
            &[30],
        );
        // player wind
        assert_fu(
            &[M1, M2, M3, P1, P2, P3, S1, S2, S3, S4, S5, S6, X1, X1],
            S6,
            &[40],
        );
        // dragon
        assert_fu(
            &[M1, M2, M3, P1, P2, P3, S1, S2, S3, S4, S5, S6, X6, X6],
            S6,
            &[40],
        );
    }
    #[test]
    fn test_fu_chitoitsu() {
        assert_fu(
            &[M1, M1, P3, P3, P4, P4, P5, P5, P7, P7, X1, X1, X3, X3],
            X3,
            &[25],
        );
        // yakuman, but we still want to compute fu
        assert_fu(
            &[X1, X1, X2, X2, X3, X3, X4, X4, X5, X5, X6, X6, X7, X7],
            X3,
            &[25],
        );
    }
    #[test]
    fn test_fu_multiple() {
        // three pons (30+8+4+4+2=48) or all chi (30+2=32)
        assert_fu(
            &[M1, M1, M1, M2, M2, M2, M3, M3, M3, P1, P2, P3, P4, P4],
            P4,
            &[50, 40],
        );
        // ryan peiko pinfu, ryan peiko closed wait, or chitoitsu
        assert_fu(
            &[P2, P2, P3, P3, P4, P4, P5, P5, P6, P6, P7, P7, P8, P8],
            P7,
            &[30, 40, 40, 25],
        );
        // pon wait (30+2+8=40) or edge wait (30+4+8+2=44)
        assert_fu(
            &[P1, P2, P3, P3, P3, P3, S2, S2, S5, S6, S7, S9, S9, S9],
            P3,
            &[40, 50],
        );
    }
}
