import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, addDoc, getDocs, getDoc, updateDoc } from '@angular/fire/firestore';
import { QuizTag } from '@/shared/models/quizTags.model';
import { BehaviorSubject, Observable } from 'rxjs';
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

  /** Get all tags (excluding deleted) */
  getAllTags(): Observable<QuizTag[]> {
    return this.tagsObservable.pipe(
      map(tags => tags.filter(t => !t.deletionTime))
    );
  }

  /** Create a new tag with optional quizzes */
  async createTag(tagData: Partial<QuizTag>): Promise<void> {
    if (!this.auth.isAdmin$.value) {
      throw new Error('You are not authorized to create tags');
    }

    const newTag: QuizTag = {
      name: tagData.name || '',
      isActive: tagData.isActive ?? true,
      creationUser: this.auth.currentUserId!,
      creationTime: new Date(),
      quizIds: tagData.quizIds || [],
    };

    const docRef = await addDoc(this.collectionRef, newTag);
    this.tags$.next([...this.tags$.value, { ...newTag, id: docRef.id }]);
  }

  /** Update an existing tag including quiz assignments */
  async updateTag(tagId: string, tagData: Partial<QuizTag>): Promise<void> {
    const docRef = doc(this.firestore, 'quizTags', tagId);
    const updatePayload: any = {
      name: tagData.name,
      isActive: tagData.isActive,
      quizIds: tagData.quizIds || [],
    };

    await updateDoc(docRef, updatePayload);

    const updatedTags = this.tags$.value.map(t =>
      t.id === tagId ? { ...t, ...updatePayload } : t
    );
    this.tags$.next(updatedTags);
  }

  /** Soft delete a tag */
  async deleteTag(tagId: string): Promise<void> {
    if (!this.auth.isAdmin$.value) {
      throw new Error('You are not authorized to delete tags');
    }

    const docRef = doc(this.firestore, 'quizTags', tagId);
    const deletionTime = new Date();

    await updateDoc(docRef, {
      deletionUser: this.auth.currentUserId!,
      deletionTime
    });

    const updatedTags = this.tags$.value.map(t =>
      t.id === tagId ? { ...t, deletionUser: this.auth.currentUserId!, deletionTime } : t
    );
    this.tags$.next(updatedTags);
  }

  /** Get a single tag by ID */
  async getTagById(tagId: string): Promise<QuizTag | undefined> {
    const docRef = doc(this.firestore, 'quizTags', tagId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as QuizTag) : undefined;
  }
}
