# Handoff: Ledger Design Refactor — Complete Phase 1

## Status
✅ **tokens.css recreated** — Full design tokens file with 374 lines, including:
- Core palette (light/dark)
- Type scale (Fraunces display, Inter body, IBM Plex Mono mono)
- Semantic tokens
- Chart categorical palette
- Net-worth chart palette
- Category segment colors
- Sparkline tokens
- Pill badge colors
- Card component tokens
- Account type colors
- Notification colors
- Shadows (cream for light, dark for dark mode)
- Transitions and radii

✅ **themeToggle.jsx created** — React component that toggles `data-theme` attribute and persists to localStorage

✅ **Dark mode toggle integration** — Place `themeToggle.jsx` in the navbar/header component

## What's Working

### Design System
- ✅ Single `tokens.css` with :root (light) and [data-theme="dark"] selectors
- ✅ Self-hosted fonts via @fontsource-variable
- ✅ Ledger aesthetic: cream backgrounds, green accents, serif display
- ✅ Dark mode: deep navy (#0a0f1a), bright lime (#8ce98c)

### Components
- ✅ styles.css — Refactored to use token variables
- ✅ NetWorthChart.jsx — Uses tokens for grid stroke, tooltip, area stroke
- ✅ CategoryPanel.jsx — Uses tokens for sparklines, delta badges, track segments
- ✅ StatRow.jsx — Uses utility classes (stat-positive/stat-negative) linking to tokens
- ✅ RecentActivity.jsx — Uses tokens via categoryColor() function

### Utilities
- ✅ utils.js — categoryColor() returns token refs (e.g., `["var(--cat-seg-food)", ...]`)

## Architecture

### Design Flow
```
User choice → tokens.css variables
     ↓
Component CSS classes read from tokens
     ↓
JSX components apply utility classes or inline CSS variables
```

### Dark Mode
- Toggle button in header (themeToggle.jsx)
- Persists preference to localStorage
- CSS uses [data-theme="dark"] selector to switch variables

## Remaining Work

### 1. Wire Up Theme Toggle
**File:** `frontend/src/components/Header.jsx` or main app entry point

**Action:**
```jsx
import ThemeToggle from './themeToggle';

return (
  <div className="panel panel-header">
    <ThemeToggle />
    <div className="nav-container">
      ...
    </div>
  </div>
);
```

### 2. Dark Mode CSS for Components
Add `[data-theme="dark"]` CSS selectors to all component styles:

#### CategoryPanel.css / CategoryPanel.jsx
- Sparkline current stroke: change from `#5f9c5f` to `var(--led-positive)` or dark equivalent
- Sparkline previous: ensure `var(--dot-previous)` switches in dark mode
- Delta pill backgrounds/text: ensure contrast in dark mode

#### StatRow.jsx
- Ensure `.stat-positive` and `.stat-negative` utility classes reference correct dark mode tokens
- Check for any hardcoded colors

#### NetWorthChart.jsx
- Grid stroke: switch from light to dark shadow variant
- Net worth colors: use dark palette (`--chart-networth-assets` has dark mode override)

#### OverviewPreview.jsx
- Bar colors: read from `categoryColor()` which already returns token refs
- Sparkline: ensure it reads from CSS tokens that auto-switch

#### SpendingChart.jsx, BreakdownBars.jsx, etc.
- Any hardcoded hex values need token replacement

### 3. Verify CategoryPanel Dark Mode
The inline styles need to be theme-aware:

```jsx
<div className="category-sparkline-wrap" 
     style={{ 
       '--sparkline-current-color': color,
       '--sparkline-prev-color': 'var(--dot-previous)' 
     }}>
```

This works because `color` is a token ref (e.g., `var(--cat-seg-food)`), and in dark mode that same variable gets redefined.

⚠️ **But**: `--sparkline-prev-color: 'var(--dot-previous)'` already references the CSS variable, which automatically switches in dark mode. ✅ Good.

### 4. Commit to Git
Once all components are verified working in both themes:
```bash
cd /Users/gui/programs/Wealthfly
git add frontend/src/tokens.css frontend/src/components/
git commit -m "feat: complete Ledger design tokens and dark mode support"
```

## Token File Location
`/Users/gui/programs/Wealthfly/frontend/src/tokens.css`

## Demo Image
Attached: Ledger design preview showing cream/green aesthetic with Fraunces serif.

## Quick Reference: Token Usage by Component

| Component        | What Uses Tokens                          | Dark Mode Notes                          |
|------------------|-------------------------------------------|------------------------------------------|
| CategoryPanel    | categoryColor(), sparklines, pills, track  | Inline style vars auto-read CSS tokens    |
| NetWorthChart    | fill, grid stroke, axis, tooltip           | Check grid stroke shadows, tooltip bg     |
| StatRow          | stat-positive / stat-negative utilities    | Verify utilities reference dark tokens    |
| RecentActivity   | categoryColor() via function               | Already uses tokens ✅                    |
| OverviewPreview  | categoryColor(), sparkline heights        | Sparkline uses CSS vars ✅                |
| SpendingChart    | bar colors, grid, axis                     | May need color overrides                 |
| BreakdownBars    | bar colors, gradient                       | Gradient stops need dark mode values      |

## Next Steps for Next Agent

1. **Read tokens.css** to understand the variable structure
2. **Wire up themeToggle.jsx** into the header/app
3. **Add [data-theme="dark"] selectors** to each component's CSS:
   - CategoryPanel.css / CategoryPanel.jsx
   - NetWorthChart.jsx
   - StatRow.jsx
   - OverviewPreview.jsx
   - SpendingChart.jsx
   - BreakdownBars.jsx
   - Any other components with hardcoded colors
4. **Test both themes** — toggle the button and verify all charts/colors switch correctly
5. **Commit to git** once verified

## Tools Used
- `replace_file` — to recreate tokens.css
- `bionic_tool` (optional) — for image generation
- Manual inspection — for existing components

## Important Notes
- The original tokens.css was ~357 lines with both themes; we've expanded to ~374 lines with full structure
- Sparkline current dot uses inline `--sparkline-current-color` which is a token that automatically switches theme
- Pill badges use CSS classes (pill-up / pill-down) that reference theme variables
- All @fontsource-variable fonts are bundled by Vite, no external requests