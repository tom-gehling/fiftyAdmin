import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private firestore = inject(Firestore);

  private sanitizeEmail(email: string) {
    return email.replace(/[.@]/g, '_');
  }

  async addAdmin(email: string): Promise<void> {
    const id = this.sanitizeEmail(email);
    const ref = doc(this.firestore, `admins/${id}`);
    await setDoc(ref, { email, addedAt: serverTimestamp() });
  }

  async removeAdmin(email: string): Promise<void> {
    const id = this.sanitizeEmail(email);
    const ref = doc(this.firestore, `admins/${id}`);
    await deleteDoc(ref);
  }

  /** Returns true if an admin document exists for the email */
  async isAdminEmail(email: string): Promise<boolean> {
    const id = this.sanitizeEmail(email);
    const ref = doc(this.firestore, `admins/${id}`);
    const snap = await getDoc(ref);
    return snap.exists();
  }
}
