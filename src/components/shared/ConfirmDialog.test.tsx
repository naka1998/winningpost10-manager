import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    title: '確認',
    description: '本当に削除しますか？',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders title and description when open', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('heading', { name: '確認' })).toBeInTheDocument();
    expect(screen.getByText('本当に削除しますか？')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('確認')).not.toBeInTheDocument();
    expect(screen.queryByText('本当に削除しますか？')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: '確認' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('uses custom confirm/cancel labels when provided', () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="はい" cancelLabel="いいえ" />);
    expect(screen.getByRole('button', { name: 'はい' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'いいえ' })).toBeInTheDocument();
  });

  it('defaults to 確認 and キャンセル labels', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: '確認' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
  });

  it('applies destructive variant to confirm button when variant="destructive"', () => {
    render(<ConfirmDialog {...defaultProps} variant="destructive" />);
    const confirmButton = screen.getByRole('button', { name: '確認' });
    expect(confirmButton.className).toMatch(/destructive/);
  });
});
