export interface Admin {
  id?: string;        // Firestore doc ID (could be sanitized email or random ID)
  emailAddress: string;
  addedAt: Date;
}
