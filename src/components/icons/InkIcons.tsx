/**
 * T10.2 — Satu keluarga ikon guratan tinta manga (design.md 11.2).
 *
 * Bukan vektor sempurna: sudut tajam (butt cap), garis tebal 3px, sedikit
 * tidak presisi supaya terasa seperti gambar tinta. Hanya hitam-putih.
 *
 * Ikon sekunder (panah, silang, pengaturan) tetap memakai library minimalis
 * yang sudah diseragamkan ketebalannya.
 */
import type { SVGProps } from 'react';

type InkIconProps = SVGProps<SVGSVGElement>;

const BASE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.8,
  strokeLinecap: 'butt' as const,
  strokeLinejoin: 'miter' as const,
  xmlns: 'http://www.w3.org/2000/svg',
};

/** Lari (workout / kaki). */
export function InkRun(props: InkIconProps) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="13.5" cy="4.2" r="2" fill="currentColor" stroke="none" />
      <path d="M12.5 7.5 L9.5 11 L12 13.5 L11 18.5" />
      <path d="M12 13.5 L16.5 12 L18.5 15.5" />
      <path d="M9.5 11 L6.5 9.5" />
      <path d="M11 18.5 L8.5 21.5" />
    </svg>
  );
}

/** Push-up (workout / tangan). */
export function InkPushUp(props: InkIconProps) {
  return (
    <svg {...BASE} {...props}>
      <circle cx="5" cy="7" r="2" fill="currentColor" stroke="none" />
      <path d="M5 9.5 L5 14" />
      <path d="M4 14 L19 14" />
      <path d="M5 14 L3.5 20.5" />
      <path d="M9.5 14 L8.5 20.5" />
      <path d="M19 14 L20.5 20.5" />
    </svg>
  );
}

/** Makan (garpu & sendok bersilang). */
export function InkMeal(props: InkIconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M8 3 L8 10" />
      <path d="M6 3 L6 6.5 Q6 8 8 8.5" />
      <path d="M10 3 L10 6.5 Q10 8 8 8.5" />
      <path d="M8 10 L8 21" />
      <path d="M15.5 3 L15.5 21" />
      <path d="M15.5 8.5 Q18.5 8.5 18.5 5.5 Q18.5 3 15.5 3" />
    </svg>
  );
}

/** Tidur (bulan sabit tinta). */
export function InkSleep(props: InkIconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M19.5 13.5 A7.5 7.5 0 1 1 10.5 4.5 A6 6 0 0 0 19.5 13.5 Z" />
      <path d="M6 18 L9 18" strokeWidth={2.2} />
      <path d="M14 7.5 L17 7.5" strokeWidth={2.2} />
    </svg>
  );
}

/** Timer (jarum stempel, bukan jam analog sempurna). */
export function InkTimer(props: InkIconProps) {
  return (
    <svg {...BASE} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" />
      <path d="M12 7 L12 12 L16.5 14.5" />
      <path d="M3.5 3.5 L6.5 3.5 L6.5 6.5" strokeWidth={2.2} />
    </svg>
  );
}

/** Cuaca (awan + tetesan hujan tinta). */
export function InkWeather(props: InkIconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M6.5 16.5 A4 4 0 0 1 7 8.5 A5.5 5.5 0 0 1 17.5 9.5 A3.5 3.5 0 0 1 17.5 16.5 Z" />
      <path d="M9 19.5 L8 21.5" />
      <path d="M12.5 19.5 L11.5 21.5" />
      <path d="M16 19.5 L15 21.5" />
    </svg>
  );
}

/** Api/energi (motivasi, fase aktif). */
export function InkFlame(props: InkIconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M12 2.5 Q13 7 16.5 9.5 Q20 12.5 18 16.5 Q16.5 20.5 12 21.5 Q7.5 20.5 6 16.5 Q4 12.5 7.5 9.5 Q11 7 12 2.5 Z" />
      <path d="M12 10 Q13.5 12.5 12.5 15 Q11.5 17 12 19" strokeWidth={2.2} />
    </svg>
  );
}

/** Stempel centang tinta (bukan ikon centang bulat standar). */
export function InkStamp(props: InkIconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M4.5 19.5 L19.5 19.5" strokeWidth={3.4} />
      <path d="M7 15.5 L11 6.5 L15 11 L17 9" />
      <path d="M11 6.5 L11 3.5 L15 3.5 L15 9" />
    </svg>
  );
}

/** Progres (bar bertinta, satu kotak meleset). */
export function InkProgress(props: InkIconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M4 5 L20 5 L20 19 L4 19 Z" strokeWidth={2.2} />
      <path d="M7.5 8.5 L7.5 15.5" strokeWidth={3.2} />
      <path d="M12 8.5 L12 15.5" strokeWidth={3.2} />
      <path d="M16.5 8.5 L16.5 15.5" strokeWidth={3.2} />
    </svg>
  );
}

/** Chat (gelembung panel manga dengan ekor). */
export function InkChat(props: InkIconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M3.5 5.5 L20.5 5.5 L20.5 15.5 L9 15.5 L4.5 19.5 L6 15.5 L3.5 15.5 Z" />
      <path d="M8 10.5 L8 10.51" strokeWidth={4} />
      <path d="M12 10.5 L12 10.51" strokeWidth={4} />
      <path d="M16 10.5 L16 10.51" strokeWidth={4} />
    </svg>
  );
}

/** Jadwal (panel agenda terbuka). */
export function InkSchedule(props: InkIconProps) {
  return (
    <svg {...BASE} {...props}>
      <path d="M4 5 L20 5 L20 19 L4 19 Z" strokeWidth={2.4} />
      <path d="M4 9.5 L20 9.5" strokeWidth={2.4} />
      <path d="M8.5 3 L8.5 7" strokeWidth={2.4} />
      <path d="M15.5 3 L15.5 7" strokeWidth={2.4} />
      <path d="M8 13.5 L12 13.5" strokeWidth={3} />
      <path d="M8 16.5 L16 16.5" strokeWidth={2.2} />
    </svg>
  );
}

/** Asisten AI (kepala robot tinta, BUKAN emoji ✨). */
export function InkAssistant(props: InkIconProps) {
  return (
    <svg {...BASE} {...props}>
      <rect x="5" y="7" width="14" height="12" />
      <path d="M9 4.5 L9 7" />
      <path d="M15 4.5 L15 7" />
      <path d="M8.5 12 L8.5 12.01" strokeWidth={4} />
      <path d="M15.5 12 L15.5 12.01" strokeWidth={4} />
      <path d="M9 15.5 L15 15.5" strokeWidth={2.2} />
    </svg>
  );
}
