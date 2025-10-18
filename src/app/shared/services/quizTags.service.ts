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

  constructor() {
    this.loadAllTags();
  }

  /** Load all tags into the BehaviorSubject */
  private async loadAllTags() {
    try {
      const snapshot = await getDocs(this.collectionRef);
      const tags: QuizTag[] = snapshot.docs.map(d => {
        const data = d.data() as QuizTag;
        return {
          id: d.id,
          name: data.name,
          isActive: data.isActive ?? true,
          creationUser: data.creationUser,
          creationTime: data.creationTime
            ? new Date((data.creationTime as any).seconds * 1000)
            : new Date(),
          deletionUser: data.deletionUser,
          deletionTime: data.deletionTime
            ? new Date((data.deletionTime as any).seconds * 1000)
            : undefined,
          quizIds: Array.isArray(data.quizIds) ? data.quizIds.map(id => Number(id)) : [],
          order: data.order ?? 0
        };
      });

      tags.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      this.tags$.next(tags);
    } catch (err) {
      console.error('Failed to load quiz tags', err);
    }
  }

  /** Observable of all active tags */
  getAllTags(): Observable<QuizTag[]> {
    return this.tags$.asObservable().pipe(
      map(tags => tags.filter(t => !t.deletionTime))
    );
  }

  /** Create a new tag */
  async createTag(tagData: Partial<QuizTag>): Promise<void> {
    if (!this.auth.isAdmin$.value) throw new Error('Not authorized');

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

  /** Update an existing tag */
  async updateTag(tagId: string, tagData: Partial<QuizTag>) {
    const docRef = doc(this.firestore, 'quizTags', tagId);
    const payload: Partial<QuizTag> = {
      name: tagData.name?.trim(),
      isActive: tagData.isActive,
      quizIds: Array.isArray(tagData.quizIds) ? tagData.quizIds.map(id => Number(id)) : undefined,
      order: tagData.order
    };
    Object.keys(payload).forEach(k => payload[k as keyof QuizTag] === undefined && delete payload[k as keyof QuizTag]);
    await updateDoc(docRef, payload);

    this.tags$.next(this.tags$.value.map(t => t.id === tagId ? { ...t, ...payload } : t));
  }

  /** Soft delete a tag */
  async deleteTag(tagId: string) {
    if (!this.auth.isAdmin$.value) throw new Error('Not authorized');

    const docRef = doc(this.firestore, 'quizTags', tagId);
    const deletionTime = new Date();

    await updateDoc(docRef, {
      deletionUser: this.auth.currentUserId!,
      deletionTime
    });

    this.tags$.next(this.tags$.value.map(t =>
      t.id === tagId ? { ...t, deletionUser: this.auth.currentUserId!, deletionTime } : t
    ));
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
      creationTime: data.creationTime ? new Date((data.creationTime as any).seconds * 1000) : new Date(),
      deletionUser: data.deletionUser,
      deletionTime: data.deletionTime ? new Date((data.deletionTime as any).seconds * 1000) : undefined,
      quizIds: Array.isArray(data.quizIds) ? data.quizIds.map(id => Number(id)) : [],
      order: data.order ?? 0
    };
  }
}
