export interface TaggedUser {
  uid: string;
  displayName: string;
  photoUrl?: string;
}

export interface QuizSubmission {
  id?: string;
  quizId: number;
  quizDocId: string;
  formId: string;

  submitterId: string;
  submitterName: string;

  teamName: string;
  location: string;
  score: number;
  pictureUrl?: string;

  taggedUsers: TaggedUser[];
  customFields: { [fieldId: string]: any };

  submittedAt: Date;
}

export interface UserSubmissionStats {
  uid: string;
  totalSubmissions: number;
  totalTagged: number;
  totalScore: number;
  averageScore: number;
  quizCount: number;
  lastSubmissionAt: Date;
}

export interface QuizSubmissionSummary {
  quizId: number;
  score: number;
  wasTagged: boolean;
  submittedAt: Date;
}
