import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

export interface QuestionAccuracy {
  questionId: string;
  correctCount: number;
  totalAttempts: number;
  correctRate: number;
}

export interface QuizStatsResponse {
  quizId: string;
  attempts: number;
  completedCount: number;
  averageScore: number;
  averageTime: number;
  questionAccuracy: QuestionAccuracy[];
  hardestQuestions: QuestionAccuracy[];
  easiestQuestions: QuestionAccuracy[];
}

export interface QuizTotalStats {
  averageScore: number;
  totalSessions: number;
}

@Injectable({ providedIn: 'root' })
export class QuizStatsService {
  private baseUrl = 'https://weeklyfifty-7617b.web.app/api';
  private firestore: Firestore = inject(Firestore);

  constructor(private http: HttpClient) {}

  /** Fetch from API */
  async getQuizStats(quizId: string): Promise<QuizStatsResponse> {
    const url = `${this.baseUrl}/quizStats/${quizId}`;
    return await firstValueFrom(this.http.get<QuizStatsResponse>(url));
  }

  /** Fetch from Firestore quizTotalStats collection */
  async getQuizTotalStats(quizId: string): Promise<QuizTotalStats> {
    try {
      const docRef = doc(this.firestore, 'quizTotalStats', quizId);
      
      const docSnap = await getDoc(docRef);
      console.log(docSnap)

      if (!docSnap.exists()) {
        return { averageScore: 0, totalSessions: 0 };
      }

      const data = docSnap.data() as { averageScore?: number; totalSessions?: number };
      return {
        averageScore: data.averageScore ?? 0,
        totalSessions: data.totalSessions ?? 0,
      };

    } catch (error) {
      console.error('Error fetching quizTotalStats from Firestore:', error);
      return { averageScore: 0, totalSessions: 0 };
    }
  }

   /** Fetch aggregated stats (from your new Express route) */
  async getQuizAggregates(quizId: string): Promise<any> {
    const url = `${this.baseUrl}/quizAggregates/${quizId}`;
    return await firstValueFrom(this.http.get<any>(url));
  }

  /** Fetch a quizAggregates document from Firestore by quizId */
async getQuizAggregatesFirestore(quizId: string): Promise<any> {
  try {
    const docRef = doc(this.firestore, 'quizAggregates', quizId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.warn(`No quizAggregates found for quizId: ${quizId}`);
      return null;
    }

    return docSnap.data();
  } catch (error) {
    console.error('Error fetching quizAggregates from Firestore:', error);
    return null;
  }
}

}


