/**
 * Shared utility for updating room completion status in
 * sessionStorage (selectedRooms) and localStorage (cached_rooms_{propId}).
 */

import { CACHE_TTL_MS } from './config';

export function formatDateJa(): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

export function markRoomCompleted(
  rooms: Record<string, unknown>[],
  targetRoomId: string,
  dateStr: string
): Record<string, unknown>[] {
  return rooms.map((room) => {
    const rid = String(room.id || room.roomId || '');
    return rid === targetRoomId
      ? { ...room, readingStatus: 'completed', isCompleted: true, readingDateFormatted: dateStr }
      : room;
  });
}

export function saveRoomsToCache(propId: string, rooms: unknown[], propertyName: string): void {
  localStorage.setItem(
    'cached_rooms_' + propId,
    JSON.stringify({ rooms, propertyName, cachedAt: Date.now() })
  );
}

export function readRoomsFromCache(
  propId: string
): { rooms: unknown[]; propertyName: string } | null {
  const raw = localStorage.getItem('cached_rooms_' + propId);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.rooms)) return null;
    if (parsed.cachedAt && Date.now() - parsed.cachedAt >= CACHE_TTL_MS) return null;
    return { rooms: parsed.rooms, propertyName: parsed.propertyName || '' };
  } catch {
    return null;
  }
}

export function updateRoomInSessionCache(roomId: string): void {
  const raw = sessionStorage.getItem('selectedRooms');
  if (!raw) return;
  try {
    const rooms = JSON.parse(raw);
    if (!Array.isArray(rooms)) return;
    const updated = markRoomCompleted(rooms, roomId, formatDateJa());
    sessionStorage.setItem('selectedRooms', JSON.stringify(updated));
  } catch {}
}

export function updateRoomInLocalCache(propId: string, roomId: string): void {
  const raw = localStorage.getItem('cached_rooms_' + propId);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.rooms || !Array.isArray(parsed.rooms)) return;
    parsed.rooms = markRoomCompleted(parsed.rooms, roomId, formatDateJa());
    localStorage.setItem('cached_rooms_' + propId, JSON.stringify(parsed));
  } catch {}
}

export function updateRoomInBothCaches(propId: string, roomId: string): void {
  updateRoomInSessionCache(roomId);
  updateRoomInLocalCache(propId, roomId);
}
