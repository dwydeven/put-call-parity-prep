/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App, { Game, Results } from './App';
import { generateQuestion } from './game';
import { initialSettings } from './round';

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false], updateServiceWorker: vi.fn() }),
}));

vi.mock('./game', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generateQuestion: vi.fn(() => ({
      title: 'Put-Call',
      answer: 125,
      answerLabel: 'Put',
      fields: [{ label: 'Call', value: '$2.00' }],
      formula: 'C − P = S − K + r/c',
    })),
  };
});

beforeEach(() => {
  window.matchMedia = vi.fn(() => ({ matches: false }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('setup', () => {
  it('switches between independent timed and question settings', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'Timed' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Duration').value).toBe('600');

    fireEvent.click(screen.getByRole('button', { name: 'Questions' }));
    const questionSelect = screen.getByLabelText('Number of questions');
    expect(questionSelect.value).toBe('10');
    expect([...questionSelect.options].map(({ value }) => Number(value))).toEqual([5, 10, 20, 100]);
    fireEvent.change(questionSelect, { target: { value: '20' } });

    fireEvent.click(screen.getByRole('button', { name: 'Timed' }));
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: 'Questions' }));
    expect(screen.getByLabelText('Number of questions').value).toBe('20');
    fireEvent.click(screen.getByRole('button', { name: 'Timed' }));
    expect(screen.getByLabelText('Duration').value).toBe('120');
  });

  it('requires at least one selected question type', () => {
    render(<App />);

    for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
    expect(screen.getByRole('button', { name: 'Start' }).disabled).toBe(true);
  });
});

describe('game completion', () => {
  it('accepts an unsigned answer when the correct answer is negative', async () => {
    const finish = vi.fn();
    generateQuestion.mockImplementationOnce(() => ({
      title: 'Combo',
      answer: -25,
      answerLabel: 'Combo',
      fields: [{ label: 'Stock', value: '$2.00' }],
      formula: 'Combo = C − P',
    }));

    render(<Game settings={{ ...initialSettings, mode: 'questions', questionCount: 1 }} finish={finish} />);
    fireEvent.change(screen.getByLabelText('Answer for Combo'), { target: { value: '0.25' } });

    await waitFor(() => expect(finish).toHaveBeenCalledWith({ attempted: 1, correct: 1, score: 1, shown: 0 }));
  });

  it('finishes a question round exactly at its selected count', async () => {
    const finish = vi.fn();
    render(<Game settings={{ ...initialSettings, mode: 'questions', questionCount: 5 }} finish={finish} />);

    for (let number = 1; number <= 5; number += 1) {
      fireEvent.change(screen.getByLabelText('Answer for Put'), { target: { value: '1.25' } });
      if (number < 5) {
        await waitFor(() => expect(screen.getByText(`${number + 1} / 5`)).toBeTruthy());
      }
    }

    await waitFor(() => expect(finish).toHaveBeenCalledTimes(1));
    expect(finish.mock.calls[0][0]).toMatchObject({ attempted: 5, correct: 5, score: 5, shown: 0 });
    expect(generateQuestion).toHaveBeenCalledTimes(5);
  });

  it('keeps the final revealed answer visible until Finish is selected', () => {
    const finish = vi.fn();
    render(<Game settings={{ ...initialSettings, mode: 'questions', questionCount: 1 }} finish={finish} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show Answer' }));
    expect(screen.getByLabelText('Answer for Put').value).toBe('1.25');
    expect(screen.getByRole('button', { name: 'Finish' })).toBeTruthy();
    expect(finish).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(finish).toHaveBeenCalledWith({ attempted: 1, correct: 0, score: 0, shown: 1 });
  });

  it('does not start a countdown in question mode', () => {
    vi.useFakeTimers();
    const finish = vi.fn();
    render(<Game settings={{ ...initialSettings, mode: 'questions', questionCount: 5 }} finish={finish} />);

    act(() => vi.advanceTimersByTime(700_000));
    expect(finish).not.toHaveBeenCalled();
    expect(screen.getByText('1 / 5')).toBeTruthy();
  });

  it('preserves timer-based completion', async () => {
    vi.useFakeTimers();
    const finish = vi.fn();
    render(<Game settings={{ ...initialSettings, duration: 2 }} finish={finish} />);

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(finish).toHaveBeenCalledWith({ attempted: 0, correct: 0, score: 0, shown: 0 });
  });
});

describe('results', () => {
  it.each([
    ['timed', "TIME'S UP"],
    ['questions', 'ROUND COMPLETE'],
  ])('uses mode-specific completion copy for %s rounds', (mode, heading) => {
    render(<Results stats={{ mode, attempted: 5, correct: 4, score: 4, shown: 1 }} restart={vi.fn()} />);
    expect(screen.getByText(heading)).toBeTruthy();
    expect(screen.getByText('You completed 4 correct solves from 5 questions.')).toBeTruthy();
  });
});
