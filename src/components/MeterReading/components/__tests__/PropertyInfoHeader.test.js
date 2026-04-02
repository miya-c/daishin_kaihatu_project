import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import PropertyInfoHeader from '../PropertyInfoHeader.svelte';

describe('PropertyInfoHeader', () => {
  it('renders property name and room name', () => {
    render(PropertyInfoHeader, { props: { propertyName: 'テスト物件', roomName: '101号室' } });
    expect(screen.getByText('テスト物件')).toBeInTheDocument();
    expect(screen.getByText(/101号室/)).toBeInTheDocument();
  });

  it('shows fallback when propertyName is empty', () => {
    render(PropertyInfoHeader, { props: { propertyName: '', roomName: '101号室' } });
    expect(screen.getByText('物件名未設定')).toBeInTheDocument();
  });

  it('shows fallback when roomName is empty', () => {
    render(PropertyInfoHeader, { props: { propertyName: 'テスト物件', roomName: '' } });
    expect(screen.getByText(/部屋名未設定/)).toBeInTheDocument();
  });

  it('renders property name as h2', () => {
    render(PropertyInfoHeader, { props: { propertyName: 'テスト物件', roomName: '101号室' } });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('テスト物件');
  });
});
