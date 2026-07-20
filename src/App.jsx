import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { CATEGORIES, generateQuestion, money, parseCents } from './game';
import { DURATIONS, QUESTION_COUNTS, initialSettings, isQuestionRoundComplete } from './round';

function HowToPlay({ close }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={close}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="how-to-play" onMouseDown={(event) => event.stopPropagation()}>
      <button className="icon-button" onClick={close} aria-label="Close">×</button>
      <h2 id="how-to-play">How to play</h2>
      <p>Use put-call parity to solve the one missing price. Enter dollar decimals (for example, <code>12.50</code>); the next drill appears the instant your answer is correct.</p>
      <p><code>C − P = S − K + r/c</code></p>
      <p><strong>r/c</strong> is signed exactly as shown. Other identities: <code>Combo = C − P</code>, <code>Straddle = C + P</code>, <code>B/W = S − C − K</code>, and <code>P+S = P + S − K</code>.</p>
      <p>“Show answer” consumes the current question without awarding a point. Choose a timed round to solve against the clock, or a question round to complete a fixed number of questions.</p>
    </section>
  </div>;
}

function InstallHelp({ close, offlineReady }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={close}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="install-on-iphone" onMouseDown={(event) => event.stopPropagation()}>
      <button className="icon-button" onClick={close} aria-label="Close">×</button>
      <h2 id="install-on-iphone">Install on iPhone</h2>
      <ol className="install-steps">
        <li>Open this page in Safari while you are online.</li>
        <li>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</li>
        <li>Turn on <strong>Open as Web App</strong>, then tap <strong>Add</strong>.</li>
      </ol>
      <p className={`offline-status ${offlineReady ? 'is-ready' : ''}`} role="status">{offlineReady ? 'Ready for offline use.' : 'Keep this page open briefly while the offline copy finishes installing.'}</p>
      <p>After that, launch Parity Prep from its Home Screen icon—even in Airplane Mode.</p>
    </section>
  </div>;
}

export function Setup({ settings, setSettings, start, standalone, offlineReady }) {
  const [showHelp, setShowHelp] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const toggle = (id) => setSettings((current) => ({ ...current, categories: current.categories.includes(id) ? current.categories.filter((category) => category !== id) : [...current.categories, id] }));
  return <main className="card setup-card">
    <p className="eyebrow">OPTIONS MARKET MAKING</p>
    <h1>Parity Prep</h1>
    <p className="subtitle">A put-call parity speed drill.</p>
    {!standalone && <button className="install-link" onClick={() => setShowInstall(true)}>Install on iPhone</button>}
    <fieldset><legend>Question types</legend>{CATEGORIES.map(({ id, label }) => <label className="check-row" key={id}><input type="checkbox" checked={settings.categories.includes(id)} onChange={() => toggle(id)} />{label}</label>)}</fieldset>
    <fieldset className="round-format"><legend>Round format</legend><div className="format-toggle">
      <button type="button" aria-pressed={settings.mode === 'timed'} className={settings.mode === 'timed' ? 'is-active' : ''} onClick={() => setSettings((current) => ({ ...current, mode: 'timed' }))}>Timed</button>
      <button type="button" aria-pressed={settings.mode === 'questions'} className={settings.mode === 'questions' ? 'is-active' : ''} onClick={() => setSettings((current) => ({ ...current, mode: 'questions' }))}>Questions</button>
    </div></fieldset>
    {settings.mode === 'timed'
      ? <label className="round-length">Duration<select value={settings.duration} onChange={(event) => setSettings((current) => ({ ...current, duration: Number(event.target.value) }))}>{DURATIONS.map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds</option>)}</select></label>
      : <label className="round-length">Number of questions<select value={settings.questionCount} onChange={(event) => setSettings((current) => ({ ...current, questionCount: Number(event.target.value) }))}>{QUESTION_COUNTS.map((count) => <option key={count} value={count}>{count} questions</option>)}</select></label>}
    <div className="button-row"><button className="secondary" onClick={() => setShowHelp(true)}>How to Play</button><button className="primary" onClick={start} disabled={!settings.categories.length}>Start</button></div>
    {showHelp && <HowToPlay close={() => setShowHelp(false)} />}
    {showInstall && <InstallHelp close={() => setShowInstall(false)} offlineReady={offlineReady} />}
  </main>;
}

