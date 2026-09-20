// ISO 965-1 tolerance data for EXTERNAL metric threads, in micrometres.
//
// Two tables, both transcribed rather than computed:
//
//   isoFundamentalDeviationsUm  ISO 965-1 table 1. The upper deviation es by pitch and
//     tolerance position. Position h is zero, so 4h and 6h start at the basic pitch
//     diameter; e, f and g sit below it by a clearance allowance. The often quoted
//     es = -(15 + 11P) is only an approximation of this table -- it gives -37 at P = 2
//     where the standard says -38, and -59 at P = 4 where the standard says -60.
//
//   isoPitchDiameterTolerancesUm  ISO 965-1 table 5. The pitch diameter tolerance Td2 by
//     nominal diameter range, pitch and tolerance grade. The standard derives these from
//     90 * P^0.4 * d^0.1 rounded to the R40 series, but the rounding does not always land
//     where recomputing puts it (M3 x 0.5 is tabulated at 75 um where the formula gives
//     80), so the table is what is used.
//
// Source: https://www.fasteners.eu/tech-info/ISO/965-1/
// Cross-checked against published 6g and 6h gage charts for 44 sizes, which agree on every
// derived deviation and every grade 6 tolerance; the unit tests re-run that comparison.
export const isoFundamentalDeviationsUm = Object.freeze({
  0.2  : { e: null, f: null, g:  -17, h: 0 },
  0.25 : { e: null, f: null, g:  -18, h: 0 },
  0.3  : { e: null, f: null, g:  -18, h: 0 },
  0.35 : { e: null, f:  -34, g:  -19, h: 0 },
  0.4  : { e: null, f:  -34, g:  -19, h: 0 },
  0.45 : { e: null, f:  -35, g:  -20, h: 0 },
  0.5  : { e:  -50, f:  -36, g:  -20, h: 0 },
  0.6  : { e:  -53, f:  -36, g:  -21, h: 0 },
  0.7  : { e:  -56, f:  -38, g:  -22, h: 0 },
  0.75 : { e:  -56, f:  -38, g:  -22, h: 0 },
  0.8  : { e:  -60, f:  -38, g:  -24, h: 0 },
  1    : { e:  -60, f:  -40, g:  -26, h: 0 },
  1.25 : { e:  -63, f:  -42, g:  -28, h: 0 },
  1.5  : { e:  -67, f:  -45, g:  -32, h: 0 },
  1.75 : { e:  -71, f:  -48, g:  -34, h: 0 },
  2    : { e:  -71, f:  -52, g:  -38, h: 0 },
  2.5  : { e:  -80, f:  -58, g:  -42, h: 0 },
  3    : { e:  -85, f:  -63, g:  -48, h: 0 },
  3.5  : { e:  -90, f:  -70, g:  -53, h: 0 },
  4    : { e:  -95, f:  -75, g:  -60, h: 0 },
  4.5  : { e: -100, f:  -80, g:  -63, h: 0 },
  5    : { e: -106, f:  -85, g:  -71, h: 0 },
  5.5  : { e: -112, f:  -90, g:  -75, h: 0 },
  6    : { e: -118, f:  -95, g:  -80, h: 0 },
  8    : { e: -140, f: -118, g: -100, h: 0 },
})

