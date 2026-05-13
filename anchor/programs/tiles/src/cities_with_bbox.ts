// One-shot generator for the bbox-augmented CITIES table in constants.rs.
// Run with `npx tsx anchor/programs/tiles/src/cities_with_bbox.ts > /tmp/out.rs`,
// then paste into constants.rs (or copy the array body into the existing block).
//
// Per-city tuple: (lat_µd, lng_µd, lng_delta_t1_µd, lng_delta_t2_µd).
// `lat_delta` is constant for all cities (R / 111 km/°) so it's hardcoded in
// tier.rs, not stored per city.

const CITIES: Array<[number, number, string]> = [
  [35_689_500, 139_691_700, 'Tokyo'],
  [28_704_100, 77_102_500, 'Delhi'],
  [31_230_400, 121_473_700, 'Shanghai'],
  [-23_550_500, -46_633_300, 'São Paulo'],
  [19_432_600, -99_133_200, 'Mexico City'],
  [30_044_400, 31_235_700, 'Cairo'],
  [19_076_000, 72_877_700, 'Mumbai'],
  [39_904_200, 116_407_400, 'Beijing'],
  [23_810_300, 90_412_500, 'Dhaka'],
  [34_693_700, 135_502_300, 'Osaka'],
  [40_712_800, -74_006_000, 'New York'],
  [24_860_700, 67_001_100, 'Karachi'],
  [-34_603_700, -58_381_600, 'Buenos Aires'],
  [29_431_600, 106_912_300, 'Chongqing'],
  [41_008_200, 28_978_400, 'Istanbul'],
  [22_572_600, 88_363_900, 'Kolkata'],
  [14_599_500, 120_984_200, 'Manila'],
  [6_524_400, 3_379_200, 'Lagos'],
  [-22_906_800, -43_172_900, 'Rio de Janeiro'],
  [39_343_400, 117_361_600, 'Tianjin'],
  [-4_441_900, 15_266_300, 'Kinshasa'],
  [23_129_100, 113_264_400, 'Guangzhou'],
  [34_052_200, -118_243_700, 'Los Angeles'],
  [55_755_800, 37_617_300, 'Moscow'],
  [22_543_100, 114_057_900, 'Shenzhen'],
  [31_549_700, 74_343_600, 'Lahore'],
  [12_971_600, 77_594_600, 'Bangalore'],
  [48_856_600, 2_352_200, 'Paris'],
  [4_711_000, -74_072_100, 'Bogotá'],
  [-6_208_800, 106_845_600, 'Jakarta'],
  [13_082_700, 80_270_700, 'Chennai'],
  [-12_046_400, -77_042_800, 'Lima'],
  [13_756_300, 100_501_800, 'Bangkok'],
  [37_566_500, 126_978_000, 'Seoul'],
  [35_181_500, 136_906_600, 'Nagoya'],
  [17_385_000, 78_486_700, 'Hyderabad'],
  [51_507_400, -127_800, 'London'],
  [35_689_200, 51_389_000, 'Tehran'],
  [41_878_100, -87_629_800, 'Chicago'],
  [30_572_800, 104_066_800, 'Chengdu'],
  [32_060_300, 118_796_900, 'Nanjing'],
  [30_592_800, 114_305_500, 'Wuhan'],
  [10_823_100, 106_629_700, 'Ho Chi Minh City'],
  [-8_839_000, 13_289_400, 'Luanda'],
  [23_022_500, 72_571_400, 'Ahmedabad'],
  [3_139_000, 101_686_900, 'Kuala Lumpur'],
  [34_341_600, 108_939_800, "Xi'an"],
  [22_319_300, 114_169_400, 'Hong Kong'],
  [23_048_900, 113_744_700, 'Dongguan'],
  [30_274_100, 120_155_100, 'Hangzhou'],
  [23_021_800, 113_121_900, 'Foshan'],
  [41_805_700, 123_431_500, 'Shenyang'],
  [24_713_600, 46_675_300, 'Riyadh'],
  [33_315_200, 44_366_100, 'Baghdad'],
  [-33_448_900, -70_669_300, 'Santiago'],
  [21_170_200, 72_831_100, 'Surat'],
  [40_416_800, -3_703_800, 'Madrid'],
  [31_298_900, 120_585_300, 'Suzhou'],
  [18_520_400, 73_856_700, 'Pune'],
  [45_803_800, 126_535_000, 'Harbin'],
  [29_760_400, -95_369_800, 'Houston'],
  [32_776_700, -96_797_000, 'Dallas'],
  [43_653_200, -79_383_200, 'Toronto'],
  [-6_792_400, 39_208_300, 'Dar es Salaam'],
  [25_761_700, -80_191_800, 'Miami'],
  [-19_916_700, -43_934_500, 'Belo Horizonte'],
  [1_352_100, 103_819_800, 'Singapore'],
  [39_952_600, -75_165_200, 'Philadelphia'],
  [33_749_000, -84_388_000, 'Atlanta'],
  [33_590_400, 130_401_700, 'Fukuoka'],
  [15_500_700, 32_559_900, 'Khartoum'],
  [41_385_100, 2_173_400, 'Barcelona'],
  [-26_204_100, 28_047_300, 'Johannesburg'],
  [59_931_100, 30_360_900, 'Saint Petersburg'],
  [36_067_100, 120_382_600, 'Qingdao'],
  [38_914_000, 121_614_700, 'Dalian'],
  [38_907_200, -77_036_900, 'Washington'],
  [16_840_900, 96_173_500, 'Yangon'],
  [31_200_100, 29_918_700, 'Alexandria'],
  [36_651_200, 117_120_100, 'Jinan'],
  [20_659_700, -103_349_600, 'Guadalajara'],
  [42_360_100, -71_058_900, 'Boston'],
  [33_448_400, -112_074_000, 'Phoenix'],
  [-1_292_100, 36_821_900, 'Nairobi'],
  [-33_868_800, 151_209_300, 'Sydney'],
  [-37_813_600, 144_963_100, 'Melbourne'],
  [52_520_000, 13_405_000, 'Berlin'],
  [42_331_400, -83_045_800, 'Detroit'],
  [37_774_900, -122_419_400, 'San Francisco'],
  [41_902_800, 12_496_400, 'Rome'],
  [33_573_100, -7_589_800, 'Casablanca'],
  [37_983_800, 23_727_500, 'Athens'],
  [48_208_200, 16_373_800, 'Vienna'],
  [52_229_700, 21_012_200, 'Warsaw'],
  [45_501_700, -73_567_300, 'Montreal'],
  [10_480_600, -66_903_600, 'Caracas'],
  [9_032_000, 38_746_900, 'Addis Ababa'],
  [21_028_500, 105_854_200, 'Hanoi'],
  [25_033_000, 121_565_400, 'Taipei'],
  [41_299_500, 69_240_100, 'Tashkent'],
  [39_039_200, 125_762_500, 'Pyongyang'],
  [59_329_300, 18_068_600, 'Stockholm'],
];

