import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import IndexPage from '../IndexPage.svelte';

describe('IndexPage', () => {
  it('renders the app title', () => {
    render(IndexPage);
    expect(screen.getByText('水道検針アプリ')).toBeInTheDocument();
  });

  it('renders the start link', () => {
    render(IndexPage);
    const link = screen.getByText('アプリを開始');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/property/');
  });

  it('renders h1 heading', () => {
    render(IndexPage);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('水道検針アプリ');
  });

  it('has a hidden PWA install button', () => {
    render(IndexPage);
    const button = document.getElementById('pwa-install-button');
    expect(button).toBeTruthy();
    expect(button).toHaveAttribute('style', 'display: none');
  });
});
