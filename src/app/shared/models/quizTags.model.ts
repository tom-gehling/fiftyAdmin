export interface QuizTag {
  id?: string;             // Firestore document ID
  name: string;            // Tag name
  creationUser: string;    // UID or username of creator
  creationTime?: Date;     // Timestamp when created
  deletionUser?: string;   // UID or username of who deleted it
  deletionTime?: Date;     // Timestamp when deleted
  isActive?: boolean; 
}