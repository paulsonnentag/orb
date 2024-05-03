/**
 * Round a number to a specified decimal place
 * @param num - The number to be rounded
 * @param decimalPlace - The decimal place to round to
 * @returns The rounded number
 */
export function round(num: number, decimalPlace: number): number {
  const factor = Math.pow(10, decimalPlace);
  return Math.round(num * factor) / factor;
}

export function random(seed: string) {
  var s0,
    s1,
    c = 1,
    t,
    n = 0xefc8249d,
    h;
  seed = "X" + (seed || +new Date()); // Ensures the seed is always defined

  for (var i = 0; i < 2; i++) {
    // Generates two initial states
    for (var j = 0; j < seed.length; j++) {
      n += seed.charCodeAt(j);
      h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000;
    }
    t = (n >>> 0) * 2.3283064365386963e-10;
    if (i === 0) s0 = t;
    else s1 = t;
  }

  // Pseudo-random number generation
  t = 2091639 * s0 + c * 2.3283064365386963e-10;
  s0 = s1;
  s1 = t - (c = t | 0);

  return s1; // Returns a pseudo-random number between 0 and 1
}
