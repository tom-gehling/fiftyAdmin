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
  /** Load all tags into the BehaviorSubject */
private async loadAllTags() {
  const snapshot = await getDocs(this.collectionRef);

  const tags: QuizTag[] = snapshot.docs.map(d => {
    const data = d.data() as QuizTag;

    return {
      id: d.id,
      name: data.name,
      isActive: data.isActive ?? true,
      creationUser: data.creationUser,
      creationTime: data.creationTime
        ? (data.creationTime instanceof Date
            ? data.creationTime
            : new Date((data.creationTime as any).seconds * 1000))
        : new Date(),
      deletionUser: data.deletionUser,
      deletionTime: data.deletionTime
        ? (data.deletionTime instanceof Date
            ? data.deletionTime
            : new Date((data.deletionTime as any).seconds * 1000))
        : undefined,
      quizIds: Array.isArray(data.quizIds) ? data.quizIds.map(id => Number(id)) : [],
      order: data.order ?? 0
    };
  });

  // Sort by order
  tags.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

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
      name: tagData.name?.trim() || '',
      isActive: tagData.isActive ?? true,
      creationUser: this.auth.currentUserId!,
      creationTime: new Date(),
      quizIds: Array.isArray(tagData.quizIds) ? tagData.quizIds.map(id => Number(id)) : [],
      order: tagData.order ?? this.tags$.value.length
    };

    const docRef = await addDoc(this.collectionRef, newTag);
    this.tags$.next([...this.tags$.value, { ...newTag, id: docRef.id }]);
  }

  /** Update an existing tag including quiz assignments */
  async updateTag(tagId: string, tagData: Partial<QuizTag>): Promise<void> {
    const docRef = doc(this.firestore, 'quizTags', tagId);
    const updatePayload: Partial<QuizTag> = {
      name: tagData.name?.trim(),
      isActive: tagData.isActive,
      quizIds: Array.isArray(tagData.quizIds) ? tagData.quizIds.map(id => Number(id)) : undefined,
      order: tagData.order
    };

    // Remove undefined fields
    Object.keys(updatePayload).forEach(key => updatePayload[key as keyof QuizTag] === undefined && delete updatePayload[key as keyof QuizTag]);

    await updateDoc(docRef, updatePayload);

    // Update local BehaviorSubject
    const updatedTags = this.tags$.value.map(t => t.id === tagId ? { ...t, ...updatePayload } : t);
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
    if (!docSnap.exists()) return undefined;

    const data = docSnap.data() as QuizTag;
    return {
      id: docSnap.id,
      name: data.name ?? '',
      isActive: data.isActive ?? true,
      creationUser: data.creationUser,
      creationTime: data.creationTime ? new Date(data.creationTime) : new Date(),
      deletionUser: data.deletionUser,
      deletionTime: data.deletionTime ? new Date(data.deletionTime) : undefined,
      quizIds: Array.isArray(data.quizIds) ? data.quizIds.map((id: any) => Number(id)) : [],
      order: data.order ?? 0
    };
  }
}
