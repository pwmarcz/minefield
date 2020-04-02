use crate::fu::fu;
use crate::hand::{Group, Hand};
use crate::tiles::Tile;

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

pub fn yaku(hand: &Hand, player_wind: Tile) -> Vec<Yaku> {
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
        Hand::Normal(_, _, _, _) => {
            result.append(&mut normal_yaku(hand, player_wind, &tiles));

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

fn normal_yaku(hand: &Hand, player_wind: Tile, tiles: &[Tile]) -> Vec<Yaku> {
    use Tile::*;

    let mut result = vec![];
    if let Hand::Normal(pair, groups, wait, wait_group) = hand {
        let mut pon_count = 0;
        for group in groups.iter() {
            if group.is_pon() {
                pon_count += 1;
            }
        }

        if groups[0] == groups[1] && groups[2] == groups[3] {
            result.push(Yaku::Ryanpeiko);
        } else if groups[0] == groups[1] || groups[1] == groups[2] || groups[2] == groups[3] {
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
            if wait_group.is_none() {
                result.push(Yaku::Suuanko);
            } else {
                result.push(Yaku::Sananko);
            }
        }

        if pon_count == 3 {
            match wait_group {
                None | Some(Group::Chi(_)) => result.push(Yaku::Sananko),
                Some(Group::Pon(_)) => (),
            }
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
        if pon(*groups, player_wind) {
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
    }
    result
}

fn pon(groups: [Group; 4], tile: Tile) -> bool {
    for &group in groups.iter() {
        match group {
            Group::Pon(t) if t == tile => return true,
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
        || f(groups[0], groups[2], groups[3])
        || f(groups[1], groups[2], groups[3])
}

fn sanshokudojun(groups: [Group; 4]) -> bool {
    use Group::Chi;

    three(groups, |g1, g2, g3| match (g1, g2, g3) {
        (Chi(t1), Chi(t2), Chi(t3)) => Tile::sanshoku(t1, t2, t3),
        _ => false,
    })
}

fn sanshokudoko(groups: [Group; 4]) -> bool {
    use Group::Pon;

    three(groups, |g1, g2, g3| match (g1, g2, g3) {
        (Pon(t1), Pon(t2), Pon(t3)) => Tile::sanshoku(t1, t2, t3),
        _ => false,
    })
}

fn itsuu(groups: [Group; 4]) -> bool {
    use Group::Chi;

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

const BASE_POINTS: [usize; 7] = [0, 8000, 12000, 16000, 24000, 32000, 64000];

pub fn score(mut fan: usize, fu: usize) -> usize {
    // riichi
    if fan < 13 {
        fan += 1;
    }

    match fan {
        // no mangan
        0..=2 => 0,
        3 if fu < 60 => 0,
        4 if fu < 30 => 0,
        // mangan
        3..=5 => BASE_POINTS[1],
        // haneman
        6..=7 => BASE_POINTS[2],
        // baiman
        8..=10 => BASE_POINTS[3],
        // sanbaiman
        11..=12 => BASE_POINTS[4],
        // yakuman
        13 => BASE_POINTS[5],
        // double yakuman
        _ => BASE_POINTS[6],
    }
}

pub fn score_hand(hand: &Hand, player_wind: Tile, dora: Tile) -> usize {
    let yaku = yaku(hand, player_wind);
    if yaku.is_empty() {
        return 0;
    }
    let fu = fu(hand, player_wind);
    let mut fan = yaku.iter().map(|y| y.fan()).sum();
    for tile in hand.tiles().iter() {
        if *tile == dora {
            fan += 1;
        }
    }
    score(fan, fu)
}

#[cfg(test)]
mod tests {
    use super::Yaku::*;
    use super::*;
    use crate::search::search;
    use crate::tiles::Tile::*;

    fn assert_yaku(tiles: &[Tile; 14], wait: Tile, expected: Vec<Vec<Yaku>>) {
        let player_wind = X1;
        let mut result = vec![];

        println!("tiles: {:?}", tiles);
        for hand in search(tiles, wait) {
            println!("hand: {:?}", hand);
            result.push(yaku(&hand, player_wind));
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
}
