// STUB: integrate Priority Pass / DragonPass API in post-MVP

export interface LoungeOpeningHours {
  open: string; // HH:MM
  close: string; // HH:MM
  daysOfWeek: number[]; // 0=Sunday … 6=Saturday
}

export interface LoungeInfo {
  loungeId: string;
  name: string;
  airportIata: string;
  terminal: string;
  accessType: 'priority_pass' | 'dragon_pass' | 'direct';
  openingHours: LoungeOpeningHours[];
  capacity: number | null;
  amenities: string[]; // ['wifi', 'food', 'showers', 'spa', 'business_center']
  pricePerPersonMinorUnits: number;
  currency: string;
  images: string[];
}
