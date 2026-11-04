import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createGame, DIFFICULTIES, getAttempts, submitGuess, type Difficulty } from './game';
import { GuessHistory } from './components/GuessHistory';
import { Celebration } from './components/Celebration';

export default function App() {
  const [game, setGame] = useState(() => createGame('normal'));
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const submissionLock = useRef(false);
  const config = DIFFICULTIES[game.difficulty];
  const attempts = getAttempts(game);
  const lastGuess = game.history.at(-1);
  const finished = game.status !== 'playing';
  const rangePercent = ((game.max - game.min + 1) / config.max) * 100;
  const rangeStart = ((game.min - 1) / config.max) * 100;

  useEffect(() => {
    submissionLock.current = false;
    if (game.status === 'playing') inputRef.current?.focus();
    else resultRef.current?.focus();
  }, [game]);

  function restart(difficulty = game.difficulty) {
    submissionLock.current = false;
    setGame(createGame(difficulty));
    setInput('');
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionLock.current || finished) return;
    const result = submitGuess(game, input);
    setError(result.error);
    if (result.error) {
      inputRef.current?.focus();
      return;
    }
    submissionLock.current = true;
    setInput('');
    setGame(result.game);
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#main" aria-label="Random Guess ไปยังเกม">
          <span className="brand-mark" aria-hidden="true">?<i /></span>
          <span>Random Guess<span className="brand-caption">A LITTLE LOGIC. A LITTLE LUCK.</span></span>
        </a>
        <span className="header-note"><span className="status-dot" />พร้อมให้คุณลอง</span>
      </header>

      <main id="main" className="main-layout">
        <aside className="intro">
          <p className="eyebrow"><span />THE NUMBER IS OUT THERE</p>
          <h1 aria-label="Random Guess">Random{' '}<br /><span>Guess<span className="title-period">.</span></span></h1>
          <p className="intro-lead">ตัวเลขหนึ่งตัว<br />รอให้คุณค้นพบ</p>
          <p className="intro-description">ใช้สัญชาตญาณ เรียนรู้จากคำใบ้<br className="desktop-break" /> แล้วขยับเข้าใกล้คำตอบทีละก้าว</p>

          <div className="number-art" aria-hidden="true">
            <span className="art-orbit" /><span className="art-number n1">24</span>
            <span className="art-number n2">?</span><span className="art-number n3">68</span>
            <span className="art-star">✳</span><span className="art-caption">FOLLOW THE CLUES ↗</span>
          </div>

          <section className="how-to" aria-labelledby="how-title">
            <h2 id="how-title">วิธีเล่น <span>01 — 03</span></h2>
            <ol>
              <li><span>01</span>เลือกความยาก แล้วทายเลขในช่วงที่เหลือ</li>
              <li><span>02</span>ใช้คำใบ้ มากไป ↓ หรือน้อยไป ↑</li>
              <li><span>03</span>หาคำตอบให้เจอก่อนโอกาสจะหมด</li>
            </ol>
          </section>
        </aside>

        <article className="game-card" aria-label="เกม Random Guess">
          <div className="game-topline"><span className="small-label">LET’S PLAY</span><button className="restart-button" onClick={() => restart()}><span aria-hidden="true">↻</span> เริ่มใหม่</button></div>
          <fieldset className="difficulty-fieldset">
            <legend>เลือกระดับความท้าทาย</legend>
            <div className="difficulty-options">
              {(Object.keys(DIFFICULTIES) as Difficulty[]).map((difficulty) => {
                const mode = DIFFICULTIES[difficulty];
                return (
                  <label key={difficulty} className={`difficulty-option ${difficulty === game.difficulty ? 'selected' : ''}`}>
                    <input type="radio" name="difficulty" value={difficulty} checked={difficulty === game.difficulty} onChange={() => restart(difficulty)} />
                    <span className="difficulty-name">{mode.label}<span className="difficulty-indicator" aria-hidden="true">{difficulty === game.difficulty ? '●' : '○'}</span></span>
                    <span className="difficulty-detail">1–{mode.max} <span>·</span> {mode.maxAttempts} ครั้ง</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <section className={`range-panel ${game.status}`} aria-labelledby="range-title">
            {game.status === 'won' && <Celebration />}
            <div className="range-topline"><h2 id="range-title">{finished ? 'คำตอบที่ซ่อนอยู่' : 'คำตอบอยู่ในช่วงนี้'}</h2><span className="small-label">{game.status === 'won' ? 'VICTORY' : game.status === 'lost' ? 'GAME OVER' : 'POSSIBLE RANGE'}</span></div>
            {finished ? (
              <div className="result-content">
                <div className="answer-number">{game.target}<span aria-hidden="true">{game.status === 'won' ? '✓' : '?'}</span></div>
                <h3 ref={resultRef} tabIndex={-1}>{game.status === 'won' ? 'ยินดีด้วย คุณเจอคำตอบแล้ว!' : 'Game Over — หมดโอกาสแล้ว'}</h3>
                <p>ใช้ไป {attempts.used} จาก {config.maxAttempts} ครั้ง{game.status === 'lost' ? ' · ลองอีกครั้ง คุณทำได้' : ' · เก่งมาก นักสืบตัวเลข'}</p>
              </div>
            ) : (
              <>
                <div className="range-numbers" aria-label={`ช่วงที่เหลือ ${game.min} ถึง ${game.max}`}><span>{game.min}</span><span className="range-dash">—</span><span>{game.max}</span></div>
                <div className="range-track" aria-hidden="true"><span style={{ left: `${rangeStart}%`, width: `${rangePercent}%` }} /></div>
                <div className="range-extents"><span>1</span><span>เหลือ {game.max - game.min + 1} ตัวเลขที่เป็นไปได้</span><span>{config.max}</span></div>
              </>
            )}
          </section>

          <div className="attempts-row">
            <span>ใช้ไป <strong data-testid="attempts-used">{attempts.used}</strong><span className="muted"> / {config.maxAttempts}</span></span>
            <div className="attempt-pips" aria-hidden="true">{Array.from({ length: config.maxAttempts }, (_, i) => <i key={i} className={i < attempts.used ? 'used' : ''} />)}</div>
            <span>เหลือ <strong data-testid="attempts-remaining">{attempts.remaining}</strong> ครั้ง</span>
          </div>

          <div className={`feedback ${lastGuess ? lastGuess.proximity : ''}`} role="status" aria-live="polite" aria-atomic="true">
            <span className="feedback-icon" aria-hidden="true">{game.status === 'won' ? '✓' : game.status === 'lost' ? '↻' : lastGuess?.direction === 'high' ? '↓' : lastGuess?.direction === 'low' ? '↑' : '↗'}</span>
            <span>{game.status === 'won' ? `ทายถูกต้อง! คำตอบคือ ${game.target}` : game.status === 'lost' ? `คำตอบคือ ${game.target} พร้อมแก้มือไหม?` : lastGuess ? `${lastGuess.value} ${lastGuess.direction === 'high' ? 'มากเกินไป' : 'น้อยเกินไป'} · ${lastGuess.proximity === 'yellow' ? 'ใกล้แล้ว ลองอีกนิด' : 'ลองขยับเข้าใกล้อีกหน่อย'}` : 'เลขแรกของคุณคืออะไร? ลองทายดูเลย'}</span>
          </div>

          <form onSubmit={handleSubmit} noValidate className="guess-form">
            <label htmlFor="guess-input">ทายตัวเลขของคุณ</label>
            <div className="input-row">
              <input id="guess-input" ref={inputRef} type="text" inputMode="numeric" autoComplete="off" value={input} disabled={finished} placeholder={finished ? 'เกมจบแล้ว' : `${game.min}–${game.max}`} onChange={(event) => { setInput(event.target.value); setError(null); }} aria-invalid={!!error} aria-describedby={error ? 'input-error' : 'input-help'} />
              <button className="guess-button" type="submit" disabled={finished}>Guess <span aria-hidden="true">↗</span></button>
            </div>
            <div className="input-meta">
              {error ? <p id="input-error" role="alert">{error}</p> : <p id="input-help">{finished ? 'กดเล่นอีกครั้งเพื่อเริ่มรอบใหม่' : 'กรอกจำนวนเต็มในช่วงที่เหลือ'}<span>{!finished && <>กด <kbd>Enter ↵</kbd> เพื่อทาย</>}</span></p>}
            </div>
          </form>

          <GuessHistory history={game.history} />
          {finished && <button className="play-again-button" onClick={() => restart()}>เล่นอีกครั้ง · Play Again <span aria-hidden="true">↻</span></button>}
          <div className="card-footnote"><span aria-hidden="true">✧</span> ทุกคำใบ้ช่วยให้คุณเข้าใกล้ขึ้น</div>
        </article>
      </main>

      <footer className="site-footer"><span>RANDOM GUESS <span className="footer-slash">/</span> THINK. GUESS. DISCOVER.</span><span>สร้างมาให้คิด เล่นมาให้สนุก <span aria-hidden="true">↗</span></span></footer>
    </div>
  );
}
