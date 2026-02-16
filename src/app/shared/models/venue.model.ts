export interface VenueSchedule {
  type: 'weekly' | 'biweekly' | 'monthly' | 'custom';
  dayOfWeek?: number; // 0-6 (Sun-Sat) for weekly/biweekly
  weekOfMonth?: number; // 1-4 for monthly (e.g., "first Tuesday")
  customDates?: Date[]; // For irregular schedules
  startTime?: string; // e.g., "19:00"
  endTime?: string; // e.g., "21:00"
  isActive: boolean;
  notes?: string;
}

export interface VenueLocation {
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  placeId?: string; // Google Places API ID
}

export interface Venue {
  id?: string; // Firestore document ID
  venueName: string;
  location: VenueLocation;
  websiteUrl?: string;
  phoneNumber?: string;
  email?: string;

  quizSchedules: VenueSchedule[]; // Multiple quiz nights per venue

  // Metadata (following quizTags pattern)
  isActive: boolean;
  createdBy: string; // User UID
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  deletedBy?: string; // Soft delete
  deletedAt?: Date;

  // Optional fields
  description?: string;
  imageUrl?: string;
  tags?: string[];
  capacity?: number;
}
