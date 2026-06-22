import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CLIReference } from '../CLIReference';
import { describe, it, expect } from 'vitest';

describe('CLIReference', () => {
  it('renders the CLI reference title', () => {
    render(<CLIReference />);
    expect(screen.getByText('CLI Reference')).toBeInTheDocument();
  });

  it('filters commands by search term', () => {
    render(<CLIReference />);
    const searchInput = screen.getByPlaceholderText('Search commands...');
    fireEvent.change(searchInput, { target: { value: 'init' } });
    
    expect(screen.getByText('vr init <name> [--public|--private]')).toBeInTheDocument();
    expect(screen.queryByText('vr commit -m "message"')).not.toBeInTheDocument();
  });

  it('filters commands by category', () => {
    render(<CLIReference />);
    const filterBtn = screen.getByRole('button', { name: 'Clone' });
    fireEvent.click(filterBtn);

    expect(screen.getByText('vr clone <repo> [new-name]')).toBeInTheDocument();
    expect(screen.queryByText('vr init <name> [--public|--private]')).not.toBeInTheDocument();
  });
});
