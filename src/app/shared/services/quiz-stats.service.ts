import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface QuizStatsResponse {
  quizId: string;
  attempts: number;
  averageScore: number;
  averageTime: number;
  hardestQuestions: { questionId: number; correctRate: number }[];
  easiestQuestions: { questionId: number; correctRate: number }[];
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
