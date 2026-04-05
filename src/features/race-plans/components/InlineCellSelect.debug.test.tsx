/**
 * InlineCellSelect の馬選択フローをテスト。
 * Radix Select の controlled open prop を使用した auto-open 動作を検証。
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { InlineCellSelect } from './RacePlanMatrix';

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};

  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
});

function makeHorse(id: number, name: string) {
  return {
    id,
    name,
    sex: '牡' as const,
    birthYear: 2022,
    status: '現役',
    country: '日',
    isHistorical: false,
    mareLine: null,
    sireId: null,
    damId: null,
    lineageId: null,
    factors: null,
    notes: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };
}

describe('InlineCellSelect with controlled open', () => {
  const horses = [makeHorse(10, 'テスト馬A'), makeHorse(20, 'テスト馬B')];

  it('auto-opens and shows options immediately', async () => {
    render(<InlineCellSelect horses={horses} onSelect={vi.fn()} onCancel={vi.fn()} />);

    // Dropdown should be open automatically (open={true})
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(2);
  });

  it('selecting a horse shows memo input then calls onSelect on Enter', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<InlineCellSelect horses={horses} onSelect={onSelect} onCancel={vi.fn()} />);

    // Select a horse from the auto-opened dropdown
    const option = await screen.findByRole('option', { name: 'テスト馬A' });
    await user.click(option);

    // Memo input should appear
    const notesInput = screen.queryByPlaceholderText(/メモを入力/);
    console.log('After horse selection:');
    console.log('  memo input found:', !!notesInput);
    console.log('  onSelect called:', onSelect.mock.calls.length);

    if (notesInput) {
      await user.type(notesInput, 'テストメモ{Enter}');
      console.log('After Enter:');
      console.log('  onSelect called:', onSelect.mock.calls.length);
      console.log('  onSelect args:', JSON.stringify(onSelect.mock.calls));
    }

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(10, 'テストメモ');
  });

  it('calls onCancel when dropdown is closed without selection', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<InlineCellSelect horses={horses} onSelect={vi.fn()} onCancel={onCancel} />);

    await screen.findAllByRole('option');
    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('onSelect is called exactly once (no double-fire from blur)', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<InlineCellSelect horses={horses} onSelect={onSelect} onCancel={vi.fn()} />);

    const option = await screen.findByRole('option', { name: 'テスト馬B' });
    await user.click(option);

    const notesInput = screen.queryByPlaceholderText(/メモを入力/);
    if (notesInput) {
      await user.type(notesInput, '{Enter}');
    }

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(20, undefined);
  });
});
