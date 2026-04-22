import { Injectable, inject } from '@angular/core';
import { Auth, User as FirebaseUser, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, updateProfile, onAuthStateChanged, sendPasswordResetEmail } from '@angular/fire/auth';
import { GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { Firestore, doc, getDoc, setDoc, collection, query, where, getDocs, increment, serverTimestamp } from '@angular/fire/firestore';
import { browserLocalPersistence, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';
import { Purchases, CustomerInfo } from '@revenuecat/purchases-js';
import { environment } from '../../../environments/environment';

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
        if (!environment.production) (window as any).Purchases = Purchases;
        onAuthStateChanged(this.auth, async (user) => {
            if (user) {
                const appUser = await this.ensureUserDocument(user);
                this.user$.next(appUser);
            } else {
                await this.resetRevenueCatIdentity();
                this.user$.next(null);
                this.isMember$.next(false);
                this.isAdmin$.next(false);
            }
            this.initialized$.next(true);
        });
    }

    /**
     * Ensures RevenueCat is configured and its identity matches the given Firebase uid.
     * First call configures the SDK; subsequent calls use `changeUser` to switch identity.
     */
    private async syncRevenueCatIdentity(uid: string): Promise<CustomerInfo | null> {
        try {
            if (!Purchases.isConfigured()) {
                Purchases.configure({ apiKey: environment.revenueCatPublicApiKey, appUserId: uid });
            } else if (Purchases.getSharedInstance().getAppUserId() !== uid) {
                await Purchases.getSharedInstance().changeUser(uid);
            }
            return await Purchases.getSharedInstance().getCustomerInfo();
        } catch (err) {
            console.error('[RevenueCat] identity sync failed', err);
            return null;
        }
    }

    /** Switch RevenueCat back to an anonymous app user on sign-out. */
    private async resetRevenueCatIdentity(): Promise<void> {
        try {
            if (Purchases.isConfigured()) {
                const anonId = Purchases.generateRevenueCatAnonymousAppUserId();
                await Purchases.getSharedInstance().changeUser(anonId);
            }
        } catch (err) {
            console.error('[RevenueCat] anonymous reset failed', err);
        }
    }

    /** True when the RevenueCat customer info has the configured Fifty+ entitlement active. */
    private hasFiftyPlusEntitlement(info: CustomerInfo | null): boolean {
        if (!info) return false;
        return info.entitlements.active[environment.revenueCatEntitlementId] !== undefined;
    }

    /** Email/password login */
    async loginEmailPassword(email: string, password: string, rememberMe: boolean = false): Promise<AppUser> {
        await setPersistence(this.auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

        const cred = await signInWithEmailAndPassword(this.auth, email, password);

        if (!cred.user.displayName) {
            await updateProfile(cred.user, {
                displayName: email.split('@')[0]
            });
        }

        const appUser = await this.ensureUserDocument(cred.user);
        this.user$.next(appUser);
        return appUser;
    }

    /** Email/password registration */
    async registerEmailPassword(email: string, password: string, displayName?: string, rememberMe: boolean = false): Promise<AppUser> {
        await setPersistence(this.auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

        const cred = await createUserWithEmailAndPassword(this.auth, email, password);

        // Set display name if provided, otherwise use email prefix
        const nameToSet = displayName || email.split('@')[0];
        await updateProfile(cred.user, {
            displayName: nameToSet
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

    /** Send password reset email */
    async sendPasswordReset(email: string): Promise<void> {
        await sendPasswordResetEmail(this.auth, email);
    }

    async logout() {
        await this.resetRevenueCatIdentity();
        await signOut(this.auth);
        this.user$.next(null);
        this.isAdmin$.next(false);
        this.isMember$.next(false);
    }

    /**
     * Re-fetches RevenueCat customer info for the current user and refreshes `isMember$`.
     * Call after a successful purchase or from UI that needs to re-verify entitlements.
     */
    async refreshMembership(): Promise<boolean> {
        const uid = this.currentUserId;
        if (!uid) return false;
        const info = await this.syncRevenueCatIdentity(uid);
        const currentUser = this.user$.value;
        const isMember = (currentUser?.isAdmin ?? false) || this.hasFiftyPlusEntitlement(info);
        this.isMember$.next(isMember);
        if (currentUser) this.user$.next({ ...currentUser, isMember });
        return isMember;
    }

    get currentUserId(): string | null {
        return this.auth.currentUser?.uid ?? null;
    }

    // get isAnonymous(): boolean {
    //   return this.auth.currentUser?.isAnonymous ?? true;
    // }

    /**
     * Ensures the Firestore user document exists and returns AppUser.
     * Also syncs RevenueCat identity and derives `isMember` from the Fifty+ entitlement.
     */
    private async ensureUserDocument(user: FirebaseUser, isAnon = false): Promise<AppUser> {
        const userRef = doc(this.firestore, 'users', user.uid);
        const snapshot = await getDoc(userRef);

        // Check admins collection if email exists
        let isAdmin = false;
        if (user.email) {
            const q = query(collection(this.firestore, 'admins'), where('emailAddress', '==', user.email));
            const adminSnap = await getDocs(q);
            isAdmin = !adminSnap.empty;
        }

        const now = new Date();
        const loginCount = snapshot.exists() ? (snapshot.data()?.['loginCount'] ?? 0) : 0;

        const rcInfo = await this.syncRevenueCatIdentity(user.uid);
        const isMember = isAdmin || this.hasFiftyPlusEntitlement(rcInfo);

        const appUser: AppUser = {
            uid: user.uid,
            email: user.email ?? '',
            displayName: user.displayName ?? '',
            photoUrl: user.photoURL ?? '',
            createdAt: snapshot.exists() ? snapshot.data()?.['createdAt'].toDate() : now,
            isAdmin,
            isMember,
            isAnon,
            followers: snapshot.exists() ? (snapshot.data()?.['followers'] ?? []) : [],
            following: snapshot.exists() ? (snapshot.data()?.['following'] ?? []) : [],
            loginCount: loginCount + 1
        };

        await setDoc(
            userRef,
            {
                ...appUser,
                lastLoginAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            },
            { merge: true }
        );

        this.isAdmin$.next(isAdmin);
        this.isMember$.next(appUser.isMember);

        return appUser;
    }
}
