import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, addDoc, getDocs, updateDoc } from '@angular/fire/firestore';
import { Collaborator, DEFAULT_COLLABORATOR_THEME } from '@/shared/models/collaborator.model';
import { AuthService } from '@/shared/services/auth.service';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CollaboratorsService {
    private firestore = inject(Firestore);
    private auth = inject(AuthService);
    private collectionRef = collection(this.firestore, 'collaborators');
    private collaborators$ = new BehaviorSubject<Collaborator[]>([]);
    private loadPromise: Promise<void>;

    constructor() {
        this.loadPromise = this.load();
    }

    private async load(): Promise<void> {
        const snapshot = await getDocs(this.collectionRef);
        const items: Collaborator[] = snapshot.docs.map((d) => this.mapData(d.id, d.data()));
        items.sort((a, b) => a.name.localeCompare(b.name));
        this.collaborators$.next(items);
    }

    whenLoaded(): Promise<void> {
        return this.loadPromise;
    }

    private mapData(id: string, data: any): Collaborator {
        return {
            id,
            name: data.name ?? '',
            slug: data.slug ?? '',
            theme: {
                fontColor: data.theme?.fontColor ?? DEFAULT_COLLABORATOR_THEME.fontColor,
                backgroundColor: data.theme?.backgroundColor ?? DEFAULT_COLLABORATOR_THEME.backgroundColor,
                tertiaryColor: data.theme?.tertiaryColor ?? DEFAULT_COLLABORATOR_THEME.tertiaryColor
            },
            isActive: data.isActive ?? true,
            createdAt: data.createdAt?.toDate?.() ?? undefined,
            updatedAt: data.updatedAt?.toDate?.() ?? undefined,
            createdBy: data.createdBy,
            updatedBy: data.updatedBy
        };
    }

    getAll(): Observable<Collaborator[]> {
        return this.collaborators$.asObservable();
    }

    getActive(): Collaborator[] {
        return this.collaborators$.value.filter((c) => c.isActive !== false);
    }

    getById(id: string): Collaborator | undefined {
        return this.collaborators$.value.find((c) => c.id === id);
    }

    getBySlug(slug: string): Collaborator | undefined {
        return this.collaborators$.value.find((c) => c.slug === slug);
    }

    isSlugAvailable(slug: string, excludeId?: string): boolean {
        const trimmed = slug.trim().toLowerCase();
        if (!trimmed) return false;
        return !this.collaborators$.value.some((c) => c.slug?.toLowerCase() === trimmed && c.id !== excludeId);
    }

    async create(payload: Omit<Collaborator, 'id' | 'createdAt' | 'updatedAt'>): Promise<Collaborator> {
        const currentUserId = this.auth.currentUserId;
        const data: any = {
            name: payload.name.trim(),
            slug: payload.slug.trim(),
            theme: { ...payload.theme },
            isActive: payload.isActive ?? true,
            createdAt: new Date(),
            createdBy: currentUserId ?? null
        };
        const docRef = await addDoc(this.collectionRef, data);
        const newCollab: Collaborator = { id: docRef.id, ...data };
        const updated = [...this.collaborators$.value, newCollab].sort((a, b) => a.name.localeCompare(b.name));
        this.collaborators$.next(updated);
        return newCollab;
    }

    async update(id: string, partial: Partial<Collaborator>): Promise<void> {
        const currentUserId = this.auth.currentUserId;
        const docRef = doc(this.firestore, 'collaborators', id);

        const payload: any = {
            ...(partial.name !== undefined ? { name: partial.name.trim() } : {}),
            ...(partial.slug !== undefined ? { slug: partial.slug.trim() } : {}),
            ...(partial.theme !== undefined ? { theme: { ...partial.theme } } : {}),
            ...(partial.isActive !== undefined ? { isActive: partial.isActive } : {}),
            updatedAt: new Date(),
            updatedBy: currentUserId ?? null
        };

        await updateDoc(docRef, payload);

        this.collaborators$.next(
            this.collaborators$.value
                .map((c) => (c.id === id ? { ...c, ...payload, id } : c))
                .sort((a, b) => a.name.localeCompare(b.name))
        );
    }

    async refresh(): Promise<void> {
        this.loadPromise = this.load();
        await this.loadPromise;
    }
}
