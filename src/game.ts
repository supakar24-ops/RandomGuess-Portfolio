export type Difficulty = 'easy' | 'normal' | 'hard';
export type GameStatus = 'playing' | 'won' | 'lost';
export type Proximity = 'red' | 'yellow' | 'green';
export type Direction = 'high' | 'low' | 'correct';

export const DIFFICULTIES = {
  easy: { label: 'Easy', min: 1, max: 10, maxAttempts: 5, threshold: 1 },
  normal: { label: 'Normal', min: 1, max: 100, maxAttempts: 10, threshold: 10 },
  hard: { label: 'Hard', min: 1, max: 1000, maxAttempts: 15, threshold: 100 },
} as const;

export interface Guess {
  value: number;
  direction: Direction;
  proximity: Proximity;
}

export interface GameState {
  difficulty: Difficulty;
  target: number;
  min: number;
  max: number;
  history: Guess[];
  status: GameStatus;
}

export function generateTarget(difficulty: Difficulty, random = Math.random): number {
  const { min, max } = DIFFICULTIES[difficulty];
  return Math.floor(random() * (max - min + 1)) + min;
}

// Also used for restart and difficulty changes: no previous round state is retained.
export function createGame(difficulty: Difficulty, random = Math.random): GameState {
  const config = DIFFICULTIES[difficulty];
  return {
    difficulty,
    target: generateTarget(difficulty, random),
    min: config.min,
    max: config.max,
    history: [],
    status: 'playing',
  };
}

export function getAttempts(game: GameState) {
  return {
    used: game.history.length,
    remaining: DIFFICULTIES[game.difficulty].maxAttempts - game.history.length,
  };
}

export function validateGuess(input: string, game: GameState): string | null {
  if (game.status !== 'playing') return 'เกมจบแล้ว กดเล่นอีกครั้งเพื่อเริ่มเกมใหม่';
  if (!input.trim()) return 'กรุณากรอกตัวเลขก่อนทาย';
  if (!/^[+-]?\d+$/.test(input.trim()) || !Number.isSafeInteger(Number(input))) {
    return 'กรุณากรอกเป็นจำนวนเต็มเท่านั้น';
  }
  const value = Number(input);
  if (game.history.some((guess) => guess.value === value)) return 'คุณทายเลขนี้แล้ว ลองเลขอื่นนะ';
  if (value < game.min || value > game.max) return `กรุณาทายเลขในช่วง ${game.min}–${game.max}`;
  return null;
}

export function classifyProximity(value: number, target: number, difficulty: Difficulty): Proximity {
  const distance = Math.abs(value - target);
  if (distance === 0) return 'green';
  return distance <= DIFFICULTIES[difficulty].threshold ? 'yellow' : 'red';
}

export function updateRange(min: number, max: number, value: number, target: number) {
  if (value === target) return { min: target, max: target };
  return value > target ? { min, max: value - 1 } : { min: value + 1, max };
}

export function detectStatus(correct: boolean, attemptsUsed: number, maximum: number): GameStatus {
  if (correct) return 'won';
  return attemptsUsed >= maximum ? 'lost' : 'playing';
}

export function submitGuess(game: GameState, input: string): { game: GameState; error: string | null } {
  const error = validateGuess(input, game);
  if (error) return { game, error };

  const value = Number(input);
  const guess: Guess = {
    value,
    direction: value === game.target ? 'correct' : value > game.target ? 'high' : 'low',
    proximity: classifyProximity(value, game.target, game.difficulty),
  };
  const history = [...game.history, guess];
  return {
    error: null,
    game: {
      ...game,
      ...updateRange(game.min, game.max, value, game.target),
      history,
      status: detectStatus(value === game.target, history.length, DIFFICULTIES[game.difficulty].maxAttempts),
    },
  };
}
