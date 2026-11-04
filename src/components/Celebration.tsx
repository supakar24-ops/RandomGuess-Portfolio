import type { CSSProperties } from 'react';

export function Celebration() {
  return (
    <div className="celebration" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <i key={i} style={{
          '--x': `${(i * 37) % 100}%`,
          '--delay': `${(i % 7) * 0.08}s`,
          '--rotation': `${i * 41}deg`,
          '--color': ['#d34f32', '#e7b844', '#34765a', '#8883b8'][i % 4],
        } as CSSProperties} />
      ))}
    </div>
  );
}
