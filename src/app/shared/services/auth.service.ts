import { Injectable, inject } from '@angular/core';
import {
  Auth,
  User as FirebaseUser,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from '@angular/fire/auth';
import {
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  increment,
} from '@angular/fire/firestore';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';

export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  createdAt: Date;
  isAdmin?: boolean;
  isMember: boolean;
  isAnon: boolean;
  followers: string[];
  following: string[];
  loginCount: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  public user$ = new BehaviorSubject<AppUser | null>(null);
  public isMember$ = new BehaviorSubject(false);
  public isAdmin$ = new BehaviorSubject(false);
  public initialized$ = new BehaviorSubject(false);

  constructor() {
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        const appUser = await this.ensureUserDocument(user);
        this.user$.next(appUser);
      } else {
        this.user$.next(null);
        this.isMember$.next(false);
        this.isAdmin$.next(false);
      }
      this.initialized$.next(true);
    });
  }

  /** Email/password login */
  async loginEmailPassword(
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<AppUser> {
    await setPersistence(
      this.auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );

    const cred = await signInWithEmailAndPassword(this.auth, email, password);

    if (!cred.user.displayName) {
      await updateProfile(cred.user, {
        displayName: email.split('@')[0],
      });
    }

    const appUser = await this.ensureUserDocument(cred.user);
    this.user$.next(appUser);
    return appUser;
  }

  /** Email/password registration */
  async registerEmailPassword(
    email: string,
    password: string,
    displayName?: string,
    rememberMe: boolean = false
  ): Promise<AppUser> {
    await setPersistence(
      this.auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );

    const cred = await createUserWithEmailAndPassword(this.auth, email, password);

    // Set display name if provided, otherwise use email prefix
    const nameToSet = displayName || email.split('@')[0];
    await updateProfile(cred.user, {
      displayName: nameToSet,
    });

    const appUser = await this.ensureUserDocument(cred.user);
    this.user$.next(appUser);
    return appUser;
  }

  /** Sign in with Google */
  async signInWithGoogle(): Promise<AppUser> {
    const provider = new GoogleAuthProvider();
    // Request additional scopes if needed
    provider.addScope('profile');
    provider.addScope('email');

    const cred = await signInWithPopup(this.auth, provider);
    const appUser = await this.ensureUserDocument(cred.user);
    this.user$.next(appUser);
    return appUser;
  }

  /** Sign in with Apple */
  async signInWithApple(): Promise<AppUser> {
    const provider = new OAuthProvider('apple.com');
    // Apple requires additional parameters
    provider.addScope('email');
    provider.addScope('name');

    const cred = await signInWithPopup(this.auth, provider);
    
    // Apple may return name in additionalUserInfo, handle it if available
    if (cred.user && !cred.user.displayName) {
      // Try to get name from the credential if available
      const displayName = cred.user.email?.split('@')[0] || 'User';
      await updateProfile(cred.user, { displayName });
    }

    const appUser = await this.ensureUserDocument(cred.user);
    this.user$.next(appUser);
    return appUser;
  }

  /** Anonymous login */
  // async loginAnonymous(): Promise<AppUser> {
  //   if (!this.auth.currentUser) {
  //     const cred = await signInAnonymously(this.auth);
  //     const appUser = await this.ensureUserDocument(cred.user, true);
  //     this.user$.next(appUser);
  //     return appUser;
  //   }

  //   return await this.ensureUserDocument(this.auth.currentUser, true);
  // }

  /** Update display name */
  async updateDisplayName(displayName: string) {
    if (!this.auth.currentUser) return;
    await updateProfile(this.auth.currentUser, { displayName });
    const appUser = await this.ensureUserDocument(this.auth.currentUser);
    this.user$.next(appUser);
  }

  async logout() {
    await signOut(this.auth);
    this.user$.next(null);
    this.isAdmin$.next(false);
    this.isMember$.next(false);
  }

  get currentUserId(): string | null {
    return this.auth.currentUser?.uid ?? null;
  }

  // get isAnonymous(): boolean {
  //   return this.auth.currentUser?.isAnonymous ?? true;
  // }

  /**
   * Ensures the Firestore user document exists and returns AppUser
   */
  private async ensureUserDocument(user: FirebaseUser, isAnon = false): Promise<AppUser> {
    const userRef = doc(this.firestore, 'users', user.uid);
    const snapshot = await getDoc(userRef);

    // Check admins collection if email exists
    let isAdmin = false;
    if (user.email) {
      const q = query(
        collection(this.firestore, 'admins'),
        where('emailAddress', '==', user.email)
      );
      const adminSnap = await getDocs(q);
      isAdmin = !adminSnap.empty;
    }

    const now = new Date();
    const loginCount = snapshot.exists() ? snapshot.data()?.['loginCount'] ?? 0 : 0;

    const appUser: AppUser = {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? '',
      photoUrl: user.photoURL ?? '',
      createdAt: snapshot.exists() ? snapshot.data()?.['createdAt'].toDate() : now,
      isAdmin,
      isMember: true, // admins are also members
      isAnon,
      followers: snapshot.exists() ? snapshot.data()?.['followers'] ?? [] : [],
      following: snapshot.exists() ? snapshot.data()?.['following'] ?? [] : [],
      loginCount: loginCount + 1,
    };

    await setDoc(userRef, appUser, { merge: true });

    this.isAdmin$.next(isAdmin);
    this.isMember$.next(appUser.isMember);

    return appUser;
  }
}