const KM_PER_DEG_LAT = 111.0;
const TIER1_KM = 50;
const TIER2_KM = 200;
const MICRO = 1_000_000;

function lngDeltaMicro(latMicro: number, radiusKm: number): number {
  const latRad = (latMicro / MICRO) * (Math.PI / 180);
  const kmPerDegLng = KM_PER_DEG_LAT * Math.cos(latRad);
  // Cap at 180° (poles); otherwise lng wrap-around would matter, but T1/T2 radii
  // are small enough that no city's bbox actually crosses ±180°.
  const safeKm = Math.max(kmPerDegLng, 0.001);
  const deltaDeg = radiusKm / safeKm;
  return Math.round(deltaDeg * MICRO);
}

function fmtPad(n: number, width: number): string {
  const s = n.toLocaleString('en-US').replace(/,/g, '_');
  return s.padStart(width);
}

console.log('pub const CITIES: [(i32, i32, i32, i32); 102] = [');
for (const [lat, lng, name] of CITIES) {
  const lngD1 = lngDeltaMicro(lat, TIER1_KM);
  const lngD2 = lngDeltaMicro(lat, TIER2_KM);
  console.log(
    `    (${fmtPad(lat, 12)}, ${fmtPad(lng, 12)}, ${fmtPad(lngD1, 10)}, ${fmtPad(
      lngD2,
      10,
    )}), // ${name}`,
  );
}
console.log('];');
