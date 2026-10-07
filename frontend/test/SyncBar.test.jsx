import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TranslationProvider } from '../src/i18n.jsx';
import SyncBar from '../src/components/SyncBar.jsx';

function renderSyncBar(props) {
  // SyncBar reads its labels via useTranslation(), which throws if rendered
  // without a TranslationProvider above it in the tree (see i18n.jsx) — so
  // every render in this file needs the wrapper, not just the ones that
  // check translated text.
  return render(
    <TranslationProvider>
      <SyncBar {...props} />
    </TranslationProvider>
  );
}

describe('SyncBar', () => {
  it('renders nothing when idle with no notification to show', () => {
    const { container } = renderSyncBar({ syncing: false, syncProgress: null, syncNotification: null });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a progress bar with the step label and percentage while syncing', () => {
    renderSyncBar({
      syncing: true,
      syncProgress: { currentStep: 'syncing_transactions', progress: 42 },
      syncNotification: null,
    });

    expect(screen.getByText('Syncing transactions...')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
  });

  it('shows the live transaction count during the transactions step', () => {
    renderSyncBar({
      syncing: true,
      syncProgress: { currentStep: 'syncing_transactions', progress: 60, transactionsProcessed: 128 },
      syncNotification: null,
    });

    expect(screen.getByText('(128 transactions)')).toBeInTheDocument();
  });

  it('hides the transaction count outside the transactions step or when unknown', () => {
    const { rerender } = renderSyncBar({
      syncing: true,
      syncProgress: { currentStep: 'syncing_accounts', progress: 10, transactionsProcessed: 5 },
      syncNotification: null,
    });
    expect(screen.queryByText(/transactions\)/)).not.toBeInTheDocument();

    rerender(
      <TranslationProvider>
        <SyncBar
          syncing
          syncProgress={{ currentStep: 'syncing_transactions', progress: 60, transactionsProcessed: null }}
          syncNotification={null}
        />
      </TranslationProvider>
    );
    expect(screen.queryByText(/transactions\)/)).not.toBeInTheDocument();
  });

  it('falls back to a generic label before the first step is reported', () => {
    renderSyncBar({ syncing: true, syncProgress: null, syncNotification: null });

    expect(screen.getByText('Syncing...')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('clamps an out-of-range percentage instead of showing a nonsense value', () => {
    renderSyncBar({ syncing: true, syncProgress: { currentStep: null, progress: 137 }, syncNotification: null });
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows a result notification once syncing has finished', () => {
    renderSyncBar({
      syncing: false,
      syncProgress: null,
      syncNotification: { id: 1, level: 'success', title: 'Sync completed', message: 'All up to date.' },
    });

    expect(screen.getByText('Sync completed')).toBeInTheDocument();
    expect(screen.getByText('All up to date.')).toBeInTheDocument();
  });

  it('dismisses the notification when the close button is clicked', () => {
    renderSyncBar({
      syncing: false,
      syncProgress: null,
      syncNotification: { id: 1, level: 'critical', title: 'Sync failed', message: 'Could not reach Firefly.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByText('Sync failed')).not.toBeInTheDocument();
  });

  it('auto-dismisses the notification after its TTL elapses', () => {
    vi.useFakeTimers();
    try {
      renderSyncBar({
        syncing: false,
        syncProgress: null,
        syncNotification: { id: 1, level: 'success', title: 'Sync completed', message: 'Done.' },
      });

      expect(screen.getByText('Sync completed')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(6000);
      });

      expect(screen.queryByText('Sync completed')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
