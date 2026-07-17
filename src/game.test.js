import { describe, expect, it } from 'vitest';
import { CATEGORIES, assertMarket, bw, combo, generateQuestion, makeMarket, parseCents, ps, straddle } from './game';

const seeded = (values) => { let index = 0; return () => values[index++ % values.length]; };

describe('market generation', () => {
  it('generates positive cent values on a quarter-dollar strike grid', () => {
    for (let index = 0; index < 250; index += 1) {
      const market = makeMarket();
      expect(assertMarket(market)).toBe(true);
      expect(market.strike % 25).toBe(0);
    }
  });

  it('maintains every derivative identity', () => {
    const market = makeMarket(seeded([.4, .5, .3, .7]));
    expect(combo(market)).toBe(market.call - market.put);
    expect(straddle(market)).toBe(market.call + market.put);
    expect(bw(market)).toBe(market.stock - market.call - market.strike);
    expect(ps(market)).toBe(market.put + market.stock - market.strike);
  });
});

describe('questions', () => {
  it('only creates questions from selected categories with one numeric answer', () => {
    for (const { id } of CATEGORIES) {
      for (let index = 0; index < 40; index += 1) {
        const q = generateQuestion([id]);
        expect(q.category).toBe(id);
        expect(Number.isInteger(q.answer)).toBe(true);
        expect(q.fields.some((field) => field.label === q.answerLabel)).toBe(false);
      }
    }
  });

  it('rejects malformed answers and accepts equivalent decimal input', () => {
    expect(parseCents('12.5')).toBe(1250);
    expect(parseCents('-0.25')).toBe(-25);
    expect(parseCents('12.345')).toBeNull();
    expect(parseCents('')).toBeNull();
  });
});
