import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PropertySelectApp from '../PropertySelectApp';

// Mock gasClient to control getGasUrl/fetchProperties
vi.mock('../../../utils/gasClient', () => ({
  getGasUrl: vi.fn(),
  fetchProperties: vi.fn(),
}));

import { getGasUrl, fetchProperties } from '../../../utils/gasClient';

const MOCK_GAS_URL = 'https://script.google.com/macros/s/ABC123/exec';

const PROPERTIES = [
  { id: 'prop-001', name: 'テスト物件A', completionDate: '2025-06-15T00:00:00Z' },
  { id: 'prop-002', name: 'テスト物件B' },
  { id: 'prop-003', name: 'サンプルマンション', completionDate: '' },
];

function createMockFetchResponse(data, options = {}) {
  return Promise.resolve({
    ok: options.ok !== false,
    status: options.status || 200,
    json: () => Promise.resolve(data),
  });
}

function setupMocks(options = {}) {
  // Default getGasUrl returns value from sessionStorage
  getGasUrl.mockImplementation(() =>
    sessionStorage.getItem('gasWebAppUrl') || localStorage.getItem('gasWebAppUrl') || ''
  );
  // Default fetchProperties returns provided data
  if (options.fetchPropertiesResponse !== undefined) {
    fetchProperties.mockResolvedValue(options.fetchPropertiesResponse);
  } else if (options.fetchPropertiesError) {
    fetchProperties.mockRejectedValue(options.fetchPropertiesError);
  }
}

