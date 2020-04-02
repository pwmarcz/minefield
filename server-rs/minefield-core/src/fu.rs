use crate::hand::Group;
use crate::hand::Hand;
use crate::tiles::Tile;

pub fn fu(hand: &Hand, player_wind: Tile) -> usize {
    match hand {
        Hand::Normal(pair, groups, wait, wait_group) => {
            let is_open_wait = wait_group.map_or(false, |g| g.is_open_wait(*wait));
            let is_pon_wait = wait_group.map_or(false, |g| g.is_pon());

            // pinfu
            if groups.iter().all(|g| g.is_chi()) && !pair.is_yakuhai(player_wind) && is_open_wait {
                return 30;
            }

            let mut fu = 30;

            if pair.is_yakuhai(player_wind) {
                fu += 2;
            }
            if !is_pon_wait && !is_open_wait {
                fu += 2;
            }
            for group in groups.iter() {
                if let Group::Pon(tile) = group {
                    let mut p = 2;
                    if tile.is_yaochu() {
                        p *= 2;
                    }
                    // Closed pon
                    if *wait_group != Some(*group) {
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::search::search;
    use crate::tiles::Tile::*;

    fn assert_fu(tiles: &[Tile; 14], wait: Tile, expected: &[usize]) {
        let player_wind = X1;
        let mut result = vec![];

        println!("tiles: {:?}", tiles);
        for hand in search(tiles, wait).iter() {
            println!("hand: {:?}", hand);
            result.push(fu(hand, player_wind));
        }
        assert_eq!(result, expected);
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
            &[50, 40],
        );
    }
}
