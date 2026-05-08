use h3o::{CellIndex, LatLng};

/// Convert an H3 cell index (u64) to (lat, lng) in microdegrees (degrees × 1e6) i32.
///
/// Returns None if the input is not a valid H3 index.
pub fn h3_to_latlng_microdeg(h3_id: u64) -> Option<(i32, i32)> {
    let cell = CellIndex::try_from(h3_id).ok()?;
    let ll = LatLng::from(cell);
    Some(((ll.lat() * 1_000_000.0) as i32, (ll.lng() * 1_000_000.0) as i32))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nyc_cell_returns_close_to_input() {
        let nyc = LatLng::new(40.7128, -74.0060).unwrap();
        let cell: CellIndex = nyc.to_cell(h3o::Resolution::Nine);
        let h3_id: u64 = cell.into();

        let (lat_md, lng_md) = h3_to_latlng_microdeg(h3_id).unwrap();
        // Within ~250m of input — H3 res 9 hex center
        assert!((lat_md - 40_712_800).abs() < 3000, "lat off: {}", lat_md);
        assert!((lng_md - (-74_006_000)).abs() < 3000, "lng off: {}", lng_md);
    }

    #[test]
    fn invalid_h3_returns_none() {
        assert!(h3_to_latlng_microdeg(0).is_none());
        assert!(h3_to_latlng_microdeg(0xFFFFFFFFFFFFFFFF).is_none());
    }
}
