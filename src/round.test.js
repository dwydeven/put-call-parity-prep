import { describe, expect, it } from 'vitest';
import { DURATIONS, QUESTION_COUNTS, initialSettings, isQuestionRoundComplete } from './round';

describe('round settings', () => {
  it('defaults to a ten-minute timed round and retains a ten-question default', () => {
    expect(initialSettings).toMatchObject({ mode: 'timed', duration: 600, questionCount: 10 });
    expect(DURATIONS).toEqual([30, 60, 120, 300, 600]);
    expect(QUESTION_COUNTS).toEqual([5, 10, 20, 100]);
  });
});

describe('question round completion', () => {
  it.each(QUESTION_COUNTS)('finishes exactly at %i attempted questions', (questionCount) => {
    const settings = { ...initialSettings, mode: 'questions', questionCount };
    expect(isQuestionRoundComplete(settings, { attempted: questionCount - 1 })).toBe(false);
    expect(isQuestionRoundComplete(settings, { attempted: questionCount })).toBe(true);
  });

  it('does not let attempted questions complete a timed round', () => {
    expect(isQuestionRoundComplete(initialSettings, { attempted: 100 })).toBe(false);
  });
});
