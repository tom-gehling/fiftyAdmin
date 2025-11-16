export type QuizzingType = 'Weekly' | 'Fortnightly' | 'Monthly' | 'Collab' | 'One-Offs' | 'Custom';

export interface Venue {
  id?: string;
  name: string;
  isActive: boolean;
  quizzingType: QuizzingType;
  commencingDate?: string;
  quizTime: string;
  state?: string;
  city?: string;
  address?: string;
  latitude?: number;   // filled automatically via geocoding
  longitude?: number;
}
