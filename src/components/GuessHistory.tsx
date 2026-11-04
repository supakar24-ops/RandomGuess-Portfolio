import type { Guess } from '../game';

const proximityLabels = { red: 'ยังไกล', yellow: 'ใกล้แล้ว', green: 'ถูกต้อง' };
const directionLabels = { high: 'มากเกินไป', low: 'น้อยเกินไป', correct: 'ถูกต้อง' };

export function GuessHistory({ history }: { history: Guess[] }) {
  return (
    <section className="history" aria-labelledby="history-title">
      <div className="section-heading">
        <h2 id="history-title">เส้นทางการทาย</h2>
        <span className="small-label">GUESS HISTORY <span className="history-count">{history.length}</span></span>
      </div>
      {history.length === 0 ? (
        <div className="history-empty"><span aria-hidden="true">···</span> ทุกการทายคือเบาะแสใหม่ เริ่มเลขแรกได้เลย</div>
      ) : (
        <ol className="guess-list" aria-label="ประวัติการทาย">
          {history.map((guess, index) => (
            <li key={index} className={`guess-chip ${guess.proximity}`}>
              <span className="guess-order">{String(index + 1).padStart(2, '0')}</span>
              <strong>{guess.value}</strong>
              <span className="guess-direction" aria-label={directionLabels[guess.direction]}>
                {guess.direction === 'high' ? '↓' : guess.direction === 'low' ? '↑' : '✓'}
              </span>
              <span className="guess-proximity">{proximityLabels[guess.proximity]}</span>
            </li>
          ))}
        </ol>
      )}
      <div className="history-legend" aria-label="ความหมายของสี">
        <span><i className="legend-dot red" />ยังไกล</span>
        <span><i className="legend-dot yellow" />ใกล้แล้ว ≤ 10%</span>
        <span><i className="legend-dot green" />ถูกต้อง</span>
      </div>
    </section>
  );
}
