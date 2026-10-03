import React from 'react';
import TrendsPanel from './TrendsPanel.jsx';

export default function TrendsDrawer({ current, previous, rangeLabel, onClose }) {
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="insights-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div><span className="eyebrow">Spending trends</span><h2>Selected period</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close spending trends">×</button>
        </div>
        <TrendsPanel current={current} previous={previous} rangeLabel={rangeLabel} />
      </aside>
    </div>
  );
}
