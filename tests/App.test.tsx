import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

const getInput = () => screen.getByRole('textbox', { name: 'ทายตัวเลขของคุณ' });
const getGuess = () => screen.getByRole('button', { name: 'Guess' });
const getHistory = () => screen.getByRole('list', { name: 'ประวัติการทาย' });

beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0.67)); // Normal target 68
afterEach(() => vi.restoreAllMocks());

describe('game interaction', () => {
  it('renders the title, default Normal mode and counters', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Random Guess' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Normal/ })).toBeChecked();
    expect(screen.getByLabelText('ช่วงที่เหลือ 1 ถึง 100')).toBeInTheDocument();
    expect(screen.getByTestId('attempts-used')).toHaveTextContent('0');
    expect(screen.getByTestId('attempts-remaining')).toHaveTextContent('10');
  });

  it('submits by button, clears the input, narrows range and restores focus', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(getInput(), '80');
    await user.click(getGuess());
    expect(getInput()).toHaveValue('');
    expect(getInput()).toHaveFocus();
    expect(screen.getByLabelText('ช่วงที่เหลือ 1 ถึง 79')).toBeInTheDocument();
    expect(screen.getByTestId('attempts-used')).toHaveTextContent('1');
    expect(screen.getByTestId('attempts-remaining')).toHaveTextContent('9');
    expect(screen.getByRole('status')).toHaveTextContent('มากเกินไป');
    expect(within(getHistory()).getByText('80').closest('li')).toHaveClass('red');
  });

  it('submits by Enter and keeps history in order with correct colors', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (const value of ['80', '50', '60']) {
      await user.type(getInput(), `${value}{Enter}`);
      expect(getInput()).toHaveValue('');
      expect(getInput()).toHaveFocus();
    }
    expect(within(getHistory()).getAllByRole('listitem').map((item) => item.querySelector('strong')?.textContent)).toEqual(['80', '50', '60']);
    expect(within(getHistory()).getByText('60').closest('li')).toHaveClass('yellow');
    expect(screen.getByRole('status')).toHaveTextContent('น้อยเกินไป');
    expect(screen.getByLabelText('ช่วงที่เหลือ 61 ถึง 79')).toBeInTheDocument();
  });

  it('shows validation errors without consuming attempts or adding history', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (const value of ['', '1.5', 'abc', '101']) {
      await user.clear(getInput());
      if (value) await user.type(getInput(), value);
      await user.click(getGuess());
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(getInput()).toHaveValue(value);
      expect(getInput()).toHaveFocus();
      expect(screen.getByTestId('attempts-used')).toHaveTextContent('0');
      expect(screen.queryByRole('list', { name: 'ประวัติการทาย' })).not.toBeInTheDocument();
    }
  });

  it('rejects a duplicate and a guess outside the remaining range', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(getInput(), '80{Enter}');
    await user.type(getInput(), '80{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('ทายเลขนี้แล้ว');
    await user.clear(getInput());
    await user.type(getInput(), '90{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('1–79');
    expect(within(getHistory()).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByTestId('attempts-used')).toHaveTextContent('1');
  });

  it('does not count repeated clicks or Enter presses as additional guesses', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(getInput(), '80');
    await user.dblClick(getGuess());
    await user.keyboard('{Enter}{Enter}');
    expect(screen.getByTestId('attempts-used')).toHaveTextContent('1');
    expect(within(getHistory()).getAllByRole('listitem')).toHaveLength(1);
  });

  it('wins, shows the answer and attempts, celebrates and blocks further input', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.type(getInput(), '68{Enter}');
    expect(screen.getByText('VICTORY')).toBeInTheDocument();
    expect(screen.getByText('ยินดีด้วย คุณเจอคำตอบแล้ว!')).toBeInTheDocument();
    expect(screen.getByText(/ใช้ไป 1 จาก 10 ครั้ง/)).toBeInTheDocument();
    expect(container.querySelector('.answer-number')).toHaveTextContent('68');
    expect(container.querySelector('.celebration')).toBeInTheDocument();
    expect(within(getHistory()).getByText('68').closest('li')).toHaveClass('green');
    expect(getInput()).toBeDisabled();
    expect(getInput()).toHaveValue('');
    expect(getInput()).not.toHaveFocus();
    expect(getGuess()).toBeDisabled();
    fireEvent.submit(getInput().closest('form')!);
    expect(screen.getByTestId('attempts-used')).toHaveTextContent('1');
  });

  it('loses after 5 Easy attempts, reveals answer, keeps all history and can play again', async () => {
    const user = userEvent.setup();
    vi.mocked(Math.random).mockReturnValue(0.999);
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: /Easy/ }));
    for (let value = 1; value <= 5; value++) await user.type(getInput(), `${value}{Enter}`);
    expect(screen.getByText('GAME OVER')).toBeInTheDocument();
    expect(container.querySelector('.answer-number')).toHaveTextContent('10');
    expect(screen.getByText(/ใช้ไป 5 จาก 5 ครั้ง/)).toBeInTheDocument();
    expect(screen.getByTestId('attempts-remaining')).toHaveTextContent('0');
    expect(within(getHistory()).getAllByRole('listitem')).toHaveLength(5);
    expect(getInput()).toBeDisabled();
    expect(getInput()).not.toHaveFocus();
    fireEvent.submit(getInput().closest('form')!);
    expect(screen.getByTestId('attempts-used')).toHaveTextContent('5');
    await user.click(screen.getByRole('button', { name: /Play Again/ }));
    expect(screen.queryByText('GAME OVER')).not.toBeInTheDocument();
    expect(getInput()).toBeEnabled();
    expect(getInput()).toHaveFocus();
    expect(screen.getByLabelText('ช่วงที่เหลือ 1 ถึง 10')).toBeInTheDocument();
    expect(screen.getByTestId('attempts-remaining')).toHaveTextContent('5');
    expect(screen.queryByRole('list', { name: 'ประวัติการทาย' })).not.toBeInTheDocument();
  });

  it('restarts with a new target and clears range, history, attempts, error and input', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(getInput(), '80{Enter}');
    await user.type(getInput(), '90{Enter}');
    vi.mocked(Math.random).mockReturnValue(0.41); // New answer 42
    await user.click(screen.getByRole('button', { name: /เริ่มใหม่/ }));
    expect(screen.getByLabelText('ช่วงที่เหลือ 1 ถึง 100')).toBeInTheDocument();
    expect(getInput()).toHaveValue('');
    expect(getInput()).toHaveFocus();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('attempts-used')).toHaveTextContent('0');
    expect(screen.queryByRole('list', { name: 'ประวัติการทาย' })).not.toBeInTheDocument();
    await user.type(getInput(), '42{Enter}');
    expect(screen.getByText('VICTORY')).toBeInTheDocument();
  });

  it('switches difficulty and resets every state, including a completed game', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(getInput(), '68{Enter}');
    for (const [label, max, attempts] of [['Hard', 1000, 15], ['Easy', 10, 5], ['Normal', 100, 10]] as const) {
      await user.click(screen.getByRole('radio', { name: new RegExp(label) }));
      expect(screen.getByLabelText(`ช่วงที่เหลือ 1 ถึง ${max}`)).toBeInTheDocument();
      expect(screen.getByTestId('attempts-remaining')).toHaveTextContent(String(attempts));
      expect(screen.getByTestId('attempts-used')).toHaveTextContent('0');
      expect(getInput()).toBeEnabled();
      expect(getInput()).toHaveValue('');
      expect(getInput()).toHaveFocus();
      expect(screen.queryByText('VICTORY')).not.toBeInTheDocument();
      expect(screen.queryByRole('list', { name: 'ประวัติการทาย' })).not.toBeInTheDocument();
    }
  });
});
