import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData, setDoc, arrayUnion, serverTimestamp } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class QuizCategoriesService {
    private firestore = inject(Firestore);
    private docRef = doc(this.firestore, 'config/quizCategories');

    readonly categories$: Observable<string[]> = (docData(this.docRef) as Observable<{ values?: string[] } | undefined>).pipe(
        map((d) => (d?.values ?? []).slice().sort()),
        shareReplay(1)
    );

    /** Upsert any new categories into the config doc. Called on quiz save so new
     *  values typed into the editable dropdown become available everywhere. */
    async addIfMissing(newCategories: string[]): Promise<void> {
        const cleaned = Array.from(new Set(newCategories.map((c) => (c || '').toUpperCase().trim()).filter(Boolean)));
        if (!cleaned.length) return;
        await setDoc(
            this.docRef,
            {
                values: arrayUnion(...cleaned),
                updatedAt: serverTimestamp()
            },
            { merge: true }
        );
    }
}
