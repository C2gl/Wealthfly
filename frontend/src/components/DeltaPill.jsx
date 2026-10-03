import React from 'react';
import { deltaInfo } from '../lib/delta.js';

const ARROWS = {
  up: 'M6 2.2 10 7.2H7.1V9.8H4.9V7.2H2z',
  down: 'M6 9.8 2 4.8H4.9V2.2H7.1V4.8H10z',
  flat: 'M2.5 5H9.5V7H2.5z',
};

const WORDS = { up: 'Up', down: 'Down', flat: 'No change', none: '' };

// A small rounded pill showing a change. The arrow and the screen-reader word carry
// the direction, so the colour is never the only signal.
//   value:    number used for direction and tone (null/undefined = no comparison)
//   label:    text shown in the pill, already formatted by the caller
//   goodWhen: 'down' for spending, 'up' for income and savings
export default function DeltaPill({ value, label, goodWhen = 'down', className = '' }) {
  const { direction, tone } = deltaInfo(value, goodWhen);
  const classes = `delta-pill delta-pill-${tone} ${className}`.trim();

  return (
    <span className={classes}>
      {direction !== 'none' && (
        <svg className="delta-pill-arrow" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d={ARROWS[direction]} fill="currentColor" />
        </svg>
      )}
      {direction !== 'none' && <span className="sr-only">{WORDS[direction]}: </span>}
      {label}
    </span>
  );
}
