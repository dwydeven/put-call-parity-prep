export const CATEGORIES = [
  { id: 'putCall', label: 'Put-Call' },
  { id: 'combo', label: 'Combo' },
  { id: 'straddle', label: 'Straddle' },
  { id: 'bwPs', label: 'B/W and P+S' },
];

const randomInt = (min, max, random = Math.random) => Math.floor(random() * (max - min + 1)) + min;
const pick = (items, random) => items[randomInt(0, items.length - 1, random)];

// Abramowitz and Stegun 7.1.26. Its maximum absolute error is 7.5e-8,
// substantially more precise than the cents displayed by the game.
export function normalCdf(value) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

export function blackScholes({ stock, strike, rate, volatility, years }) {
  const rootTime = Math.sqrt(years);
  const d1 = (Math.log(stock / strike) + (rate + (volatility ** 2) / 2) * years) / (volatility * rootTime);
  const d2 = d1 - volatility * rootTime;
  const discountedStrike = strike * Math.exp(-rate * years);
  return {
    call: stock * normalCdf(d1) - discountedStrike * normalCdf(d2),
    put: discountedStrike * normalCdf(-d2) - stock * normalCdf(-d1),
  };
}

const cents = (dollars) => Math.round(dollars * 100);

// All quoted values are cents. The r/c residual is derived *after* premium
// rounding, preserving exact displayed put-call parity instead of leaking a
// one-cent floating point/rounding discrepancy into a drill.
export function makeMarket(random = Math.random) {
  for (let attempt = 0; attempt < 10000; attempt += 1) {
    const stock = randomInt(1000, 50000, random);
    const lowStrike = Math.max(25, Math.ceil((stock - 5000) / 25) * 25);
    const highStrike = Math.min(50000, Math.floor((stock + 5000) / 25) * 25);
    const strike = randomInt(lowStrike / 25, highStrike / 25, random) * 25;
    const rate = randomInt(100, 1000, random) / 10000;
    const volatility = randomInt(1000, 8000, random) / 10000;
    const days = randomInt(30, 365, random);
    const years = days / 365;
    const premium = blackScholes({ stock: stock / 100, strike: strike / 100, rate, volatility, years });
    const call = cents(premium.call);
    const put = cents(premium.put);
    const rc = call - put - stock + strike;

    // Avoid zero-cent contracts and reject carry outside the intended
    // real-world drill range. Inputs remain within the requested ranges.
    if (call > 0 && put > 0 && rc > 0 && rc <= 500) {
      return { stock, strike, put, call, rc, rate, volatility, days };
    }
  }
  throw new Error('Unable to generate a realistic option market');
}

export const combo = ({ call, put }) => call - put;
export const straddle = ({ call, put }) => call + put;
export const bw = ({ stock, call, strike }) => stock - call - strike;
export const ps = ({ put, stock, strike }) => put + stock - strike;

export function assertMarket(market) {
  const { stock, strike, put, call, rc } = market;
  if (![stock, strike, put, call, rc].every(Number.isInteger)) throw new Error('Values must be integer cents');
  if (stock <= 0 || strike <= 0 || put <= 0 || call <= 0) throw new Error('Price values must be positive');
  if (strike % 25 !== 0) throw new Error('Strike must be in $0.25 increments');
  if (call - put !== stock - strike + rc) throw new Error('Put-call parity failed');
  if (rc <= 0 || rc > 500) throw new Error('r/c must be within the realistic $0–$5 range');
  return true;
}

