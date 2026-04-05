/**
 * InlineCellSelect の馬選択フローをテスト。
 * セルクリック後のドロップダウンで馬を選択すると即座に onSelect が呼ばれる。
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

describe('InlineCellSelect', () => {
  const horses = [makeHorse(10, 'テスト馬A'), makeHorse(20, 'テスト馬B')];

  it('renders a select trigger with placeholder', () => {
    render(<InlineCellSelect horses={horses} onSelect={vi.fn()} />);

    expect(screen.getByText('馬を選択...')).toBeInTheDocument();
  });

  it('calls onSelect immediately when a horse is selected', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<InlineCellSelect horses={horses} onSelect={onSelect} />);

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    const option = await screen.findByRole('option', { name: 'テスト馬A' });
    await user.click(option);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(10);
  });

  it('calls onSelect with correct id for second horse', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<InlineCellSelect horses={horses} onSelect={onSelect} />);

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    const option = await screen.findByRole('option', { name: 'テスト馬B' });
    await user.click(option);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(20);
  });
});
