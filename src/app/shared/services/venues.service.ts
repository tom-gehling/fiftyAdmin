import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Venue } from '../models/venues.model';

@Injectable({ providedIn: 'root' })
export class VenueService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  private collectionRef = collection(this.firestore, 'venues');
  private venues$ = new BehaviorSubject<Venue[]>([]);

  constructor() {
    // Subscribe to admin status and load venues if admin
    this.auth.isAdmin$.subscribe(isAdmin => {
      if (isAdmin) {
        this.loadAllVenues();
      }
    });
  }

  /** Load all venues from Firestore */
  private async loadAllVenues() {
    try {
      const q = query(this.collectionRef, orderBy('name'));
      const snapshot = await getDocs(q);
      const venues: Venue[] = snapshot.docs.map(d => {
        const data = d.data() as Venue;
        return { id: d.id, ...data };
      });
      this.venues$.next(venues);
      console.log('Venues loaded:', venues);
    } catch (err) {
      console.error('Failed to load venues', err);
    }
  }

  /** Observable of all venues */
  getVenues(): Observable<Venue[]> {
    return this.venues$.asObservable();
  }

  /** Get a single venue by ID */
  async getVenueById(id: string): Promise<Venue | undefined> {
    try {
      const docRef = doc(this.firestore, 'venues', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return undefined;
      const data = docSnap.data() as Venue;
      return { id: docSnap.id, ...data };
    } catch (err) {
      console.error('Failed to get venue by ID', err);
      return undefined;
    }
  }

  /** Delete a venue */
  async deleteVenue(id: string) {
    if (!this.auth.isAdmin$.value) throw new Error('Not authorized');
    try {
      const docRef = doc(this.firestore, 'venues', id);
      await deleteDoc(docRef);
      this.venues$.next(this.venues$.value.filter(v => v.id !== id));
    } catch (err) {
      console.error('Failed to delete venue', err);
    }
  }

  /** Add a new venue */
  async addVenue(venue: Venue) {
    if (!this.auth.isAdmin$.value) throw new Error('Not authorized');

    try {
      const payload: Omit<Venue, 'id'> = { ...venue }; 
      const docRef = await addDoc(this.collectionRef, payload as any);
      const newVenue: Venue = { ...venue, id: docRef.id };
      this.venues$.next([...this.venues$.value, newVenue]);
    } catch (err) {
      console.error('Failed to add venue', err);
    }
  }

  /** Update an existing venue */
  async updateVenue(id: string, venue: Venue) {
    if (!this.auth.isAdmin$.value) throw new Error('Not authorized');

    try {
      const payload: Omit<Venue, 'id'> = { ...venue };
      const docRef = doc(this.firestore, 'venues', id);
      await updateDoc(docRef, payload as any);
      const updatedVenue: Venue = { ...venue, id };
      this.venues$.next(
        this.venues$.value.map(v => (v.id === id ? updatedVenue : v))
      );
    } catch (err) {
      console.error('Failed to update venue', err);
    }
  }
}
