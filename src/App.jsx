import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, generateQuestion, money, parseCents } from './game';

const DURATIONS = [30, 60, 120, 300, 600];
const initialSettings = { categories: CATEGORIES.map(({ id }) => id), duration: 600 };

function HowToPlay({ close }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={close}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="how-to-play" onMouseDown={(event) => event.stopPropagation()}>
      <button className="icon-button" onClick={close} aria-label="Close">×</button>
      <h2 id="how-to-play">How to play</h2>
      <p>Use put-call parity to solve the one missing price. Enter dollar decimals (for example, <code>12.50</code>); the next drill appears the instant your answer is correct.</p>
      <p><code>C − P = S − K + r/c</code></p>
      <p><strong>r/c</strong> is signed exactly as shown. Other identities: <code>Combo = C − P</code>, <code>Straddle = C + P</code>, <code>B/W = S − C − K</code>, and <code>P+S = P + S − K</code>.</p>
      <p>“Show answer” moves on without a point. Try to make as many correct solves as you can before the clock ends.</p>
    </section>
  </div>;
}

function Setup({ settings, setSettings, start }) {
  const [showHelp, setShowHelp] = useState(false);
  const toggle = (id) => setSettings((current) => ({ ...current, categories: current.categories.includes(id) ? current.categories.filter((category) => category !== id) : [...current.categories, id] }));
  return <main className="card setup-card">
    <p className="eyebrow">OPTIONS MARKET MAKING</p>
    <h1>Parity Prep</h1>
    <p className="subtitle">A put-call parity speed drill.</p>
    <fieldset><legend>Question types</legend>{CATEGORIES.map(({ id, label }) => <label className="check-row" key={id}><input type="checkbox" checked={settings.categories.includes(id)} onChange={() => toggle(id)} />{label}</label>)}</fieldset>
    <label className="duration">Duration<select value={settings.duration} onChange={(event) => setSettings((current) => ({ ...current, duration: Number(event.target.value) }))}>{DURATIONS.map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds</option>)}</select></label>
    <div className="button-row"><button className="secondary" onClick={() => setShowHelp(true)}>How to Play</button><button className="primary" onClick={start} disabled={!settings.categories.length}>Start</button></div>
    {showHelp && <HowToPlay close={() => setShowHelp(false)} />}
  </main>;
}

function Game({ settings, finish }) {
  const [current, setCurrent] = useState(() => generateQuestion(settings.categories));
  const [input, setInput] = useState('');
  const [stats, setStats] = useState({ score: 0, attempted: 1, correct: 0, shown: 0 });
  const [remaining, setRemaining] = useState(settings.duration);
  const [revealing, setRevealing] = useState(false);
  const [formulaVisible, setFormulaVisible] = useState(false);
  const inputRef = useRef(null);
  const advancing = useRef(false);

  useEffect(() => { inputRef.current?.focus(); }, [current]);
  useEffect(() => {
    if (remaining <= 0) { finish(stats); return undefined; }
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, stats, finish]);

  const next = (correct) => {
    if (advancing.current) return;
    advancing.current = true;
    setStats((old) => ({ score: old.score + (correct ? 1 : 0), correct: old.correct + (correct ? 1 : 0), shown: old.shown + (correct ? 0 : 1), attempted: old.attempted + 1 }));
    setCurrent(generateQuestion(settings.categories));
    setInput('');
    setFormulaVisible(false);
    window.setTimeout(() => { advancing.current = false; }, 0);
  };
  const change = (value) => { setInput(value); if (!revealing && parseCents(value) === current.answer) next(true); };
  const showAnswer = () => {
    if (revealing) return;
    setRevealing(true);
    setInput((current.answer / 100).toFixed(2));
    window.setTimeout(() => { setRevealing(false); next(false); }, 850);
  };
  const minutes = Math.floor(remaining / 60); const seconds = String(remaining % 60).padStart(2, '0');
  return <main className="card game-card">
    <header className="game-header"><div><span className="stat-label">TIME</span><strong>{minutes}:{seconds}</strong></div><div><span className="stat-label">SCORE</span><strong>{stats.score}</strong></div></header>
    <p className="eyebrow">{current.title}</p>
    <div className="values"><div className="value target-value"><span>Target</span><strong>{current.answerLabel} = ?</strong></div>{current.fields.map(({ label, value }) => <div className="value" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="formula-control"><button className="formula-button" onClick={() => setFormulaVisible((visible) => !visible)}>{formulaVisible ? 'Hide Formula' : 'Show Formula'}</button>{formulaVisible && <p className="formula">{current.formula}</p>}</div>
    <label className="answer-label">{current.answerLabel}<input ref={inputRef} aria-label={`Answer for ${current.answerLabel}`} inputMode="decimal" autoComplete="off" value={input} onChange={(event) => change(event.target.value)} /></label>
    <button className="secondary answer-button" onClick={showAnswer} disabled={revealing}>{revealing ? `Answer: ${money(current.answer, current.answerLabel === 'r/c')}` : 'Show Answer'}</button>
  </main>;
}

function Results({ stats, restart }) {
  return <main className="card results-card"><p className="eyebrow">TIME'S UP</p><h1>{stats.score} correct</h1><p className="subtitle">You completed {stats.correct} correct solves from {stats.attempted - 1} questions.</p><div className="results-grid"><div><span>Correct</span><strong>{stats.correct}</strong></div><div><span>Answers shown</span><strong>{stats.shown}</strong></div></div><button className="primary" onClick={restart}>Play again</button></main>;
}

export default function App() {
  const [settings, setSettings] = useState(initialSettings);
  const [state, setState] = useState('setup');
  const [results, setResults] = useState(null);
  const finish = (stats) => { setResults(stats); setState('results'); };
  return <div className="app-shell">{state === 'setup' && <Setup settings={settings} setSettings={setSettings} start={() => setState('game')} />}{state === 'game' && <Game settings={settings} finish={finish} />}{state === 'results' && <Results stats={results} restart={() => setState('setup')} />}</div>;
}
