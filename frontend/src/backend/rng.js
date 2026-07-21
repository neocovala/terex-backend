// Small helpers standing in for Python's `random` module in the ported backend logic.

export function uniform(a, b) {
  return a + Math.random() * (b - a);
}

export function randint(a, b) {
  return a + Math.floor(Math.random() * (b - a + 1));
}

export function gauss(mean = 0, std = 1) {
  const u1 = Math.random() || 1e-12;
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

export function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Mirrors Python's random.choices(population, weights=..., k=k) — sampling with replacement.
export function choicesWeighted(items, weights, k = 1) {
  const total = weights.reduce((a, b) => a + b, 0);
  const out = [];
  for (let i = 0; i < k; i++) {
    let r = Math.random() * total;
    let picked = items[items.length - 1];
    for (let j = 0; j < items.length; j++) {
      r -= weights[j];
      if (r <= 0) { picked = items[j]; break; }
    }
    out.push(picked);
  }
  return out;
}

export function shortId(len = 12) {
  return crypto.randomUUID().replace(/-/g, "").slice(0, len);
}

export function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stdev(arr) {
  if (arr.length <= 1) return 1e-6;
  const m = mean(arr);
  const variance = arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.max(Math.sqrt(variance), 1e-6);
}
