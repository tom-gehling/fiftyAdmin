export interface Submission {
  id?: string;
  userId: string;

  teamName: string;
  location: string;
  score: number;

  pictureUrl?: string;
  submittedAt: Date;
}