export function Game({ settings, finish }) {
  const [current, setCurrent] = useState(() => generateQuestion(settings.categories));
  const [input, setInput] = useState('');
  const [stats, setStats] = useState({ score: 0, attempted: 0, correct: 0, shown: 0 });
  const [remaining, setRemaining] = useState(settings.duration);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [answerShown, setAnswerShown] = useState(false);
  const [formulaVisible, setFormulaVisible] = useState(false);
  const inputRef = useRef(null);
  const advancing = useRef(false);

  useEffect(() => { inputRef.current?.focus(); }, [current]);
  useEffect(() => {
    if (settings.mode !== 'timed') return undefined;
    if (remaining <= 0) { finish(stats); return undefined; }
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, settings.mode, stats, finish]);

  const nextQuestion = () => {
    if (advancing.current) return;
    advancing.current = true;
    setCurrent(generateQuestion(settings.categories));
    setInput('');
    setFormulaVisible(false);
    setAnswerShown(false);
    setQuestionNumber((number) => number + 1);
    window.setTimeout(() => { advancing.current = false; }, 0);
  };
  const change = (value) => {
    if (advancing.current) return;
    setInput(value);
    if (!answerShown && parseCents(value) === current.answer) {
      const nextStats = { ...stats, score: stats.score + 1, correct: stats.correct + 1, attempted: stats.attempted + 1 };
      setStats(nextStats);
      if (isQuestionRoundComplete(settings, nextStats)) finish(nextStats);
      else nextQuestion();
    }
  };
  const showAnswer = () => {
    if (answerShown) return;
    setAnswerShown(true);
    setInput((current.answer / 100).toFixed(2));
    setStats((old) => ({ ...old, shown: old.shown + 1, attempted: old.attempted + 1 }));
  };
  const advanceAfterReveal = () => {
    if (isQuestionRoundComplete(settings, stats)) finish(stats);
    else nextQuestion();
  };
  const minutes = Math.floor(remaining / 60); const seconds = String(remaining % 60).padStart(2, '0');
  return <main className="card game-card">
    <header className="game-header"><div><span className="stat-label">{settings.mode === 'timed' ? 'TIME' : 'QUESTION'}</span><strong>{settings.mode === 'timed' ? `${minutes}:${seconds}` : `${questionNumber} / ${settings.questionCount}`}</strong></div><div><span className="stat-label">SCORE</span><strong>{stats.score}</strong></div></header>
    <p className="eyebrow">{current.title}</p>
    <div className="values"><div className="value target-value"><span>Target</span><strong>{current.answerLabel} = ?</strong></div>{current.fields.map(({ label, value }) => <div className="value" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="formula-control"><button className="formula-button" onClick={() => setFormulaVisible((visible) => !visible)}>{formulaVisible ? 'Hide Formula' : 'Show Formula'}</button>{formulaVisible && <p className="formula">{current.formula}</p>}</div>
    <label className="answer-label">{current.answerLabel}<input ref={inputRef} aria-label={`Answer for ${current.answerLabel}`} inputMode="decimal" autoComplete="off" value={input} onChange={(event) => change(event.target.value)} /></label>
    <button className="secondary answer-button" onClick={answerShown ? advanceAfterReveal : showAnswer}>{answerShown ? (isQuestionRoundComplete(settings, stats) ? 'Finish' : 'Next Question') : 'Show Answer'}</button>
  </main>;
}

export function Results({ stats, restart }) {
  return <main className="card results-card"><p className="eyebrow">{stats.mode === 'timed' ? "TIME'S UP" : 'ROUND COMPLETE'}</p><h1>{stats.score} correct</h1><p className="subtitle">You completed {stats.correct} correct solves from {stats.attempted} questions.</p><div className="results-grid"><div><span>Correct</span><strong>{stats.correct}</strong></div><div><span>Answers shown</span><strong>{stats.shown}</strong></div></div><button className="primary" onClick={restart}>Play again</button></main>;
}

export default function App() {
  const [settings, setSettings] = useState(initialSettings);
  const [state, setState] = useState('setup');
  const [results, setResults] = useState(null);
  const [offlineReady, setOfflineReady] = useState(() => Boolean(navigator.serviceWorker?.controller));
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({ immediate: true });

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    let active = true;
    navigator.serviceWorker.ready.then(() => { if (active) setOfflineReady(true); });
    return () => { active = false; };
  }, []);

  // Activate a downloaded update only from the setup screen. This prevents a
  // service-worker refresh from interrupting a timed drill or results review.
  useEffect(() => {
    if (state === 'setup' && needRefresh) updateServiceWorker(true);
  }, [state, needRefresh, updateServiceWorker]);

  const finish = (stats) => { setResults({ ...stats, mode: settings.mode }); setState('results'); };
  return <div className="app-shell">{state === 'setup' && <Setup settings={settings} setSettings={setSettings} start={() => setState('game')} standalone={standalone} offlineReady={offlineReady} />}{state === 'game' && <Game settings={settings} finish={finish} />}{state === 'results' && <Results stats={results} restart={() => setState('setup')} />}</div>;
}