export function money(cents, signed = false) {
  const prefix = cents < 0 ? '−' : signed && cents > 0 ? '+' : '';
  return `${prefix}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

const field = (label, value) => ({ label, value: money(value, label === 'r/c') });
const question = (category, title, prompt, fields, answer, answerLabel, formula) => ({
  category, title, prompt, fields, answer, answerLabel, formula,
});

export function generateQuestion(enabled, random = Math.random) {
  const selected = enabled.filter((id) => CATEGORIES.some((category) => category.id === id));
  if (!selected.length) throw new Error('Select at least one question category');
  const category = pick(selected, random);
  const blank = category === 'putCall'
    ? pick(['put', 'call', 'stock', 'strike', 'rc'], random)
    : category === 'combo'
      ? pick(['combo', 'stock', 'call', 'put'], random)
      : category === 'straddle'
        ? pick(['straddle', 'call', 'put'], random)
        : pick(['strategy', 'put', 'call'], random);
  const useBw = category === 'bwPs' && random() < 0.5;
  // The category and one blank are selected first. Market data is priced once
  // and then extracted unchanged into the selected question template.
  const market = makeMarket(random);
  assertMarket(market);
  const { stock: S, strike: K, put: P, call: C, rc } = market;

  if (category === 'putCall') {
    const base = [field('Stock', S), field('Strike', K), field('Put', P), field('Call', C), field('r/c', rc)];
    const labels = { put: 'Put', call: 'Call', stock: 'Stock', strike: 'Strike', rc: 'r/c' };
    const answer = { put: P, call: C, stock: S, strike: K, rc }[blank];
    return question(category, 'Put-Call', `Solve for ${labels[blank]}.`, base.filter((item) => item.label !== labels[blank]), answer, labels[blank], 'C − P = S − K + r/c');
  }

  if (category === 'combo') {
    const value = combo(market);
    const templates = {
      combo: ['Combo', value, [field('Stock', S), field('Strike', K), field('Put', P), field('Call', C), field('r/c', rc)]],
      stock: ['Stock', S, [field('Combo', value), field('Strike', K), field('Put', P), field('Call', C), field('r/c', rc)]],
      call: ['Call', C, [field('Combo', value), field('Stock', S), field('Strike', K), field('Put', P), field('r/c', rc)]],
      put: ['Put', P, [field('Combo', value), field('Stock', S), field('Strike', K), field('Call', C), field('r/c', rc)]],
    };
    const [answerLabel, answer, fields] = templates[blank];
    return question(category, 'Combo', `Solve for ${answerLabel}.`, fields, answer, answerLabel, 'Combo = C − P = S − K + r/c');
  }

  if (category === 'straddle') {
    const value = straddle(market);
    const templates = {
      straddle: ['Straddle', value, [field('Stock', S), field('Strike', K), field('Put', P), field('Call', C), field('r/c', rc)]],
      call: ['Call', C, [field('Straddle', value), field('Stock', S), field('Strike', K), field('Put', P), field('r/c', rc)]],
      put: ['Put', P, [field('Straddle', value), field('Stock', S), field('Strike', K), field('Call', C), field('r/c', rc)]],
    };
    const [answerLabel, answer, fields] = templates[blank];
    return question(category, 'Straddle', `Solve for ${answerLabel}.`, fields, answer, answerLabel, 'Straddle = C + P');
  }

  const label = useBw ? 'B/W' : 'P+S';
  const strategy = useBw ? bw(market) : ps(market);
  if (blank === 'strategy') {
    return question(category, label, `Solve for ${label}.`, [field('Stock', S), field('Strike', K), field('Put', P), field('Call', C), field('r/c', rc)], strategy, label, useBw ? 'B/W = S − C − K' : 'P+S = P + S − K');
  }
  if (blank === 'put') {
    return question(category, label, 'Solve for Put.', [field(label, strategy), field('Stock', S), field('Strike', K), field('Call', C), field('r/c', rc)], P, 'Put', useBw ? 'B/W = S − C − K' : 'P+S = P + S − K');
  }
  return question(category, label, 'Solve for Call.', [field(label, strategy), field('Stock', S), field('Strike', K), field('Put', P), field('r/c', rc)], C, 'Call', useBw ? 'B/W = S − C − K' : 'P+S = P + S − K');
}

export function parseCents(input) {
  const trimmed = input.trim();
  if (!/^[+-]?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(trimmed)) return null;
  const negative = trimmed.startsWith('-');
  const body = trimmed.replace(/^[+-]/, '');
  const [whole, fraction = ''] = body.split('.');
  const cents = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  return negative ? -cents : cents;
}
