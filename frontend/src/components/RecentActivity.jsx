import React from 'react';
import { useFormatters } from '../hooks/useFormatters.js';
import { categoryColor } from '../utils.js';

export default function RecentActivity({ transactions, limit, onViewAll }) {
  const { formatDate, transactionAmountMeta } = useFormatters();

  return (
    <section className="panel recent-panel">
      <div className="panel-heading-row"><h2>Recent activity</h2><button className="text-button" onClick={onViewAll}>View all →</button></div>
      <div className="recent-list">
        {transactions.slice(0, limit).map((tx) => {
          const meta = transactionAmountMeta(tx);
          const isTransfer = tx.type === 'transfer';
          return (
            <div className="recent-row" key={`${tx.id}-${tx.split_index}`}>
              <div><span className="recent-date">{formatDate(tx.date)}</span><strong>{tx.description}</strong><small><span className="category-chip" style={{ '--category-color': categoryColor(tx.category_name) }} />{tx.category_name || 'Uncategorized'}</small></div>
              <div className="recent-row-amount-wrap">
                {isTransfer && <span className="transfer-badge recent-transfer-badge">Transfer</span>}
                <strong className={meta.tone}>{meta.display}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
