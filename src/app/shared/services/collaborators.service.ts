import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, getDocs } from '@angular/fire/firestore';
import { Collaborator } from '@/shared/models/collaborator.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CollaboratorsService {
    private firestore = inject(Firestore);
    private collectionRef = collection(this.firestore, 'collaborators');
    private collaborators$ = new BehaviorSubject<Collaborator[]>([]);

    constructor() {
        this.load();
    }

    private async load(): Promise<void> {
        const snapshot = await getDocs(this.collectionRef);
        const items: Collaborator[] = snapshot.docs.map((d) => {
            const data = d.data() as any;
            return {
                id: d.id,
                name: data.name ?? '',
                createdAt: data.createdAt?.toDate?.() ?? undefined
            };
        });
        items.sort((a, b) => a.name.localeCompare(b.name));
        this.collaborators$.next(items);
    }

    getAll(): Observable<Collaborator[]> {
        return this.collaborators$.asObservable();
    }

    async create(name: string): Promise<Collaborator> {
        const data = { name: name.trim(), createdAt: new Date() };
        const docRef = await addDoc(this.collectionRef, data);
        const newCollab: Collaborator = { id: docRef.id, ...data };
        const updated = [...this.collaborators$.value, newCollab].sort((a, b) => a.name.localeCompare(b.name));
        this.collaborators$.next(updated);
        return newCollab;
    }
}
