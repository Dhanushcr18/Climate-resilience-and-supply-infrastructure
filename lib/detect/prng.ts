/**
 * Pure, deterministic Seeded Pseudo-Random Number Generator
 * Guarantees zero Date.now() and zero Math.random() in detection logic.
 */

function stringToSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

export function createPRNG(seedInput: string | number): () => number {
  let s = typeof seedInput === "number" ? (seedInput >>> 0) || 1 : stringToSeed(seedInput);
  return function next(): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a deterministic float in [0, 1) for a specific key
 */
export function seededRandom(key: string): number {
  const prng = createPRNG(key);
  return prng();
}

/**
 * Deterministic integer in [min, max] inclusive
 */
export function seededRandomInt(key: string, min: number, max: number): number {
  const r = seededRandom(key);
  return Math.floor(r * (max - min + 1)) + min;
}
