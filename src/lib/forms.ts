/**
 * Local data models for Forms B, C, D.
 * These types live here so they can be reused once real API endpoints are wired.
 *
 * TODO (next phase): move serialized shapes to src/lib/api.ts and add
 * GET/POST /api/bookings/:id/handover
 * GET/POST /api/bookings/:id/equipment-log
 * GET/POST /api/bookings/:id/incidents
 */

// ── Form B – Serah Terima Ruang Sewa ─────────────────────────────────────────

export interface HandoverEntry {
  date: string;        // YYYY-MM-DD
  time: string;        // HH:MM
  petugas: string;     // officer name
  kondisi: string;     // room/equipment condition description
}

export interface HandoverData {
  checkin?: HandoverEntry;
  checkout?: HandoverEntry;
  notes?: string;
}

// ── Form C – Log Penggunaan Equipment ────────────────────────────────────────

export type EquipmentCondition = 'Baik' | 'Ada Cacat Minor' | 'Rusak';

export interface EquipmentLogEntry {
  key: string;
  equipment: string;
  quantity: number;
  time_out: string;     // HH:MM or ''
  time_in: string;      // HH:MM or ''
  condition_out: EquipmentCondition;
  condition_in: EquipmentCondition;
  notes: string;
}

export interface EquipmentLogData {
  entries: EquipmentLogEntry[];
}

// ── Form D – Kerusakan dan Kehilangan Barang ─────────────────────────────────

export type IncidentType = 'Kerusakan' | 'Kehilangan';

export interface IncidentEntry {
  key: string;
  date: string;           // YYYY-MM-DD
  involved: string;       // room or equipment name
  type: IncidentType;
  description: string;
  estimated_cost?: number;
}

export interface IncidentData {
  entries: IncidentEntry[];
}
