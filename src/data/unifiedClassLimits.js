// Class 2A and 3A external pitch diameter limits from the ASME B1.1 standard tables, in
// inches, as published. Class 3A carries no allowance, so its maximum is the basic pitch
// diameter and only the minimum is listed.
//
// These are transcribed rather than computed on purpose. The Appendix B tolerance formula
// does not reproduce the tabulated values for every size, so where the standard prints a
// number that number wins; see unifiedClassLimits() in src/lib/threadLimits.js for the
// formula used to fill the gaps.
//
// Sources, cross-checked row by row against each other:
//   https://www.osbornproducts.com/pdfs/standard_inch_pitch_diameters.pdf
//   https://westportcorp.com/blogs/thread-ring-gages/standard-pitch-diameter-chart-inch
// Every basic pitch diameter below also reproduces d - 0.649519 * P exactly, which the
// unit tests re-check.
//
// Keyed by basic major diameter in inches to four decimals, then threads per inch. A
// thread is identified by its geometry, so 1-8 UNC and 8-UN-1 land on the same entry.
export const unifiedClassLimitsInch = Object.freeze({
  // #0-80 UNF
  '0.0600-80': { basic: 0.0519, class2AMax: 0.0514, class2AMin: 0.0496, class3AMin: 0.0506 },
  // #1-64 UNC
  '0.0730-64': { basic: 0.0629, class2AMax: 0.0623, class2AMin: 0.0603, class3AMin: 0.0614 },
  // #1-72 UNF
  '0.0730-72': { basic: 0.0640, class2AMax: 0.0634, class2AMin: 0.0615, class3AMin: 0.0626 },
  // #2-56 UNC
  '0.0860-56': { basic: 0.0744, class2AMax: 0.0738, class2AMin: 0.0717, class3AMin: 0.0728 },
  // #2-64 UNF
  '0.0860-64': { basic: 0.0759, class2AMax: 0.0753, class2AMin: 0.0733, class3AMin: 0.0744 },
  // #3-48 UNC
  '0.0990-48': { basic: 0.0855, class2AMax: 0.0848, class2AMin: 0.0825, class3AMin: 0.0838 },
  // #3-56 UNF
  '0.0990-56': { basic: 0.0874, class2AMax: 0.0867, class2AMin: 0.0845, class3AMin: 0.0858 },
  // #4-40 UNC
  '0.1120-40': { basic: 0.0958, class2AMax: 0.0950, class2AMin: 0.0925, class3AMin: 0.0939 },
  // #4-48 UNF
  '0.1120-48': { basic: 0.0985, class2AMax: 0.0978, class2AMin: 0.0954, class3AMin: 0.0967 },
  // #5-40 UNC
  '0.1250-40': { basic: 0.1088, class2AMax: 0.1080, class2AMin: 0.1054, class3AMin: 0.1069 },
  // #5-44 UNF
  '0.1250-44': { basic: 0.1102, class2AMax: 0.1095, class2AMin: 0.1070, class3AMin: 0.1083 },
  // #6-32 UNC
  '0.1380-32': { basic: 0.1177, class2AMax: 0.1169, class2AMin: 0.1141, class3AMin: 0.1156 },
  // #6-40 UNF
  '0.1380-40': { basic: 0.1218, class2AMax: 0.1210, class2AMin: 0.1184, class3AMin: 0.1198 },
  // #8-32 UNC
  '0.1640-32': { basic: 0.1437, class2AMax: 0.1428, class2AMin: 0.1399, class3AMin: 0.1415 },
  // #8-36 UNF
  '0.1640-36': { basic: 0.1460, class2AMax: 0.1452, class2AMin: 0.1424, class3AMin: 0.1439 },
  // #10-24 UNC
  '0.1900-24': { basic: 0.1629, class2AMax: 0.1619, class2AMin: 0.1586, class3AMin: 0.1604 },
  // #10-32 UNF
  '0.1900-32': { basic: 0.1697, class2AMax: 0.1688, class2AMin: 0.1658, class3AMin: 0.1674 },
  // #12-24 UNC
  '0.2160-24': { basic: 0.1889, class2AMax: 0.1879, class2AMin: 0.1845, class3AMin: 0.1863 },
  // #12-28 UNF
  '0.2160-28': { basic: 0.1928, class2AMax: 0.1918, class2AMin: 0.1886, class3AMin: 0.1904 },
  // #12-32 UNEF
  '0.2160-32': { basic: 0.1957, class2AMax: 0.1948, class2AMin: 0.1917, class3AMin: 0.1933 },
  // 1/4-20 UNC
  '0.2500-20': { basic: 0.2175, class2AMax: 0.2164, class2AMin: 0.2127, class3AMin: 0.2147 },
  // 1/4-28 UNF
  '0.2500-28': { basic: 0.2268, class2AMax: 0.2258, class2AMin: 0.2225, class3AMin: 0.2243 },
  // 1/4-32 UNEF
  '0.2500-32': { basic: 0.2297, class2AMax: 0.2287, class2AMin: 0.2255, class3AMin: 0.2273 },
  // 5/16-18 UNC
  '0.3125-18': { basic: 0.2764, class2AMax: 0.2752, class2AMin: 0.2712, class3AMin: 0.2734 },
  // 5/16-24 UNF
  '0.3125-24': { basic: 0.2854, class2AMax: 0.2843, class2AMin: 0.2806, class3AMin: 0.2827 },
  // 5/16-32 UNEF
  '0.3125-32': { basic: 0.2922, class2AMax: 0.2912, class2AMin: 0.2880, class3AMin: 0.2898 },
  // 3/8-16 UNC
  '0.3750-16': { basic: 0.3344, class2AMax: 0.3331, class2AMin: 0.3287, class3AMin: 0.3311 },
  // 3/8-24 UNF
  '0.3750-24': { basic: 0.3479, class2AMax: 0.3468, class2AMin: 0.3430, class3AMin: 0.3450 },
  // 3/8-32 UNEF
  '0.3750-32': { basic: 0.3547, class2AMax: 0.3537, class2AMin: 0.3503, class3AMin: 0.3522 },
  // 7/16-14 UNC
  '0.4375-14': { basic: 0.3911, class2AMax: 0.3897, class2AMin: 0.3850, class3AMin: 0.3876 },
  // 7/16-20 UNF
  '0.4375-20': { basic: 0.4050, class2AMax: 0.4037, class2AMin: 0.3995, class3AMin: 0.4019 },
  // 7/16-28 UNEF
  '0.4375-28': { basic: 0.4143, class2AMax: 0.4132, class2AMin: 0.4096, class3AMin: 0.4116 },
  // 1/2-13 UNC
  '0.5000-13': { basic: 0.4500, class2AMax: 0.4485, class2AMin: 0.4435, class3AMin: 0.4463 },
  // 1/2-20 UNF
  '0.5000-20': { basic: 0.4675, class2AMax: 0.4662, class2AMin: 0.4619, class3AMin: 0.4643 },
  // 1/2-28 UNEF
  '0.5000-28': { basic: 0.4768, class2AMax: 0.4757, class2AMin: 0.4720, class3AMin: 0.4740 },
  // 9/16-12 UNC
  '0.5625-12': { basic: 0.5084, class2AMax: 0.5068, class2AMin: 0.5016, class3AMin: 0.5045 },
  // 9/16-18 UNF
  '0.5625-18': { basic: 0.5264, class2AMax: 0.5250, class2AMin: 0.5205, class3AMin: 0.5230 },
  // 9/16-24 UNEF
  '0.5625-24': { basic: 0.5354, class2AMax: 0.5342, class2AMin: 0.5303, class3AMin: 0.5325 },
  // 5/8-11 UNC
  '0.6250-11': { basic: 0.5660, class2AMax: 0.5644, class2AMin: 0.5589, class3AMin: 0.5619 },
  // 5/8-18 UNF
  '0.6250-18': { basic: 0.5889, class2AMax: 0.5875, class2AMin: 0.5828, class3AMin: 0.5854 },
  // 5/8-24 UNEF
  '0.6250-24': { basic: 0.5979, class2AMax: 0.5967, class2AMin: 0.5927, class3AMin: 0.5949 },
  // 11/16-24 UNEF
  '0.6875-24': { basic: 0.6604, class2AMax: 0.6592, class2AMin: 0.6552, class3AMin: 0.6574 },
  // 3/4-10 UNC
  '0.7500-10': { basic: 0.6850, class2AMax: 0.6832, class2AMin: 0.6773, class3AMin: 0.6806 },
  // 3/4-16 UNF
  '0.7500-16': { basic: 0.7094, class2AMax: 0.7079, class2AMin: 0.7029, class3AMin: 0.7056 },
  // 3/4-20 UNEF
  '0.7500-20': { basic: 0.7175, class2AMax: 0.7162, class2AMin: 0.7118, class3AMin: 0.7142 },
  // 13/16-20 UNEF
  '0.8125-20': { basic: 0.7800, class2AMax: 0.7787, class2AMin: 0.7743, class3AMin: 0.7767 },
  // 7/8-9 UNC
  '0.8750-9': { basic: 0.8028, class2AMax: 0.8009, class2AMin: 0.7946, class3AMin: 0.7981 },
  // 7/8-14 UNF
  '0.8750-14': { basic: 0.8286, class2AMax: 0.8270, class2AMin: 0.8216, class3AMin: 0.8245 },
  // 7/8-20 UNEF
  '0.8750-20': { basic: 0.8425, class2AMax: 0.8412, class2AMin: 0.8368, class3AMin: 0.8392 },
  // 15/16-20 UNEF
  '0.9375-20': { basic: 0.9050, class2AMax: 0.9036, class2AMin: 0.8991, class3AMin: 0.9016 },
  // 1-8 UNC
  '1.0000-8': { basic: 0.9188, class2AMax: 0.9168, class2AMin: 0.9100, class3AMin: 0.9137 },
  // 1-12 UNF
  '1.0000-12': { basic: 0.9459, class2AMax: 0.9441, class2AMin: 0.9382, class3AMin: 0.9415 },
  // 1-14 UNS
  '1.0000-14': { basic: 0.9536, class2AMax: 0.9519, class2AMin: 0.9463, class3AMin: 0.9494 },
  // 1-20 UNEF
  '1.0000-20': { basic: 0.9675, class2AMax: 0.9661, class2AMin: 0.9616, class3AMin: 0.9641 },
  // 1 1/16-12 UN
  '1.0625-12': { basic: 1.0084, class2AMax: 1.0067, class2AMin: 1.0010, class3AMin: 1.0042 },
  // 1 1/16-18 UNEF
  '1.0625-18': { basic: 1.0264, class2AMax: 1.0250, class2AMin: 1.0203, class3AMin: 1.0228 },
  // 1 1/8-7 UNC
  '1.1250-7': { basic: 1.0322, class2AMax: 1.0300, class2AMin: 1.0228, class3AMin: 1.0268 },
  // 1 1/8-12 UNF
  '1.1250-12': { basic: 1.0709, class2AMax: 1.0691, class2AMin: 1.0631, class3AMin: 1.0664 },
  // 1 1/8-18 UNEF
  '1.1250-18': { basic: 1.0889, class2AMax: 1.0875, class2AMin: 1.0828, class3AMin: 1.0853 },
  // 1 3/16-12 UN
  '1.1875-12': { basic: 1.1334, class2AMax: 1.1317, class2AMin: 1.1259, class3AMin: 1.1291 },
  // 1 3/16-18 UNEF
  '1.1875-18': { basic: 1.1514, class2AMax: 1.1499, class2AMin: 1.1450, class3AMin: 1.1478 },
  // 1 1/4-7 UNC
  '1.2500-7': { basic: 1.1572, class2AMax: 1.1550, class2AMin: 1.1476, class3AMin: 1.1517 },
  // 1 1/4-12 UNF
  '1.2500-12': { basic: 1.1959, class2AMax: 1.1941, class2AMin: 1.1879, class3AMin: 1.1913 },
  // 1 1/4-18 UNEF
  '1.2500-18': { basic: 1.2139, class2AMax: 1.2124, class2AMin: 1.2075, class3AMin: 1.2103 },
  // 1 5/16-12 UN
  '1.3125-12': { basic: 1.2584, class2AMax: 1.2567, class2AMin: 1.2509, class3AMin: 1.2541 },
  // 1 5/16-18 UNEF
  '1.3125-18': { basic: 1.2764, class2AMax: 1.2749, class2AMin: 1.2700, class3AMin: 1.2728 },
  // 1 3/8-6 UNC
  '1.3750-6': { basic: 1.2667, class2AMax: 1.2643, class2AMin: 1.2563, class3AMin: 1.2607 },
  // 1 3/8-12 UNF
  '1.3750-12': { basic: 1.3209, class2AMax: 1.3190, class2AMin: 1.3127, class3AMin: 1.3162 },
  // 1 3/8-18 UNEF
  '1.3750-18': { basic: 1.3389, class2AMax: 1.3374, class2AMin: 1.3325, class3AMin: 1.3353 },
  // 1 7/16-12 UN
  '1.4375-12': { basic: 1.3834, class2AMax: 1.3816, class2AMin: 1.3757, class3AMin: 1.3790 },
  // 1 7/16-18 UNEF
  '1.4375-18': { basic: 1.4014, class2AMax: 1.3999, class2AMin: 1.3949, class3AMin: 1.3977 },
  // 1 1/2-6 UNC
  '1.5000-6': { basic: 1.3917, class2AMax: 1.3893, class2AMin: 1.3812, class3AMin: 1.3856 },
  // 1 1/2-12 UNF
  '1.5000-12': { basic: 1.4459, class2AMax: 1.4440, class2AMin: 1.4376, class3AMin: 1.4411 },
  // 1 1/2-18 UNEF
  '1.5000-18': { basic: 1.4639, class2AMax: 1.4624, class2AMin: 1.4574, class3AMin: 1.4602 },
})
