import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OverlapWarning } from './OverlapWarning';
import type { DuplicateHorseWarning } from '../types';

describe('OverlapWarning', () => {
  it('renders nothing when duplicates is empty', () => {
    const { container } = render(<OverlapWarning duplicates={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders alert with duplicate horse info including surface', () => {
    const duplicates: DuplicateHorseWarning[] = [
      {
        horseId: 1,
        horseName: 'スピードスター',
        cells: [
          { country: '日', surface: '芝', distanceBand: 'マイル', grade: 'G1' },
          { country: '日', surface: '芝', distanceBand: '中距離', grade: 'G2' },
        ],
      },
    ];

    render(<OverlapWarning duplicates={duplicates} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('重複配置の警告')).toBeInTheDocument();
    expect(screen.getByText('スピードスター')).toBeInTheDocument();
    expect(screen.getByText(/2 箇所/)).toBeInTheDocument();
    expect(screen.getByText(/日\/芝\/マイル\/G1/)).toBeInTheDocument();
    expect(screen.getByText(/日\/芝\/中距離\/G2/)).toBeInTheDocument();
  });

  it('renders classic path cell location correctly', () => {
    const duplicates: DuplicateHorseWarning[] = [
      {
        horseId: 1,
        horseName: 'クラシック馬',
        cells: [
          {
            country: '日',
            surface: '芝',
            distanceBand: '三冠' as DuplicateHorseWarning['cells'][number]['distanceBand'],
            classicPath: '三冠',
            grade: null,
          },
          { country: '日', surface: '芝', distanceBand: 'マイル', grade: 'G1' },
        ],
      },
    ];

    render(<OverlapWarning duplicates={duplicates} />);

    expect(screen.getByText(/日\/芝\/三冠/)).toBeInTheDocument();
    expect(screen.getByText(/日\/芝\/マイル\/G1/)).toBeInTheDocument();
  });

  it('renders multiple duplicate horses', () => {
    const duplicates: DuplicateHorseWarning[] = [
      {
        horseId: 1,
        horseName: '馬A',
        cells: [
          { country: '日', surface: '芝', distanceBand: 'マイル', grade: 'G1' },
          { country: '米', surface: 'ダート', distanceBand: '中距離', grade: 'G1' },
        ],
      },
      {
        horseId: 2,
        horseName: '馬B',
        cells: [
          { country: '欧', surface: '芝', distanceBand: '長距離', grade: 'G1' },
          { country: '欧', surface: '芝', distanceBand: '中長距離', grade: 'G2' },
        ],
      },
    ];

    render(<OverlapWarning duplicates={duplicates} />);

    expect(screen.getByText('馬A')).toBeInTheDocument();
    expect(screen.getByText('馬B')).toBeInTheDocument();
  });
});
