export const DURATIONS = [30, 60, 120, 300, 600];
export const QUESTION_COUNTS = [5, 10, 20, 100];

export const initialSettings = {
  categories: ['putCall', 'combo', 'straddle', 'bwPs'],
  mode: 'timed',
  duration: 600,
  questionCount: 10,
};

export function isQuestionRoundComplete(settings, stats) {
  return settings.mode === 'questions' && stats.attempted >= settings.questionCount;
}
