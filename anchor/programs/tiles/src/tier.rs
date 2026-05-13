use crate::constants::{CITIES, TIER1_LAT_DELTA_UD, TIER2_LAT_DELTA_UD};

/// Classify the geographic tier for a point in microdegrees.
///
/// On-chain we can't afford f64 haversine (4 trig calls × 102 cities × 20 tiles
/// pushes claim past Solana's 1.4 M CU limit). Instead each city in `CITIES`
/// stores its precomputed longitude span for the T1 (50 km) and T2 (200 km)
/// radii, and we approximate the radial check with a bounding-box test.
///
/// Bbox-approximation: a tile is "in tier N" if it falls inside *some* T-N
/// box. The bbox extends ±lat_delta in latitude (constant) and ±lng_delta in
/// longitude (per-city, since 1° lng narrows toward the poles). Worst-case
/// overshoot is √2× the radius at the box corners, which is acceptable for
/// MVP and trades exactness for ~3000× cheaper CUs per city check.
///
/// Returns 1, 2, or 3.
pub fn classify_tier(lat_md: i32, lng_md: i32) -> u8 {
    // First pass: any T1 hit short-circuits.
    for (clat, clng, lng_d1, _) in CITIES.iter() {
        if (lat_md - clat).abs() < TIER1_LAT_DELTA_UD
            && (lng_md - clng).abs() < *lng_d1
        {
            return 1;
        }
    }
    // Second pass: T2.
    for (clat, clng, _, lng_d2) in CITIES.iter() {
        if (lat_md - clat).abs() < TIER2_LAT_DELTA_UD
            && (lng_md - clng).abs() < *lng_d2
        {
            return 2;
        }
    }
    3
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tier1_inside_50km_of_nyc() {
        // 40.75°N, -74°W — basically Manhattan
        assert_eq!(classify_tier(40_750_000, -74_000_000), 1);
    }

    #[test]
    fn tier2_about_120km_offshore_from_nyc() {
        // 41.5°N, -72.5°W — between 50 and 200 km from any dataset city
        assert_eq!(classify_tier(41_500_000, -72_500_000), 2);
    }

    #[test]
    fn tier3_mid_pacific() {
        // Equator, mid-Pacific
        assert_eq!(classify_tier(0, -160_000_000), 3);
    }

    #[test]
    fn tier1_stockholm() {
        // Stockholm itself
        assert_eq!(classify_tier(59_329_300, 18_068_600), 1);
    }

    #[test]
    fn tier1_returns_on_first_hit() {
        // Tokyo (first city in the array) — should short-circuit
        assert_eq!(classify_tier(35_689_500, 139_691_700), 1);
    }
}
