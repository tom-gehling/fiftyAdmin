import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Firestore, collection, collectionData, doc, updateDoc } from '@angular/fire/firestore';
import { Observable, firstValueFrom } from 'rxjs';

export interface ContactFormData {
    name: string;
    email: string;
    mobile: string;
    message: string;
}

export interface ContactFormSubmission extends ContactFormData {
    id: string;
    submittedAt: any;
    ip: string;
    read: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContactFormService {
    // Dev: Functions emulator (writes to production Firestore via admin SDK, bypasses rules)
    // Prod: deployed function via Firebase Hosting rewrite
    private readonly apiUrl = isDevMode()
        ? 'http://127.0.0.1:5001/weeklyfifty-7617b/us-central1/api/submitContactForm'
        : 'https://weeklyfifty-7617b.web.app/api/submitContactForm';

    private readonly collectionName = 'contactFormSubmissions';

    constructor(private http: HttpClient, private firestore: Firestore) {}

    async submit(data: ContactFormData): Promise<void> {
        await firstValueFrom(this.http.post(this.apiUrl, data));
    }

    getAll(): Observable<ContactFormSubmission[]> {
        return collectionData(collection(this.firestore, this.collectionName), { idField: 'id' }) as Observable<ContactFormSubmission[]>;
    }

    async markRead(id: string, read: boolean): Promise<void> {
        await updateDoc(doc(this.firestore, this.collectionName, id), { read });
    }
}
