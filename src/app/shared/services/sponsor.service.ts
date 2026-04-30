import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, addDoc, getDocs, getDoc, updateDoc, serverTimestamp } from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '@/shared/services/auth.service';
import { Sponsor } from '@/shared/models/sponsor.model';

@Injectable({ providedIn: 'root' })
export class SponsorService {
    private firestore = inject(Firestore);
    private auth = inject(AuthService);

    private collectionRef = collection(this.firestore, 'sponsors');
    private sponsors$ = new BehaviorSubject<Sponsor[]>([]);

    constructor() {
        this.loadAllSponsors();
    }

    private async loadAllSponsors() {
        try {
            const snapshot = await getDocs(this.collectionRef);
            const sponsors: Sponsor[] = snapshot.docs.map((d) => this.mapDoc(d.id, d.data()));
            sponsors.sort((a, b) => a.name.localeCompare(b.name));
            this.sponsors$.next(sponsors);
        } catch (err) {
            console.error('Failed to load sponsors', err);
        }
    }

    private mapDoc(id: string, data: any): Sponsor {
        return {
            id,
            name: data['name'] ?? '',
            imageUrl: data['imageUrl'] || '',
            text: data['text'] || '',
            theme: data['theme'] || {},
            appendedFields: Array.isArray(data['appendedFields']) ? data['appendedFields'] : [],
            isActive: data['isActive'] ?? true,
            createdBy: data['createdBy'],
            createdAt: data['createdAt'] ? new Date((data['createdAt'] as any).seconds * 1000) : new Date(),
            updatedAt: data['updatedAt'] ? new Date((data['updatedAt'] as any).seconds * 1000) : undefined
        };
    }

    getAllSponsors(): Observable<Sponsor[]> {
        return this.sponsors$.asObservable();
    }

    getActiveSponsors(): Observable<Sponsor[]> {
        return this.sponsors$.asObservable().pipe(map((sponsors) => sponsors.filter((s) => s.isActive)));
    }

    getActiveSponsorsForDropdown(): Observable<{ label: string; value: string }[]> {
        return this.getActiveSponsors().pipe(map((sponsors) => sponsors.map((s) => ({ label: s.name, value: s.id! }))));
    }

    async getSponsorById(sponsorId: string): Promise<Sponsor | undefined> {
        const docRef = doc(this.firestore, 'sponsors', sponsorId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return undefined;
        return this.mapDoc(docSnap.id, docSnap.data());
    }

    async createSponsor(data: Partial<Sponsor>): Promise<string> {
        if (!this.auth.isAdmin$.value) throw new Error('Not authorized');

        const payload = {
            name: data.name?.trim() || 'Untitled Sponsor',
            imageUrl: data.imageUrl || '',
            text: data.text?.trim() || '',
            theme: data.theme || {},
            appendedFields: data.appendedFields ?? [],
            isActive: data.isActive ?? true,
            createdBy: this.auth.currentUserId!,
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(this.collectionRef, payload);

        this.sponsors$.next([
            ...this.sponsors$.value,
            {
                ...payload,
                id: docRef.id,
                createdAt: new Date()
            } as Sponsor
        ]);

        return docRef.id;
    }

    async updateSponsor(sponsorId: string, data: Partial<Sponsor>): Promise<void> {
        if (!this.auth.isAdmin$.value) throw new Error('Not authorized');

        const docRef = doc(this.firestore, 'sponsors', sponsorId);

        const payload: any = { updatedAt: serverTimestamp() };
        if (data.name !== undefined) payload.name = data.name.trim();
        if (data.imageUrl !== undefined) payload.imageUrl = data.imageUrl;
        if (data.text !== undefined) payload.text = data.text.trim();
        if (data.theme !== undefined) payload.theme = data.theme;
        if (data.appendedFields !== undefined) payload.appendedFields = data.appendedFields;
        if (data.isActive !== undefined) payload.isActive = data.isActive;

        await updateDoc(docRef, payload);

        this.sponsors$.next(this.sponsors$.value.map((s) => (s.id === sponsorId ? { ...s, ...payload, updatedAt: new Date() } : s)));
    }

    async deleteSponsor(sponsorId: string): Promise<void> {
        if (!this.auth.isAdmin$.value) throw new Error('Not authorized');

        const docRef = doc(this.firestore, 'sponsors', sponsorId);
        await updateDoc(docRef, {
            isActive: false,
            updatedAt: serverTimestamp()
        });

        this.sponsors$.next(this.sponsors$.value.map((s) => (s.id === sponsorId ? { ...s, isActive: false, updatedAt: new Date() } : s)));
    }
}
