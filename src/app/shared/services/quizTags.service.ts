import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where } from '@angular/fire/firestore';

import { QuizTag } from '@/shared/models/quizTags.model';
import { Timestamp } from 'firebase/firestore';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '@/shared/services/auth.service';

@Injectable({ providedIn: 'root' })
export class QuizTagsService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  private collectionRef = collection(this.firestore, 'quizTags');

  private tags$ = new BehaviorSubject<QuizTag[]>([]);
  public tagsObservable: Observable<QuizTag[]> = this.tags$.asObservable();

  constructor() {
    this.loadAllTags();
  }

  /** Load all tags into the BehaviorSubject */
  private async loadAllTags() {
    const snapshot = await getDocs(this.collectionRef);
    const tags = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QuizTag));
    this.tags$.next(tags);
  }

  /** Get all tags (live) */
  getAllTags(): Observable<QuizTag[]> {
    return this.tagsObservable.pipe(
      map(tags => tags.filter(t => !t.deletionTime)) // exclude deleted tags
    );
  }


  async createTag(name: string): Promise<void> {
    if (!this.auth.isAdmin$.value) {
      throw new Error('You are not authorized to create tags');
    }

    const newTag: QuizTag = {
      name,
      creationUser: this.auth.currentUserId!,
      creationTime: new Date() 
    };

    const docRef = await addDoc(this.collectionRef, newTag);
    this.tags$.next([...this.tags$.value, { ...newTag, id: docRef.id }]);
}

  /** Update an existing tag name */
  async updateTag(tagId: string, newName: string): Promise<void> {
    const docRef = doc(this.firestore, 'quizTags', tagId);
    await updateDoc(docRef, { name: newName });
    const updatedTags = this.tags$.value.map(t => t.id === tagId ? { ...t, name: newName } : t);
    this.tags$.next(updatedTags);
  }

  async deleteTag(tagId: string): Promise<void> {
    if (!this.auth.isAdmin$.value) {
      throw new Error('You are not authorized to delete tags');
    }

    const docRef = doc(this.firestore, 'quizTags', tagId);
    await updateDoc(docRef, {
      deletionUser: this.auth.currentUserId!,
      deletionTime: new Date() 
    });

    const updatedTags = this.tags$.value.map(t => t.id === tagId ? { ...t, deletionUser: this.auth.currentUserId!, deletionTime: new Date() } : t);
    this.tags$.next(updatedTags);
}

  /** Get a single tag by ID */
  async getTagById(tagId: string): Promise<QuizTag | undefined> {
    const docRef = doc(this.firestore, 'quizTags', tagId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as QuizTag) : undefined;
  }
}