// Ranges are exclusive at the bottom and inclusive at the top, as the standard writes them.
export const isoPitchDiameterTolerancesUm = Object.freeze([
  // over 0.99 mm up to and including 1.4 mm
  { overMm: 0.99, upToMm: 1.4, pitches: [
    { pitch: 0.2,   grades: { 3: 24, 4: 30, 5: 38, 6: 48 } },
    { pitch: 0.25,  grades: { 3: 26, 4: 34, 5: 42, 6: 53 } },
    { pitch: 0.3,   grades: { 3: 28, 4: 36, 5: 45, 6: 56 } },
  ] },
  // over 1.4 mm up to and including 2.8 mm
  { overMm: 1.4, upToMm: 2.8, pitches: [
    { pitch: 0.2,   grades: { 3: 25, 4: 32, 5: 40, 6: 50 } },
    { pitch: 0.25,  grades: { 3: 28, 4: 36, 5: 45, 6: 56 } },
    { pitch: 0.35,  grades: { 3: 32, 4: 40, 5: 50, 6: 63, 7: 80 } },
    { pitch: 0.4,   grades: { 3: 34, 4: 42, 5: 53, 6: 67, 7: 85 } },
    { pitch: 0.45,  grades: { 3: 36, 4: 45, 5: 56, 6: 71, 7: 90 } },
  ] },
  // over 2.8 mm up to and including 5.6 mm
  { overMm: 2.8, upToMm: 5.6, pitches: [
    { pitch: 0.35,  grades: { 3: 34, 4: 42, 5: 53, 6: 67, 7: 85 } },
    { pitch: 0.5,   grades: { 3: 38, 4: 48, 5: 60, 6: 75, 7: 95 } },
    { pitch: 0.6,   grades: { 3: 42, 4: 53, 5: 67, 6: 85, 7: 106 } },
    { pitch: 0.7,   grades: { 3: 45, 4: 56, 5: 71, 6: 90, 7: 112 } },
    { pitch: 0.75,  grades: { 3: 45, 4: 56, 5: 71, 6: 90, 7: 112 } },
    { pitch: 0.8,   grades: { 3: 48, 4: 60, 5: 75, 6: 95, 7: 118, 8: 150, 9: 190 } },
  ] },
  // over 5.6 mm up to and including 11.2 mm
  { overMm: 5.6, upToMm: 11.2, pitches: [
    { pitch: 0.75,  grades: { 3: 50, 4: 63, 5: 80, 6: 100, 7: 125 } },
    { pitch: 1,     grades: { 3: 56, 4: 71, 5: 90, 6: 112, 7: 140, 8: 180, 9: 224 } },
    { pitch: 1.25,  grades: { 3: 60, 4: 75, 5: 95, 6: 118, 7: 150, 8: 190, 9: 236 } },
    { pitch: 1.5,   grades: { 3: 67, 4: 85, 5: 106, 6: 132, 7: 170, 8: 212, 9: 265 } },
  ] },
  // over 11.2 mm up to and including 22.4 mm
  { overMm: 11.2, upToMm: 22.4, pitches: [
    { pitch: 1,     grades: { 3: 60, 4: 75, 5: 95, 6: 118, 7: 150, 8: 190, 9: 236 } },
    { pitch: 1.25,  grades: { 3: 67, 4: 85, 5: 106, 6: 132, 7: 170, 8: 212, 9: 265 } },
    { pitch: 1.5,   grades: { 3: 71, 4: 90, 5: 112, 6: 140, 7: 180, 8: 224, 9: 280 } },
    { pitch: 1.75,  grades: { 3: 75, 4: 95, 5: 118, 6: 150, 7: 190, 8: 236, 9: 300 } },
    { pitch: 2,     grades: { 3: 80, 4: 100, 5: 125, 6: 160, 7: 200, 8: 250, 9: 315 } },
    { pitch: 2.5,   grades: { 3: 85, 4: 106, 5: 132, 6: 170, 7: 212, 8: 265, 9: 335 } },
  ] },
  // over 22.4 mm up to and including 45 mm
  { overMm: 22.4, upToMm: 45, pitches: [
    { pitch: 1,     grades: { 3: 63, 4: 80, 5: 100, 6: 125, 7: 160, 8: 200, 9: 250 } },
    { pitch: 1.5,   grades: { 3: 75, 4: 95, 5: 118, 6: 150, 7: 190, 8: 236, 9: 300 } },
    { pitch: 2,     grades: { 3: 85, 4: 106, 5: 132, 6: 170, 7: 212, 8: 265, 9: 335 } },
    { pitch: 3,     grades: { 3: 100, 4: 125, 5: 160, 6: 200, 7: 250, 8: 315, 9: 400 } },
    { pitch: 3.5,   grades: { 3: 106, 4: 132, 5: 170, 6: 212, 7: 265, 8: 335, 9: 425 } },
    { pitch: 4,     grades: { 3: 112, 4: 140, 5: 180, 6: 224, 7: 280, 8: 355, 9: 450 } },
    { pitch: 4.5,   grades: { 3: 118, 4: 150, 5: 190, 6: 236, 7: 300, 8: 375, 9: 475 } },
  ] },
  // over 45 mm up to and including 90 mm
  { overMm: 45, upToMm: 90, pitches: [
    { pitch: 1.5,   grades: { 3: 80, 4: 100, 5: 125, 6: 160, 7: 200, 8: 250, 9: 315 } },
    { pitch: 2,     grades: { 3: 90, 4: 112, 5: 140, 6: 180, 7: 224, 8: 280, 9: 355 } },
    { pitch: 3,     grades: { 3: 106, 4: 132, 5: 170, 6: 212, 7: 265, 8: 335, 9: 425 } },
    { pitch: 4,     grades: { 3: 118, 4: 150, 5: 190, 6: 236, 7: 300, 8: 375, 9: 475 } },
    { pitch: 5,     grades: { 3: 125, 4: 160, 5: 200, 6: 250, 7: 315, 8: 400, 9: 500 } },
    { pitch: 5.5,   grades: { 3: 132, 4: 170, 5: 212, 6: 265, 7: 335, 8: 425, 9: 530 } },
    { pitch: 6,     grades: { 3: 140, 4: 180, 5: 224, 6: 280, 7: 355, 8: 450, 9: 560 } },
  ] },
  // over 90 mm up to and including 180 mm
  { overMm: 90, upToMm: 180, pitches: [
    { pitch: 2,     grades: { 3: 95, 4: 118, 5: 150, 6: 190, 7: 236, 8: 300, 9: 375 } },
    { pitch: 3,     grades: { 3: 112, 4: 140, 5: 180, 6: 224, 7: 280, 8: 355, 9: 450 } },
    { pitch: 4,     grades: { 3: 125, 4: 160, 5: 200, 6: 250, 7: 315, 8: 400, 9: 500 } },
    { pitch: 6,     grades: { 3: 150, 4: 190, 5: 236, 6: 300, 7: 375, 8: 475, 9: 600 } },
    { pitch: 8,     grades: { 3: 170, 4: 212, 5: 265, 6: 335, 7: 425, 8: 530, 9: 670 } },
  ] },
  // over 180 mm up to and including 355 mm
  { overMm: 180, upToMm: 355, pitches: [
    { pitch: 3,     grades: { 3: 125, 4: 160, 5: 200, 6: 250, 7: 315, 8: 400, 9: 500 } },
    { pitch: 4,     grades: { 3: 140, 4: 180, 5: 224, 6: 280, 7: 355, 8: 450, 9: 560 } },
    { pitch: 6,     grades: { 3: 160, 4: 200, 5: 250, 6: 315, 7: 400, 8: 500, 9: 630 } },
    { pitch: 8,     grades: { 3: 180, 4: 224, 5: 280, 6: 355, 7: 450, 8: 560, 9: 710 } },
  ] },
])
