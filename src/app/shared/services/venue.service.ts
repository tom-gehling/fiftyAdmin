import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, addDoc, getDocs, getDoc, updateDoc, query, where } from '@angular/fire/firestore';
import { Venue, VenueSchedule } from '@/shared/models/venue.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '@/shared/services/auth.service';

@Injectable({ providedIn: 'root' })
export class VenueService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  private collectionRef = collection(this.firestore, 'venues');
  private venues$ = new BehaviorSubject<Venue[]>([]);

  constructor() {
    this.loadAllVenues();
  }

  /**
   * Load all venues into the BehaviorSubject
   */
  private async loadAllVenues() {
    try {
      const snapshot = await getDocs(this.collectionRef);
      const venues: Venue[] = snapshot.docs.map(d => {
        const data = d.data() as Venue;
        return this.mapVenueData(d.id, data);
      });

      this.venues$.next(venues);
    } catch (err) {
      console.error('Failed to load venues', err);
    }
  }

  /**
   * Map Firestore data to Venue model with proper date conversion
   */
  private mapVenueData(id: string, data: any): Venue {
    return {
      id,
      venueName: data.venueName ?? '',
      location: data.location ?? {
        address: '',
        city: '',
        country: '',
        latitude: 0,
        longitude: 0
      },
      websiteUrl: data.websiteUrl,
      phoneNumber: data.phoneNumber,
      email: data.email,
      quizSchedules: Array.isArray(data.quizSchedules)
        ? data.quizSchedules.map((s: any) => ({
            ...s,
            customDates: s.customDates?.map((d: any) =>
              d?.seconds ? new Date(d.seconds * 1000) : new Date(d)
            ) || []
          }))
        : [],
      isActive: data.isActive ?? true,
      createdBy: data.createdBy ?? '',
      createdAt: data.createdAt?.seconds
        ? new Date(data.createdAt.seconds * 1000)
        : new Date(),
      updatedBy: data.updatedBy,
      updatedAt: data.updatedAt?.seconds
        ? new Date(data.updatedAt.seconds * 1000)
        : undefined,
      deletedBy: data.deletedBy,
      deletedAt: data.deletedAt?.seconds
        ? new Date(data.deletedAt.seconds * 1000)
        : undefined,
      description: data.description,
      imageUrl: data.imageUrl,
      tags: data.tags,
      capacity: data.capacity
    };
  }

  /**
   * Get all venues (including deleted)
   */
  getAllVenues(): Observable<Venue[]> {
    return this.venues$.asObservable();
  }

  /**
   * Get only active, non-deleted venues
   */
  getActiveVenues(): Observable<Venue[]> {
    return this.venues$.asObservable().pipe(
      map(venues => venues.filter(v => v.isActive && !v.deletedAt))
    );
  }

  /**
   * Get venues with a quiz on a specific day of week
   */
  getVenuesWithQuizOnDay(dayOfWeek: number): Observable<Venue[]> {
    return this.getActiveVenues().pipe(
      map(venues => venues.filter(v =>
        v.quizSchedules.some(s =>
          s.isActive && s.dayOfWeek === dayOfWeek
        )
      ))
    );
  }

  /**
   * Get a single venue by ID
   */
  async getVenueById(id: string): Promise<Venue | undefined> {
    const docRef = doc(this.firestore, 'venues', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return undefined;

    return this.mapVenueData(docSnap.id, docSnap.data());
  }

  /**
   * Create a new venue
   */
  async createVenue(venueData: Partial<Venue>): Promise<void> {
    const currentUserId = this.auth.currentUserId;
    if (!currentUserId) throw new Error('User not authenticated');

    const newVenue: Omit<Venue, 'id'> = {
      venueName: venueData.venueName?.trim() || '',
      location: venueData.location || {
        address: '',
        city: '',
        country: '',
        latitude: 0,
        longitude: 0
      },
      websiteUrl: venueData.websiteUrl?.trim() || '',
      phoneNumber: venueData.phoneNumber?.trim() || '',
      email: venueData.email?.trim() || '',
      quizSchedules: venueData.quizSchedules || [],
      isActive: venueData.isActive ?? true,
      createdBy: currentUserId,
      createdAt: new Date(),
      description: venueData.description?.trim() || '',
      imageUrl: venueData.imageUrl || '',
      tags: venueData.tags || [],
      capacity: venueData.capacity
    };

    // Remove undefined fields (Firestore rejects undefined values)
    Object.keys(newVenue).forEach(k => (newVenue as any)[k] === undefined && delete (newVenue as any)[k]);

    const docRef = await addDoc(this.collectionRef, newVenue);
    this.venues$.next([...this.venues$.value, { ...newVenue, id: docRef.id }]);
  }

  /**
   * Update an existing venue
   */
  async updateVenue(id: string, venueData: Partial<Venue>): Promise<void> {
    const currentUserId = this.auth.currentUserId;
    if (!currentUserId) throw new Error('User not authenticated');

    const docRef = doc(this.firestore, 'venues', id);

    const payload: any = {
      venueName: venueData.venueName?.trim(),
      location: venueData.location,
      websiteUrl: venueData.websiteUrl?.trim(),
      phoneNumber: venueData.phoneNumber?.trim(),
      email: venueData.email?.trim(),
      quizSchedules: venueData.quizSchedules,
      isActive: venueData.isActive,
      updatedBy: currentUserId,
      updatedAt: new Date(),
      description: venueData.description?.trim(),
      imageUrl: venueData.imageUrl,
      tags: venueData.tags,
      capacity: venueData.capacity
    };

    // Remove undefined fields
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    await updateDoc(docRef, payload);

    // Update local cache
    this.venues$.next(
      this.venues$.value.map(v => v.id === id ? { ...v, ...payload, id } : v)
    );
  }

  /**
   * Soft delete a venue
   */
  async deleteVenue(id: string): Promise<void> {
    const currentUserId = this.auth.currentUserId;
    if (!currentUserId) throw new Error('User not authenticated');

    const docRef = doc(this.firestore, 'venues', id);
    const deletedAt = new Date();

    await updateDoc(docRef, {
      deletedBy: currentUserId,
      deletedAt
    });

    // Update local cache
    this.venues$.next(
      this.venues$.value.map(v =>
        v.id === id ? { ...v, deletedBy: currentUserId, deletedAt } : v
      )
    );
  }

  /**
   * Permanently delete a venue (use with caution)
   */
  async permanentlyDeleteVenue(id: string): Promise<void> {
    // This would use deleteDoc from Firestore
    // Not implementing for now as we prefer soft deletes
    throw new Error('Permanent deletion not implemented. Use soft delete instead.');
  }

  /**
   * Refresh venues from Firestore
   */
  async refresh(): Promise<void> {
    await this.loadAllVenues();
  }
}
