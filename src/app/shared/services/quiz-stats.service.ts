import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class QuizStatsService {
  private baseUrl = 'https://weeklyfifty-7617b.web.app/api';

  constructor(private http: HttpClient) {}

  async getQuizStats(quizId: string): Promise<QuizStatsResponse> {
    const url = `${this.baseUrl}/quizStats/${quizId}`;
    return await firstValueFrom(this.http.get<QuizStatsResponse>(url));
  }
}
