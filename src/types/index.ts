/**
 * TypeScript type definitions for the meter reading inspection application.
 *
 * Covers data models used across property selection, room navigation,
 * meter reading entry, and GAS API communication. All interfaces support
 * both English and Japanese key variants returned by the backend.
 */

// ---------------------------------------------------------------------------
// MeterReading
// ---------------------------------------------------------------------------

/**
 * A single meter reading record returned by the GAS backend.
 *
 * Fields may arrive under English or Japanese keys (e.g. `currentReading`
 * or `今回の指示数`). The `readingMapper` normalises every record to this
 * shape before it reaches UI code.
 */
export interface MeterReading {
  /** Unique record identifier (normalised from `記録ID`, `recordId`, `ID`, or `id`). */
  id: string;
  /** Inspection date string (normalised from `検針日時`, `date`, or `記録日`). */
  date: string;
  /** Current meter reading value (normalised from `今回の指示数`, `今回指示数`, `currentReading`, etc.). */
  currentReading: string | number;
  /** Previous meter reading value (normalised from `前回指示数`, `previousReading`, etc.). */
  previousReading: string | number;
  /** Reading from two periods ago (normalised from `前々回指示数`, `previousPreviousReading`, etc.). */
  previousPreviousReading: string | number;
  /** Reading from three periods ago (normalised from `前々々回指示数`, `threeTimesPrevious`, etc.). */
  threeTimesPrevious: string | number;
  /** Calculated usage for the period (normalised from `今回使用量`, `usage`, or `使用量`). */
  usage: number;
  /**
   * Warning classification:
   * - `'正常'`        – reading is within expected range
   * - `'要確認'`      – reading needs manual review
   * - `'入力待ち'`    – waiting for input (calculable threshold exists)
   * - `'判定不可'`    – cannot determine (insufficient history)
   * - `'エラー'`      – calculation error
   */
  warningFlag: string;
  /** Statistical standard deviation used for the warning threshold. */
  standardDeviation: number | string;
  /** Display status derived from the warning flag and reading values. */
  status: string;
}

// ---------------------------------------------------------------------------
// Property
// ---------------------------------------------------------------------------

/**
 * A property (物件) selectable from the property list screen.
 *
 * The backend may return keys in either English (`id`, `name`,
 * `completionDate`) or Japanese (`物件ID`, `物件名`, `検針完了日`).
 */
export interface Property {
  /** Property identifier (normalised from `id` or `物件ID`). */
  id: string;
  /** Human-readable property name (normalised from `name` or `物件名`). */
  name: string;
  /** ISO date string of inspection completion, or empty string if not completed. */
  completionDate: string;
}

// ---------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------

/**
 * A room (部屋) belonging to a property, shown in the room selection grid.
 *
 * The backend may return keys in English (`id`, `name`, `roomId`,
 * `roomName`) or Japanese (`部屋ID`, `部屋名`).
 */
export interface Room {
  /** Allow dynamic API response keys (e.g. `部屋名`). */
  [key: string]: unknown;
  /** Room identifier (normalised from `id`, `roomId`, or `部屋ID`). */
  id: string;
  /** Human-readable room name (normalised from `name`, `roomName`, or `部屋名`). */
  name: string;
  /**
   * Reading completion status.
   * - `'completed'` – inspection finished
   * - `'pending'`   – not yet inspected
   */
  readingStatus: string;
  /** Formatted date string of the last reading, or empty. */
  readingDateFormatted: string;
  /** When `true` the room is marked as not requiring inspection. */
  isNotNeeded: boolean;
  /** Alias for completion status used in some API responses. */
  isCompleted: boolean;
  /** Alternative room ID field used by some endpoints. */
  roomId: string;
  /** Alternative room name field used by some endpoints. */
  roomName: string;
}

// ---------------------------------------------------------------------------
// RoomNavigation
// ---------------------------------------------------------------------------

/**
 * Result of determining the previous/next room for navigation.
 * Rooms flagged `isNotNeeded` are automatically skipped.
 */
export interface RoomNavigation {
  /** Whether a previous inspectable room exists. */
  hasPrevious: boolean;
  /** Whether a next inspectable room exists. */
  hasNext: boolean;
  /** The previous room object, or `null` if none exists. */
  previousRoom: Room | null;
  /** The next room object, or `null` if none exists. */
  nextRoom: Room | null;
}

// ---------------------------------------------------------------------------
// ToastState
// ---------------------------------------------------------------------------

/**
 * State driving the temporary toast notification overlay.
 */
export interface ToastState {
  /** Message displayed in the toast. */
  message: string;
  /** Whether the toast is currently visible. */
  show: boolean;
}

// ---------------------------------------------------------------------------
// ReadingInputState
// ---------------------------------------------------------------------------

/**
 * Form state for the meter-reading input screen.
 */
export interface ReadingInputState {
  /** Map from date string to the current input value for that reading. */
  readingValues: Record<string, string>;
  /** Map from date string to a validation error message (empty string = valid). */
  inputErrors: Record<string, string>;
  /** Map from date string to the calculated usage state for display. */
  usageStates: Record<string, string>;
}

// ---------------------------------------------------------------------------
// WarningResult
// ---------------------------------------------------------------------------

/**
 * Output of the warning-flag statistical calculation.
 * Returned by `calculateWarningFlag` in `warningFlag.js`.
 */
export interface WarningResult {
  /** Warning classification label (e.g. `'正常'`, `'要確認'`, `'入力待ち'`). */
  warningFlag: string;
  /** Sample standard deviation used in the threshold calculation. */
  standardDeviation: number;
}

// ---------------------------------------------------------------------------
// ApiResponse<T>
// ---------------------------------------------------------------------------

/**
 * Generic wrapper for JSON responses from the GAS Web App backend.
 *
 * Every endpoint returns `{ success: boolean, data?: T, error?: string }`.
 */
export interface ApiResponse<T> {
  /** `true` when the request was processed successfully. */
  success: boolean;
  /** Response payload present on success. */
  data?: T;
  /** Human-readable error message present on failure. */
  error?: string;
}

// ---------------------------------------------------------------------------
// GasUrlConfig
// ---------------------------------------------------------------------------

/**
 * Configuration for the GAS Web App URL used as the API base.
 *
 * The URL is resolved at runtime from (in priority order):
 * 1. `sessionStorage.gasWebAppUrl`
 * 2. `localStorage.gasWebAppUrl`
 * 3. `import.meta.env.VITE_GAS_WEB_APP_URL`
 */
export interface GasUrlConfig {
  /** The resolved GAS Web App URL. */
  gasWebAppUrl: string;
}
