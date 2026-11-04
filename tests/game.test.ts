import { describe, expect, it } from 'vitest';
import {
  classifyProximity, createGame, detectStatus, DIFFICULTIES, generateTarget,
  getAttempts, submitGuess, updateRange, validateGuess,
  type Difficulty, type GameState,
} from '../src/game';

const modes = Object.keys(DIFFICULTIES) as Difficulty[];
const normal = (): GameState => ({ ...createGame('normal', () => 0), target: 68 });

describe('target generation and initial state', () => {
  it.each(modes)('%s includes both endpoints and generates every integer in range', (mode) => {
    const config = DIFFICULTIES[mode];
    expect(generateTarget(mode, () => 0)).toBe(1);
    expect(generateTarget(mode, () => 0.999999999)).toBe(config.max);
    // Check every random bucket, including modes whose ranges exceed 100.
    for (let value = 1; value <= config.max; value++) {
      expect(generateTarget(mode, () => (value - 0.5) / config.max)).toBe(value);
    }
    const game = createGame(mode, () => 0.5);
    expect(game).toMatchObject({ difficulty: mode, min: 1, max: config.max, status: 'playing', history: [] });
    expect(getAttempts(game)).toEqual({ used: 0, remaining: config.maxAttempts });
  });

  it.each([['easy', 5], ['normal', 10], ['hard', 15]] as const)('%s allows exactly %i attempts', (mode, maximum) => {
    let game = createGame(mode, () => 0.999999);
    for (let value = 1; value <= maximum; value++) game = submitGuess(game, String(value)).game;
    expect(game.status).toBe('lost');
    expect(getAttempts(game)).toEqual({ used: maximum, remaining: 0 });
    expect(game.target).toBe(DIFFICULTIES[mode].max);
  });
});

describe('range narrowing', () => {
  it('follows the specified 80 → 50 example with target 68', () => {
    let game = normal();
    game = submitGuess(game, '80').game;
    expect(game).toMatchObject({ min: 1, max: 79 });
    expect(game.history[0].direction).toBe('high');
    game = submitGuess(game, '50').game;
    expect(game).toMatchObject({ min: 51, max: 79 });
    expect(game.history[1].direction).toBe('low');
  });

  it.each(modes)('%s never cuts the target out, including both range boundaries', (mode) => {
    const { max } = DIFFICULTIES[mode];
    for (let target = 1; target <= max; target++) {
      let min = 1;
      let upper: number = max;
      while (min < upper) {
        const guess = Math.floor((min + upper) / 2);
        ({ min, max: upper } = updateRange(min, upper, guess, target));
        expect(min).toBeLessThanOrEqual(target);
        expect(upper).toBeGreaterThanOrEqual(target);
      }
      expect(min).toBe(target);
    }
  });
});

describe('validation and history', () => {
  it.each(['', ' ', 'abc', '1.5', 'NaN', 'Infinity', '1e1', '0x10', '9007199254740993', '0', '-1', '101'])('rejects %j without changing attempts or history', (input) => {
    const game = normal();
    const result = submitGuess(game, input);
    expect(result.error).not.toBeNull();
    expect(result.game).toBe(game);
    expect(getAttempts(result.game)).toEqual({ used: 0, remaining: 10 });
    expect(result.game.history).toEqual([]);
  });

  it('rejects duplicates before range errors, including alternate leading-zero spelling', () => {
    const game = submitGuess(normal(), '80').game;
    expect(validateGuess('80', game)).toContain('ทายเลขนี้แล้ว');
    expect(validateGuess('080', game)).toContain('ทายเลขนี้แล้ว');
    expect(submitGuess(game, '80').game).toBe(game);
  });

  it('rejects numbers outside the narrowed range, preserving the input state', () => {
    const game = submitGuess(normal(), '80').game;
    expect(validateGuess('90', game)).toContain('1–79');
    expect(submitGuess(game, '90').game).toBe(game);
  });

  it('retains all valid guesses in chronological order without mutating prior state', () => {
    const original = normal();
    let game = original;
    for (const input of ['80', '50', '60', '68']) game = submitGuess(game, input).game;
    expect(game.history.map((guess) => guess.value)).toEqual([80, 50, 60, 68]);
    expect(game.history.map((guess) => guess.proximity)).toEqual(['red', 'red', 'yellow', 'green']);
    expect(original.history).toEqual([]);
    expect(getAttempts(game)).toEqual({ used: 4, remaining: 6 });
  });
});

describe('proximity uses the full difficulty range', () => {
  it.each(modes)('%s has exact red/yellow/green boundaries on both sides', (mode) => {
    const { threshold, max } = DIFFICULTIES[mode];
    const target = max / 2;
    expect(classifyProximity(target, target, mode)).toBe('green');
    for (const sign of [-1, 1]) {
      expect(classifyProximity(target + sign * threshold, target, mode)).toBe('yellow');
      expect(classifyProximity(target + sign * (threshold + 1), target, mode)).toBe('red');
    }
  });

  it('does not shrink the threshold when the possible range becomes smaller', () => {
    let game = submitGuess(normal(), '80').game;
    game = submitGuess(game, '50').game;
    game = submitGuess(game, '78').game;
    expect(game.history.at(-1)?.proximity).toBe('yellow'); // 10 away, although only 27 values remain.
  });
});

describe('win, lose and reset', () => {
  it('wins on the final attempt, ahead of loss detection', () => {
    let game = createGame('easy', () => 0.999);
    for (const value of [1, 2, 3, 4, 10]) game = submitGuess(game, String(value)).game;
    expect(game.status).toBe('won');
    expect(game).toMatchObject({ min: 10, max: 10 });
    expect(game.history.at(-1)?.proximity).toBe('green');
    expect(getAttempts(game).remaining).toBe(0);
  });

  it.each(['won', 'lost'] as const)('rejects any guess after %s', (status) => {
    const game = { ...normal(), status };
    const result = submitGuess(game, '68');
    expect(result.game).toBe(game);
    expect(result.error).toContain('เกมจบแล้ว');
  });

  it('detects all three states', () => {
    expect(detectStatus(false, 3, 5)).toBe('playing');
    expect(detectStatus(false, 5, 5)).toBe('lost');
    expect(detectStatus(true, 5, 5)).toBe('won');
  });

  it('restart and mode changes reset every game field and regenerate the target', () => {
    const oldGame = submitGuess(normal(), '68').game;
    for (const mode of modes) {
      const game = createGame(mode, () => 0);
      expect(game.target).toBe(1);
      expect(game.target).not.toBe(oldGame.target);
      expect(game).toEqual({ difficulty: mode, target: 1, min: 1, max: DIFFICULTIES[mode].max, history: [], status: 'playing' });
      expect(getAttempts(game).used).toBe(0);
    }
  });
});
