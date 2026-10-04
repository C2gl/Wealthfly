import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CategoryPanel from '../src/components/CategoryPanel.jsx';

const row = (category, total, count = 1) => ({ category, total, count });

const rows = [row('FOOD - Groceries', 120, 6), row('FOOD - Takeaway', 30, 2), row('Rent', 600), row('FUN - Cinema', 12)];
const previousRows = [row('FOOD - Groceries', 100, 5), row('FOOD - Bakery', 8.4), row('Rent', 600)];

function renderPanel(props = {}) {
  return render(<CategoryPanel rows={rows} previousRows={previousRows} trendRows={[]} previousTrendRows={[]} {...props} />);
}

describe('CategoryPanel grouping', () => {
  it('shows a collapsed FOOD group and keeps a lone prefix flat', () => {
    const { container } = renderPanel();
    const toggle = container.querySelector('.category-group-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('3 categories')).toBeInTheDocument();
    expect(screen.getByText('FUN - Cinema')).toBeInTheDocument();
    expect(container.querySelector('.category-children')).toBeNull();
  });

  it('expands to show the categories inside the group, including ones with no spending now', () => {
    const { container } = renderPanel();
    fireEvent.click(container.querySelector('.category-group-toggle'));
    expect(container.querySelector('.category-group-toggle')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Takeaway')).toBeInTheDocument();
    expect(screen.getByText('Bakery')).toBeInTheDocument();
  });

  it('opens the insights for the full category name when a child is clicked', () => {
    const onCategoryClick = vi.fn();
    const { container } = renderPanel({ onCategoryClick });
    fireEvent.click(container.querySelector('.category-group-toggle'));
    fireEvent.click(screen.getByText('Groceries'));
    expect(onCategoryClick).toHaveBeenCalledWith('FOOD - Groceries');
  });

  it('passes the plain name through for a category that is not grouped', () => {
    const onCategoryClick = vi.fn();
    renderPanel({ onCategoryClick });
    fireEvent.click(screen.getByText('Rent'));
    expect(onCategoryClick).toHaveBeenCalledWith('Rent');
  });

  it('switches to a flat list with every full category name', () => {
    const { container } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Flat' }));
    expect(container.querySelector('.category-group-toggle')).toBeNull();
    expect(screen.getByText('FOOD - Groceries')).toBeInTheDocument();
    expect(screen.getByText('FOOD - Takeaway')).toBeInTheDocument();
  });

  it('hides the layout switch when there is nothing to group', () => {
    renderPanel({ rows: [row('Rent', 600), row('Fun', 5)], previousRows: [] });
    expect(screen.queryByRole('button', { name: 'Flat' })).toBeNull();
  });
});
