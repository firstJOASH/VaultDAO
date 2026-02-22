/**
 * Export history persistence in localStorage (bounded to last 50 items).
 */

export interface ExportHistoryItem {
  id: string;
  filename: string;
  dataType: string;
  format: string;
  /** ISO date string when exported (primary) */
  exportedAt: string;
  /** Alias for display (same as exportedAt); always set by get/save */
  timestamp: string;
  vaultName?: string;
  vaultAddress?: string;
  storedContent?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

const STORAGE_KEY = 'vaultdao_export_history';
const MAX_ITEMS = 50;

export function saveExportHistoryItem(
  item: Omit<ExportHistoryItem, 'id' | 'timestamp'> & { exportedAt?: string }
): void {
  try {
    const list = getExportHistory();
    const exportedAt = item.exportedAt ?? new Date().toISOString();
    const newItem: ExportHistoryItem = {
      ...item,
      exportedAt,
      timestamp: exportedAt,
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    };
    const updated = [newItem, ...list].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage may be full or disabled
  }
}

export function getExportHistory(): ExportHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : [];
    return arr.map((item: Record<string, unknown>) => {
      const exportedAt =
        (item.exportedAt as string) ?? (item.timestamp as string) ?? new Date().toISOString();
      return { ...item, exportedAt, timestamp: exportedAt };
    }) as ExportHistoryItem[];
  } catch {
    return [];
  }
}

export function clearExportHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
