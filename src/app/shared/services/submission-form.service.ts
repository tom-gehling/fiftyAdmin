import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '@/shared/services/auth.service';
import { SubmissionForm, SubmissionFormField, DEFAULT_SUBMISSION_FIELDS } from '@/shared/models/submissionForm.model';

@Injectable({ providedIn: 'root' })
export class SubmissionFormService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  private collectionRef = collection(this.firestore, 'submissionForms');
  private forms$ = new BehaviorSubject<SubmissionForm[]>([]);

  constructor() {
    this.loadAllForms();
  }

  private async loadAllForms() {
    try {
      const snapshot = await getDocs(this.collectionRef);
      const forms: SubmissionForm[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data['name'] ?? '',
          description: data['description'],
          isActive: data['isActive'] ?? true,
          isDefault: data['isDefault'] ?? false,
          createdBy: data['createdBy'],
          createdAt: data['createdAt']
            ? new Date((data['createdAt'] as any).seconds * 1000)
            : new Date(),
          updatedAt: data['updatedAt']
            ? new Date((data['updatedAt'] as any).seconds * 1000)
            : undefined,
          fields: Array.isArray(data['fields']) ? data['fields'] : []
        };
      });

      forms.sort((a, b) => a.name.localeCompare(b.name));
      this.forms$.next(forms);
    } catch (err) {
      console.error('Failed to load submission forms', err);
    }
  }

  getAllForms(): Observable<SubmissionForm[]> {
    return this.forms$.asObservable();
  }

  getActiveForms(): Observable<SubmissionForm[]> {
    return this.forms$.asObservable().pipe(
      map(forms => forms.filter(f => f.isActive))
    );
  }

  getActiveFormsForDropdown(): Observable<{ label: string; value: string }[]> {
    return this.getActiveForms().pipe(
      map(forms => forms.map(f => ({ label: f.name, value: f.id! })))
    );
  }

  async getFormById(formId: string): Promise<SubmissionForm | undefined> {
    const docRef = doc(this.firestore, 'submissionForms', formId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data['name'] ?? '',
      description: data['description'],
      isActive: data['isActive'] ?? true,
      isDefault: data['isDefault'] ?? false,
      createdBy: data['createdBy'],
      createdAt: data['createdAt']
        ? new Date((data['createdAt'] as any).seconds * 1000)
        : new Date(),
      updatedAt: data['updatedAt']
        ? new Date((data['updatedAt'] as any).seconds * 1000)
        : undefined,
      fields: Array.isArray(data['fields']) ? data['fields'] : []
    };
  }

  async createForm(formData: Partial<SubmissionForm>): Promise<string> {
    if (!this.auth.isAdmin$.value) throw new Error('Not authorized');

    const newForm = {
      name: formData.name?.trim() || 'Untitled Form',
      description: formData.description?.trim() || '',
      isActive: formData.isActive ?? true,
      isDefault: formData.isDefault ?? false,
      createdBy: this.auth.currentUserId!,
      createdAt: serverTimestamp(),
      fields: formData.fields ?? DEFAULT_SUBMISSION_FIELDS
    };

    if (newForm.isDefault) {
      await this.clearDefaultFlag();
    }

    const docRef = await addDoc(this.collectionRef, newForm);

    this.forms$.next([
      ...this.forms$.value,
      {
        ...newForm,
        id: docRef.id,
        createdAt: new Date()
      } as SubmissionForm
    ]);

    return docRef.id;
  }

  async updateForm(formId: string, formData: Partial<SubmissionForm>): Promise<void> {
    if (!this.auth.isAdmin$.value) throw new Error('Not authorized');

    const docRef = doc(this.firestore, 'submissionForms', formId);

    const payload: any = {
      updatedAt: serverTimestamp()
    };

    if (formData.name !== undefined) payload.name = formData.name.trim();
    if (formData.description !== undefined) payload.description = formData.description.trim();
    if (formData.isActive !== undefined) payload.isActive = formData.isActive;
    if (formData.isDefault !== undefined) {
      payload.isDefault = formData.isDefault;
      if (formData.isDefault) {
        await this.clearDefaultFlag();
      }
    }
    if (formData.fields !== undefined) payload.fields = formData.fields;

    await updateDoc(docRef, payload);

    this.forms$.next(
      this.forms$.value.map(f =>
        f.id === formId ? { ...f, ...payload, updatedAt: new Date() } : f
      )
    );
  }

  async deleteForm(formId: string): Promise<void> {
    if (!this.auth.isAdmin$.value) throw new Error('Not authorized');

    const docRef = doc(this.firestore, 'submissionForms', formId);
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: serverTimestamp()
    });

    this.forms$.next(
      this.forms$.value.map(f =>
        f.id === formId ? { ...f, isActive: false, updatedAt: new Date() } : f
      )
    );
  }

  async setAsDefault(formId: string): Promise<void> {
    await this.clearDefaultFlag();
    await this.updateForm(formId, { isDefault: true });
  }

  private async clearDefaultFlag(): Promise<void> {
    const defaultForms = this.forms$.value.filter(f => f.isDefault);
    for (const form of defaultForms) {
      if (form.id) {
        const docRef = doc(this.firestore, 'submissionForms', form.id);
        await updateDoc(docRef, { isDefault: false });
      }
    }
    this.forms$.next(
      this.forms$.value.map(f => ({ ...f, isDefault: false }))
    );
  }

  getDefaultForm(): Observable<SubmissionForm | undefined> {
    return this.forms$.asObservable().pipe(
      map(forms => forms.find(f => f.isDefault && f.isActive))
    );
  }

  async createDefaultSubmissionForm(): Promise<string> {
    return this.createForm({
      name: 'Standard Submission Form',
      description: 'Default form with team name, location, score, photo, and teammate tagging',
      isActive: true,
      isDefault: true,
      fields: DEFAULT_SUBMISSION_FIELDS
    });
  }
}
