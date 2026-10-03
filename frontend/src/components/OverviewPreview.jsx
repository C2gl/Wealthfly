import React from 'react';

// A clickable summary card on the Overview page that links to a full view.
export default function OverviewPreview({ label, foot, onClick, className = '', children }) {
  return (
    <button className={`overview-preview ${className}`.trim()} onClick={onClick}>
      <div className="overview-preview-heading"><span className="eyebrow">{label}</span><span className="overview-preview-arrow">→</span></div>
      {children}
      <span className="overview-preview-foot">{foot}</span>
    </button>
  );
}
