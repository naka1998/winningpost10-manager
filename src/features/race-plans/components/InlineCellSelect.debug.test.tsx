/**
 * SearchableHorseSelect の馬選択フローをテスト。
 * セルクリック後の検索入力 + リストで馬を選択すると即座に onSelect が呼ばれる。
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchableHorseSelect } from './RacePlanMatrix';

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

describe('SearchableHorseSelect', () => {
  const horses = [makeHorse(10, 'テスト馬A'), makeHorse(20, 'テスト馬B')];

  it('renders a search input with placeholder', () => {
    render(<SearchableHorseSelect horses={horses} onSelect={vi.fn()} />);

    expect(screen.getByPlaceholderText('馬名で検索...')).toBeInTheDocument();
  });

  it('calls onSelect immediately when a horse is selected', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SearchableHorseSelect horses={horses} onSelect={onSelect} />);

    const option = screen.getByRole('option', { name: 'テスト馬A' });
    await user.click(option);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(10);
  });

  it('calls onSelect with correct id for second horse', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SearchableHorseSelect horses={horses} onSelect={onSelect} />);

    const option = screen.getByRole('option', { name: 'テスト馬B' });
    await user.click(option);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(20);
  });
});
