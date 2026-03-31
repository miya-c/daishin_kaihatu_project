import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoomSelectApp from '../RoomSelectApp';

// Mock gasClient to control getGasUrl
vi.mock('../../../utils/gasClient', () => ({
  getGasUrl: vi.fn(),
}));

import { getGasUrl } from '../../../utils/gasClient';

const MOCK_GAS_URL = 'https://script.google.com/macros/s/ABC123/exec';
const MOCK_PROPERTY_ID = 'prop-001';

const ROOMS = [
  {
    id: 'room-101',
    name: '101号室',
    readingStatus: 'completed',
    readingDateFormatted: '2025/06/15',
  },
  { id: 'room-102', name: '102号室' },
  { id: 'room-103', name: '103号室', isNotNeeded: true },
  { id: 'room-104', name: '104号室', isCompleted: true },
];

function createMockFetchResponse(data, options = {}) {
  return Promise.resolve({
    ok: options.ok !== false,
    status: options.status || 200,
    json: () => Promise.resolve(data),
  });
}

function mockLocationSearch(search) {
  delete window.location;
  window.location = { search, href: '', reload: vi.fn() };
}

describe('RoomSelectApp', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal('scrollTo', vi.fn());

    // Default: getGasUrl returns from sessionStorage
    getGasUrl.mockImplementation(() => sessionStorage.getItem('gasWebAppUrl') || '');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('loading state', () => {
    it('shows loading spinner when fetching rooms', () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);

      vi.stubGlobal('fetch', () => new Promise(() => {}));

      render(<RoomSelectApp />);
      expect(screen.getByText('部屋データを読み込み中...')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('shows error when propertyId is missing', () => {
      mockLocationSearch('');

      render(<RoomSelectApp />);
      expect(screen.getByText('物件IDが指定されていません。')).toBeInTheDocument();
    });

    it('shows error when gasWebAppUrl is missing', () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      // getGasUrl returns empty by default since sessionStorage is clear

      render(<RoomSelectApp />);
      expect(screen.getByText('GAS Web App URLが設定されていません。')).toBeInTheDocument();
    });

    it('shows error when gasWebAppUrl is invalid', () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', 'https://example.com/not-gas');

      render(<RoomSelectApp />);
      expect(screen.getByText('GAS Web App URLが設定されていません。')).toBeInTheDocument();
    });

    it('shows error when API fails', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('room list rendering', () => {
    it('renders rooms from session cache', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'テスト物件');
      sessionStorage.setItem('selectedRooms', JSON.stringify(ROOMS));

      // Background update fetch
      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(createMockFetchResponse({ success: true, data: { rooms: ROOMS } }))
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('テスト物件')).toBeInTheDocument();
        expect(screen.getByText('101号室')).toBeInTheDocument();
        expect(screen.getByText('102号室')).toBeInTheDocument();
      });
    });

    it('renders rooms from API when no session cache', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(
          createMockFetchResponse({
            success: true,
            data: {
              rooms: ROOMS,
              propertyName: 'API物件',
            },
          })
        )
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('API物件')).toBeInTheDocument();
        expect(screen.getByText('101号室')).toBeInTheDocument();
      });
    });

    it('renders rooms when API returns data as array', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(createMockFetchResponse({ success: true, data: ROOMS }))
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('101号室')).toBeInTheDocument();
      });
    });

    it('shows empty message when no rooms', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);

      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockReturnValue(
            createMockFetchResponse({ success: true, data: { rooms: [], propertyName: '空物件' } })
          )
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('部屋データがありません')).toBeInTheDocument();
      });
    });

    it('shows completion status badge for completed rooms', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'テスト物件');
      sessionStorage.setItem('selectedRooms', JSON.stringify(ROOMS));

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(createMockFetchResponse({ success: true, data: { rooms: ROOMS } }))
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText(/検針済み：2025\/06\/15/)).toBeInTheDocument();
      });
    });

    it('shows isNotNeeded status for skipped rooms', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'テスト物件');
      sessionStorage.setItem('selectedRooms', JSON.stringify(ROOMS));

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(createMockFetchResponse({ success: true, data: { rooms: ROOMS } }))
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('103号室')).toBeInTheDocument();
        const allStatusTexts = screen.getAllByText('検針不要');
        expect(allStatusTexts.length).toBeGreaterThan(0);
      });
    });

    it('shows pending status for uncompleted rooms', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'テスト物件');
      sessionStorage.setItem('selectedRooms', JSON.stringify(ROOMS));

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(createMockFetchResponse({ success: true, data: { rooms: ROOMS } }))
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('102号室')).toBeInTheDocument();
        const allPending = screen.getAllByText('未検針');
        expect(allPending.length).toBeGreaterThan(0);
      });
    });
  });

  describe('handleRoomClick', () => {
    it('navigates to reading page on room click', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'テスト物件');
      sessionStorage.setItem(
        'selectedRooms',
        JSON.stringify([{ id: 'room-101', name: '101号室' }])
      );

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(
          createMockFetchResponse({
            success: true,
            data: { rooms: [{ id: 'room-101', name: '101号室' }] },
          })
        )
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('101号室')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('101号室'));

      expect(window.location.href).toContain('/reading/');
      expect(window.location.href).toContain('room-101');
    });

    it('shows toast when clicking isNotNeeded room', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'テスト物件');
      sessionStorage.setItem(
        'selectedRooms',
        JSON.stringify([{ id: 'room-103', name: '103号室', isNotNeeded: true }])
      );

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(createMockFetchResponse({ success: true, data: { rooms: [] } }))
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('103号室')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('103号室'));

      await waitFor(() => {
        expect(screen.getByText('この部屋は検針不要に設定されています。')).toBeInTheDocument();
      });
    });

    it('does not navigate when clicking isNotNeeded room', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'テスト物件');
      sessionStorage.setItem(
        'selectedRooms',
        JSON.stringify([{ id: 'room-103', name: '103号室', isNotNeeded: true }])
      );

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(createMockFetchResponse({ success: true, data: { rooms: [] } }))
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('103号室')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('103号室'));

      expect(window.location.href).not.toContain('/reading/');
    });
  });

  describe('handleBackButton', () => {
    it('navigates to property page', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'テスト物件');
      sessionStorage.setItem('selectedRooms', JSON.stringify(ROOMS));

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(createMockFetchResponse({ success: true, data: { rooms: ROOMS } }))
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('101号室')).toBeInTheDocument();
      });

      const backButtons = screen.getAllByLabelText('戻る');
      fireEvent.click(backButtons[0]);

      expect(window.location.href).toBe('/property/');
    });
  });

  describe('handleCompleteInspection', () => {
    it('shows toast on successful completion', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'テスト物件');
      sessionStorage.setItem('selectedRooms', JSON.stringify(ROOMS));

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url) => {
          if (url.includes('completeInspection')) {
            return createMockFetchResponse({ success: true });
          }
          return createMockFetchResponse({ success: true, data: { rooms: ROOMS } });
        })
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('この物件の検針を完了する')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('この物件の検針を完了する'));

      await waitFor(() => {
        expect(screen.getByText(/検針完了日を.*で保存しました/)).toBeInTheDocument();
      });
    });

    it('shows toast on completion error', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'テスト物件');
      sessionStorage.setItem('selectedRooms', JSON.stringify(ROOMS));

      // Background update returns success, completeInspection returns error
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url) => {
          if (url.includes('completeInspection')) {
            return createMockFetchResponse({}, { ok: false, status: 500 });
          }
          return createMockFetchResponse({ success: true, data: { rooms: ROOMS } });
        })
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('この物件の検針を完了する')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('この物件の検針を完了する'));

      await waitFor(() => {
        expect(screen.getByText(/検針完了処理でエラーが発生しました/)).toBeInTheDocument();
      });
    });

    it('shows toast when gasUrl is missing for completion', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'テスト物件');
      sessionStorage.setItem('selectedRooms', JSON.stringify(ROOMS));

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(createMockFetchResponse({ success: true, data: { rooms: ROOMS } }))
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('この物件の検針を完了する')).toBeInTheDocument();
      });

      // Remove gas URL to trigger error
      sessionStorage.removeItem('gasWebAppUrl');
      fireEvent.click(screen.getByText('この物件の検針を完了する'));

      await waitFor(() => {
        expect(screen.getByText('Web App URLが設定されていません')).toBeInTheDocument();
      });
    });

    it('shows error toast when API returns success=false', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'テスト物件');
      sessionStorage.setItem('selectedRooms', JSON.stringify(ROOMS));

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url) => {
          if (url.includes('completeInspection')) {
            return createMockFetchResponse({ success: false, error: 'サーバーエラー' });
          }
          return createMockFetchResponse({ success: true, data: { rooms: ROOMS } });
        })
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('この物件の検針を完了する')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('この物件の検針を完了する'));

      await waitFor(() => {
        expect(screen.getByText(/サーバーエラー/)).toBeInTheDocument();
      });
    });
  });

  describe('session cache behavior', () => {
    it('uses session cache immediately and cleans up forceRefreshRooms flag', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('forceRefreshRooms', 'true');
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'キャッシュ物件');
      sessionStorage.setItem('selectedRooms', JSON.stringify(ROOMS));

      const freshRooms = [{ id: 'room-201', name: '201号室' }];
      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(
          createMockFetchResponse({
            success: true,
            data: { rooms: freshRooms, propertyName: '新規物件' },
          })
        )
      );

      render(<RoomSelectApp />);

      // Should show cached rooms immediately (not wait for API)
      await waitFor(() => {
        expect(screen.getByText('キャッシュ物件')).toBeInTheDocument();
        expect(screen.getByText('101号室')).toBeInTheDocument();
      });

      // forceRefreshRooms should be cleaned up
      expect(sessionStorage.getItem('forceRefreshRooms')).toBeNull();
    });

    it('falls back to API when session propertyId mismatches', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', 'different-id');
      sessionStorage.setItem('selectedPropertyName', '別物件');
      sessionStorage.setItem('selectedRooms', JSON.stringify(ROOMS));

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(
          createMockFetchResponse({
            success: true,
            data: { rooms: [{ id: 'r1', name: '部屋1' }], propertyName: 'API物件' },
          })
        )
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('API物件')).toBeInTheDocument();
      });
    });

    it('falls back to API when session rooms are invalid JSON', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'テスト物件');
      sessionStorage.setItem('selectedRooms', 'not-json');

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(
          createMockFetchResponse({
            success: true,
            data: { rooms: [{ id: 'r1', name: '部屋1' }], propertyName: 'API物件' },
          })
        )
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('API物件')).toBeInTheDocument();
      });
    });
  });

  describe('dual API strategy', () => {
    it('falls back to legacy API when light API fails', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url) => {
          if (url.includes('getRoomsLight')) {
            return Promise.reject(new Error('Light API failed'));
          }
          return createMockFetchResponse({
            success: true,
            data: {
              rooms: [{ id: 'r1', name: 'レガシー部屋' }],
              propertyName: 'レガシー物件',
            },
          });
        })
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('レガシー部屋')).toBeInTheDocument();
        expect(screen.getByText('レガシー物件')).toBeInTheDocument();
      });
    });

    it('falls back to legacy API on non-OK response', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url) => {
          if (url.includes('getRoomsLight')) {
            return createMockFetchResponse({}, { ok: false, status: 503 });
          }
          return createMockFetchResponse({
            success: true,
            data: {
              rooms: [{ id: 'r1', name: 'フォールバック部屋' }],
              property: { name: 'フォールバック物件' },
            },
          });
        })
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('フォールバック部屋')).toBeInTheDocument();
      });
    });

    it('falls back to legacy when light API returns success=false', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url) => {
          if (url.includes('getRoomsLight')) {
            return createMockFetchResponse({ success: false, error: 'Light error' });
          }
          return createMockFetchResponse({
            success: true,
            data: {
              rooms: [{ id: 'r1', name: 'レガシー部屋' }],
              propertyName: 'レガシー物件',
            },
          });
        })
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('レガシー部屋')).toBeInTheDocument();
      });
    });
  });

  describe('displayToast', () => {
    it('shows toast message and auto-hides after timeout', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'テスト物件');
      sessionStorage.setItem(
        'selectedRooms',
        JSON.stringify([{ id: 'room-103', name: '103号室', isNotNeeded: true }])
      );

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(createMockFetchResponse({ success: true, data: { rooms: [] } }))
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('103号室')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('103号室'));

      await waitFor(() => {
        expect(screen.getByText('この部屋は検針不要に設定されています。')).toBeInTheDocument();
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(
          screen.queryByText('この部屋は検針不要に設定されています。')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('gasWebAppUrl fallback from localStorage', () => {
    it('uses localStorage URL when sessionStorage is empty', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      localStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(
          createMockFetchResponse({
            success: true,
            data: { rooms: [{ id: 'r1', name: '部屋1' }], propertyName: 'テスト物件' },
          })
        )
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('部屋1')).toBeInTheDocument();
      });

      expect(sessionStorage.getItem('gasWebAppUrl')).toBe(MOCK_GAS_URL);
    });
  });

  describe('room name fallbacks', () => {
    it('falls back to room ID when name is missing', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'テスト物件');
      sessionStorage.setItem('selectedRooms', JSON.stringify([{ id: 'room-999' }]));

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(createMockFetchResponse({ success: true, data: { rooms: [] } }))
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('room-999')).toBeInTheDocument();
      });
    });
  });

  describe('complete inspection button visibility', () => {
    it('hides complete button when there are no rooms', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);

      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockReturnValue(
            createMockFetchResponse({ success: true, data: { rooms: [], propertyName: '空物件' } })
          )
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('部屋データがありません')).toBeInTheDocument();
      });

      expect(screen.queryByText('この物件の検針を完了する')).not.toBeInTheDocument();
    });
  });

  // === Phase V: Additional branch coverage ===

  describe('room display variants', () => {
    it('shows completed badge without date when isCompleted but no readingDateFormatted', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'テスト物件');
      sessionStorage.setItem(
        'selectedRooms',
        JSON.stringify([{ id: 'room-105', name: '105号室', isCompleted: true }])
      );

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(createMockFetchResponse({ success: true, data: { rooms: [] } }))
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('105号室')).toBeInTheDocument();
        // Should show '検針済み' without date since readingDateFormatted is missing
        expect(screen.getByText('検針済み')).toBeInTheDocument();
      });
    });

    it('navigates using roomId when room has no id', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyId', MOCK_PROPERTY_ID);
      sessionStorage.setItem('selectedPropertyName', 'テスト物件');
      sessionStorage.setItem(
        'selectedRooms',
        JSON.stringify([{ roomId: 'room-201', name: '201号室' }])
      );

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(createMockFetchResponse({ success: true, data: { rooms: [] } }))
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('201号室')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('201号室'));
      expect(window.location.href).toContain('room-201');
    });
  });

  describe('legacy API property name fallbacks', () => {
    it('falls back to property_name from data', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url) => {
          if (url.includes('getRoomsLight')) {
            return Promise.reject(new Error('Light failed'));
          }
          return createMockFetchResponse({
            success: true,
            data: {
              rooms: [{ id: 'r1', name: '部屋1' }],
              property_name: 'pn-objects',
            },
          });
        })
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('pn-objects')).toBeInTheDocument();
      });
    });

    it('falls back to data.name when no other name fields', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url) => {
          if (url.includes('getRoomsLight')) {
            return Promise.reject(new Error('Light failed'));
          }
          return createMockFetchResponse({
            success: true,
            data: {
              rooms: [{ id: 'r1', name: '部屋1' }],
              name: 'name-field',
            },
          });
        })
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('name-field')).toBeInTheDocument();
      });
    });

    it('falls back to sessionStorage name when no name in data', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);
      sessionStorage.setItem('selectedPropertyName', 'cached-name');

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url) => {
          if (url.includes('getRoomsLight')) {
            return Promise.reject(new Error('Light failed'));
          }
          return createMockFetchResponse({
            success: true,
            data: {
              rooms: [{ id: 'r1', name: '部屋1' }],
            },
          });
        })
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('cached-name')).toBeInTheDocument();
      });
    });

    it('shows empty rooms when legacy API returns non-array rooms', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url) => {
          if (url.includes('getRoomsLight')) {
            return Promise.reject(new Error('Light failed'));
          }
          return createMockFetchResponse({
            success: true,
            data: { rooms: 'not-an-array' },
          });
        })
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('部屋データがありません')).toBeInTheDocument();
      });
    });
  });

  describe('light API returns non-array data', () => {
    it('handles light API returning data without rooms', async () => {
      mockLocationSearch(`?propertyId=${MOCK_PROPERTY_ID}`);
      sessionStorage.setItem('gasWebAppUrl', MOCK_GAS_URL);

      vi.stubGlobal(
        'fetch',
        vi.fn().mockReturnValue(
          createMockFetchResponse({
            success: true,
            data: 'not-an-array-or-object',
          })
        )
      );

      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('部屋データがありません')).toBeInTheDocument();
      });
    });
  });

  describe('handleCompleteInspection additional coverage', () => {
    it('shows toast when propertyId is missing', async () => {
      // Render with valid data first
      mockLocationSearch('?propertyId=');
      render(<RoomSelectApp />);

      await waitFor(() => {
        expect(screen.getByText('物件IDが指定されていません。')).toBeInTheDocument();
      });
    });
  });
});