describe('PropertySelectApp', () => {
  let mockLocation;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.stubGlobal('scrollTo', vi.fn());

    mockLocation = { href: '', reload: vi.fn() };
    Object.defineProperty(window, 'location', {
      writable: true,
      value: mockLocation,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: new Promise(() => {}) }); // never resolves

      render(<PropertySelectApp />);
      expect(screen.getByText('物件情報を読み込み中です...')).toBeInTheDocument();
    });
  });

  describe('property list rendering', () => {
    it('renders properties after successful fetch', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: { success: true, data: PROPERTIES } });

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('テスト物件A')).toBeInTheDocument();
        expect(screen.getByText('テスト物件B')).toBeInTheDocument();
        expect(screen.getByText('サンプルマンション')).toBeInTheDocument();
      });
    });

    it('renders properties from properties key', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: { success: true, properties: PROPERTIES } });

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('テスト物件A')).toBeInTheDocument();
      });
    });

    it('renders properties when response is array', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: PROPERTIES });

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('テスト物件A')).toBeInTheDocument();
      });
    });

    it('shows property IDs', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: { data: PROPERTIES } });

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText(/prop-001/)).toBeInTheDocument();
      });
    });

    it('shows completion date badge when present', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: { data: PROPERTIES } });

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText(/検針完了日/)).toBeInTheDocument();
      });
    });

    it('shows empty message when no properties', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: { data: [] } });

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('登録されている物件がありません。')).toBeInTheDocument();
      });
    });

    it('normalizes Japanese key names', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      const jpData = [
        { '物件ID': 'jp-001', '物件名': '日本語物件', '検針完了日': '2025-07-01' },
      ];
      setupMocks({ fetchPropertiesResponse: { data: jpData } });

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('日本語物件')).toBeInTheDocument();
      });
    });
  });

  describe('search filtering', () => {
    it('filters properties by name', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: { data: PROPERTIES } });

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('テスト物件A')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('物件IDまたは物件名で検索...');
      fireEvent.change(searchInput, { target: { value: 'サンプル' } });

      expect(screen.getByText('サンプルマンション')).toBeInTheDocument();
      expect(screen.queryByText('テスト物件A')).not.toBeInTheDocument();
    });

    it('filters properties by ID', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: { data: PROPERTIES } });

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('テスト物件A')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('物件IDまたは物件名で検索...');
      fireEvent.change(searchInput, { target: { value: 'prop-002' } });

      expect(screen.getByText('テスト物件B')).toBeInTheDocument();
      expect(screen.queryByText('テスト物件A')).not.toBeInTheDocument();
    });

    it('shows not found message for unmatched search', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: { data: PROPERTIES } });

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('テスト物件A')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('物件IDまたは物件名で検索...');
      fireEvent.change(searchInput, { target: { value: '存在しない' } });

      expect(screen.getByText('該当する物件が見つかりません。')).toBeInTheDocument();
    });

    it('search is case-insensitive', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: { data: [{ id: 'ABC', name: 'Test Property' }] } });

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('Test Property')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('物件IDまたは物件名で検索...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      expect(screen.getByText('Test Property')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('shows error on network failure', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesError: new Error('Failed to fetch') });

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText(/ネットワークエラー/)).toBeInTheDocument();
      });
    });

    it('shows error on invalid data format', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: { success: true } }); // no data array

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText(/物件データの形式が正しくありません/)).toBeInTheDocument();
      });
    });

    it('shows generic error for other fetch errors', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesError: new Error('Custom error') });

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText(/Custom error/)).toBeInTheDocument();
      });
    });
  });

  describe('URL modal', () => {
    it('shows URL modal when gasWebAppUrl is missing', async () => {
      // getGasUrl returns empty string since nothing in storage
      setupMocks();

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('GAS Web App URL設定')).toBeInTheDocument();
      });
    });

    it('shows URL modal when gasWebAppUrl does not contain script.google.com', async () => {
      sessionStorage.setItem('gasWebAppUrl', 'https://example.com/not-gas');
      setupMocks();

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('GAS Web App URL設定')).toBeInTheDocument();
      });
    });

    it('closes modal on cancel and shows error', async () => {
      setupMocks();

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('キャンセル')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('キャンセル'));

      await waitFor(() => {
        expect(screen.getByText(/正しいGAS Web App URLを設定してください/)).toBeInTheDocument();
      });
    });

    it('saves valid URL and reloads on submit', async () => {
      setupMocks();

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('保存')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec');
      fireEvent.change(input, { target: { value: MOCK_GAS_URL } });
      fireEvent.click(screen.getByText('保存'));

      expect(localStorage.getItem('gasWebAppUrl')).toBe(MOCK_GAS_URL);
      expect(sessionStorage.getItem('gasWebAppUrl')).toBe(MOCK_GAS_URL);
      expect(mockLocation.reload).toHaveBeenCalled();
    });

    it('shows error on invalid URL submit', async () => {
      setupMocks();

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('保存')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec');
      fireEvent.change(input, { target: { value: 'https://example.com/invalid' } });
      fireEvent.click(screen.getByText('保存'));

      await waitFor(() => {
        expect(screen.getByText(/正しいGAS Web App URLを設定してください/)).toBeInTheDocument();
      });
    });
  });

  describe('handlePropertySelect', () => {
    const ROOMS_DATA = {
      success: true,
      data: {
        rooms: [
          { id: 'room-101', name: '101号室' },
          { id: 'room-102', name: '102号室' },
        ],
      },
    };

    it('navigates to room page on property select', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: { data: PROPERTIES } });
      // Mock global fetch for room fetch
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(
        createMockFetchResponse(ROOMS_DATA)
      ));

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('テスト物件A')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('テスト物件A'));

      await waitFor(() => {
        expect(mockLocation.href).toContain('/room/');
        expect(mockLocation.href).toContain('prop-001');
      });
    });

    it('sets sessionStorage values on navigation', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: { data: PROPERTIES } });
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(
        createMockFetchResponse(ROOMS_DATA)
      ));

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('テスト物件A')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('テスト物件A'));

      await waitFor(() => {
        expect(sessionStorage.getItem('selectedPropertyId')).toBe('prop-001');
        expect(sessionStorage.getItem('selectedPropertyName')).toBe('テスト物件A');
      });
    });

    it('shows error when room fetch fails', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: { data: PROPERTIES } });
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(
        createMockFetchResponse({}, { ok: false, status: 500 })
      ));

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('テスト物件A')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('テスト物件A'));

      await waitFor(() => {
        expect(screen.getByText(/部屋情報の読み込みに失敗しました/)).toBeInTheDocument();
      });
    });

    it('shows error when room data format is invalid', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: { data: PROPERTIES } });
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(
        createMockFetchResponse({ success: true, data: {} })
      ));

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('テスト物件A')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('テスト物件A'));

      await waitFor(() => {
        expect(screen.getByText(/部屋情報の読み込みに失敗しました/)).toBeInTheDocument();
      });
    });

    it('handles rooms from data.data as array', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: { data: PROPERTIES } });
      const roomsArrayData = {
        success: true,
        data: [{ id: 'room-201', name: '201号室' }],
      };
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(
        createMockFetchResponse(roomsArrayData)
      ));

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('テスト物件A')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('テスト物件A'));

      await waitFor(() => {
        expect(mockLocation.href).toContain('/room/');
      });
    });

    it('shows error when API returns success=false', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      setupMocks({ fetchPropertiesResponse: { data: PROPERTIES } });
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(
        createMockFetchResponse({ success: false, error: 'API error' })
      ));

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('テスト物件A')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('テスト物件A'));

      await waitFor(() => {
        expect(screen.getByText(/部屋情報の読み込みに失敗しました/)).toBeInTheDocument();
      });
    });
  });

  describe('formatCompletionDate edge cases', () => {
    it('does not show badge for empty completionDate', async () => {
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      const props = [
        { id: 'p1', name: '物件1', completionDate: '' },
        { id: 'p2', name: '物件2' },
      ];
      setupMocks({ fetchPropertiesResponse: { data: props } });

      render(<PropertySelectApp />);

      await waitFor(() => {
        expect(screen.getByText('物件1')).toBeInTheDocument();
        expect(screen.getByText('物件2')).toBeInTheDocument();
      });

      expect(screen.queryByText(/検針完了日/)).not.toBeInTheDocument();
    });
  });
});
