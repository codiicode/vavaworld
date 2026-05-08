use crate::constants::{CITIES, TIER1_RADIUS_KM, TIER2_RADIUS_KM};

const EARTH_RADIUS_KM: f64 = 6371.0;
const MICRO: f64 = 1_000_000.0;

/// Haversine distance in km between two points expressed as microdegrees.
pub fn haversine_km(lat1_md: i32, lng1_md: i32, lat2_md: i32, lng2_md: i32) -> u32 {
    let lat1 = (lat1_md as f64) / MICRO;
    let lng1 = (lng1_md as f64) / MICRO;
    let lat2 = (lat2_md as f64) / MICRO;
    let lng2 = (lng2_md as f64) / MICRO;

    let to_rad = |d: f64| d * core::f64::consts::PI / 180.0;
    let dlat = to_rad(lat2 - lat1);
    let dlng = to_rad(lng2 - lng1);

    let sin_dlat = libm::sin(dlat / 2.0);
    let sin_dlng = libm::sin(dlng / 2.0);
    let a = sin_dlat * sin_dlat
        + libm::cos(to_rad(lat1)) * libm::cos(to_rad(lat2)) * sin_dlng * sin_dlng;
    let c = 2.0 * libm::asin(libm::sqrt(a).min(1.0));

    (EARTH_RADIUS_KM * c) as u32
}

/// Classify the geographic tier for a point in microdegrees.
/// Returns 1, 2, or 3.
pub fn classify_tier(lat_md: i32, lng_md: i32) -> u8 {
    let mut min_dist_km: u32 = u32::MAX;
    for (clat, clng) in CITIES.iter() {
        let d = haversine_km(lat_md, lng_md, *clat, *clng);
        if d < min_dist_km {
            min_dist_km = d;
        }
        if min_dist_km < TIER1_RADIUS_KM {
            return 1;
        }
    }
    if min_dist_km < TIER2_RADIUS_KM {
        2
    } else {
        3
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn haversine_zero_for_same_point() {
        assert_eq!(haversine_km(40_712_800, -74_006_000, 40_712_800, -74_006_000), 0);
    }

    #[test]
    fn haversine_nyc_to_la_about_3944km() {
        let d = haversine_km(40_712_800, -74_006_000, 34_052_200, -118_243_700);
        assert!(d > 3900 && d < 4000, "expected ~3944, got {}", d);
    }

    #[test]
    fn tier1_inside_50km_of_nyc() {
        assert_eq!(classify_tier(40_750_000, -74_000_000), 1);
    }

    #[test]
    fn tier2_about_120km_offshore_from_nyc() {
        // (41.5, -72.5) — between 50–200km from any dataset city
        assert_eq!(classify_tier(41_500_000, -72_500_000), 2);
    }

    #[test]
    fn tier3_mid_pacific() {
        assert_eq!(classify_tier(0, -160_000_000), 3);
    }

    #[test]
    fn tier_short_circuits_returns_1_for_stockholm() {
        // Stockholm is in dataset; (59.3293, 18.0686)
        assert_eq!(classify_tier(59_329_300, 18_068_600), 1);
    }
}
