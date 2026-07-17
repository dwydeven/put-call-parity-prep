export const CATEGORIES = [
  { id: 'putCall', label: 'Put-Call' },
  { id: 'combo', label: 'Combo' },
  { id: 'straddle', label: 'Straddle' },
  { id: 'bwPs', label: 'B/W and P+S' },
];

const randomInt = (min, max, random = Math.random) => Math.floor(random() * (max - min + 1)) + min;
const pick = (items, random) => items[randomInt(0, items.length - 1, random)];

// All values are cents. K is deliberately chosen in 25-cent ticks.
export function makeMarket(random = Math.random) {
  const stock = randomInt(1000, 50000, random);
  const lowStrike = Math.max(25, Math.ceil((stock - 10000) / 25) * 25);
  const highStrike = Math.min(50000, Math.floor((stock + 10000) / 25) * 25);
  const strike = randomInt(lowStrike / 25, highStrike / 25, random) * 25;
  const put = randomInt(1, 10000, random);
  const call = randomInt(1, 10000, random);
  const rc = call - put - stock + strike;
  return { stock, strike, put, call, rc };
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
  const market = makeMarket(random);
  assertMarket(market);
  const { stock: S, strike: K, put: P, call: C, rc } = market;
  const category = pick(selected, random);

  if (category === 'putCall') {
    const kind = pick(['put', 'call', 'stock', 'strike', 'rc'], random);
    const base = [field('Stock', S), field('Strike', K), field('Put', P), field('Call', C), field('r/c', rc)];
    const labels = { put: 'Put', call: 'Call', stock: 'Stock', strike: 'Strike', rc: 'r/c' };
    const answer = { put: P, call: C, stock: S, strike: K, rc }[kind];
    return question(category, 'Put-Call', `Solve for ${labels[kind]}.`, base.filter((item) => item.label !== labels[kind]), answer, labels[kind], 'C − P = S − K + r/c');
  }

  if (category === 'combo') {
    const value = combo(market);
    const kind = pick(['combo', 'stock', 'call', 'put'], random);
    const templates = {
      combo: ['Combo', value, [field('Stock', S), field('Strike', K), field('Put', P), field('Call', C), field('r/c', rc)]],
      stock: ['Stock', S, [field('Combo', value), field('Strike', K), field('Put', P), field('Call', C), field('r/c', rc)]],
      call: ['Call', C, [field('Combo', value), field('Stock', S), field('Strike', K), field('Put', P), field('r/c', rc)]],
      put: ['Put', P, [field('Combo', value), field('Stock', S), field('Strike', K), field('Call', C), field('r/c', rc)]],
    };
    const [answerLabel, answer, fields] = templates[kind];
    return question(category, 'Combo', `Solve for ${answerLabel}.`, fields, answer, answerLabel, 'Combo = C − P = S − K + r/c');
  }

  if (category === 'straddle') {
    const value = straddle(market);
    const kind = pick(['straddle', 'call', 'put'], random);
    const templates = {
      straddle: ['Straddle', value, [field('Stock', S), field('Strike', K), field('Put', P), field('Call', C), field('r/c', rc)]],
      call: ['Call', C, [field('Straddle', value), field('Stock', S), field('Strike', K), field('Put', P), field('r/c', rc)]],
      put: ['Put', P, [field('Straddle', value), field('Stock', S), field('Strike', K), field('Call', C), field('r/c', rc)]],
    };
    const [answerLabel, answer, fields] = templates[kind];
    return question(category, 'Straddle', `Solve for ${answerLabel}.`, fields, answer, answerLabel, 'Straddle = C + P');
  }

  const isBw = random() < 0.5;
  const label = isBw ? 'B/W' : 'P+S';
  const strategy = isBw ? bw(market) : ps(market);
  const kind = pick(isBw ? ['strategy', 'put', 'call'] : ['strategy', 'put', 'call'], random);
  if (kind === 'strategy') {
    return question(category, label, `Solve for ${label}.`, [field('Stock', S), field('Strike', K), field('Put', P), field('Call', C), field('r/c', rc)], strategy, label, isBw ? 'B/W = S − C − K' : 'P+S = P + S − K');
  }
  if (kind === 'put') {
    return question(category, label, 'Solve for Put.', [field(label, strategy), field('Stock', S), field('Strike', K), field('Call', C), field('r/c', rc)], P, 'Put', isBw ? 'B/W = S − C − K' : 'P+S = P + S − K');
  }
  return question(category, label, 'Solve for Call.', [field(label, strategy), field('Stock', S), field('Strike', K), field('Put', P), field('r/c', rc)], C, 'Call', isBw ? 'B/W = S − C − K' : 'P+S = P + S − K');
}

export function parseCents(input) {
  const trimmed = input.trim();
  if (!/^[+-]?\d+(?:\.\d{0,2})?$/.test(trimmed)) return null;
  const negative = trimmed.startsWith('-');
  const body = trimmed.replace(/^[+-]/, '');
  const [whole, fraction = ''] = body.split('.');
  const cents = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  return negative ? -cents : cents;
}
