/**
 * Google Calendar Integration Service
 * Digunakan untuk mengekspor jadwal rutin atau sesi latihan ke Google Calendar.
 */

export const GOOGLE_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
  scopes: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SCOPES || 'https://www.googleapis.com/auth/calendar.events',
  discoveryDoc: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
};

export interface CalendarEventPayload {
  summary: string;
  description?: string;
  startTime: string; // ISO string e.g. 2026-09-28T05:20:00+07:00
  endTime: string;   // ISO string e.g. 2026-09-28T06:15:00+07:00
  recurrenceRule?: string[]; // e.g. ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR']
}

export class GoogleCalendarService {
  /**
   * Cek apakah konfigurasi Google API lengkap
   */
  static isConfigured(): boolean {
    return Boolean(GOOGLE_CONFIG.clientId && GOOGLE_CONFIG.apiKey);
  }

  /**
   * Format jadwal kegiatan harian menjadi payload event Google Calendar
   */
  static createEventPayload(
    kegiatan: string,
    waktuStart: string, // format HH.MM
    waktuEnd: string,   // format HH.MM
    detail?: string,
    dateISO?: string
  ): CalendarEventPayload {
    const today = dateISO || new Date().toISOString().split('T')[0];
    
    // Normalisasi format "05.20" -> "05:20"
    const startNormalized = waktuStart.replace('.', ':');
    const endNormalized = waktuEnd.replace('.', ':');

    const startDateTime = `${today}T${startNormalized}:00`;
    const endDateTime = `${today}T${endNormalized}:00`;

    return {
      summary: `[RoutineZie] ${kegiatan}`,
      description: detail || 'Jadwal rutin harian Cloverz RoutineZie',
      startTime: new Date(startDateTime).toISOString(),
      endTime: new Date(endDateTime).toISOString(),
    };
  }
}
