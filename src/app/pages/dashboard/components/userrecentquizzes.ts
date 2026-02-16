import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { firstValueFrom } from 'rxjs';
import { QuizResultsService } from '@/shared/services/quiz-result.service';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { AuthService } from '@/shared/services/auth.service';
import { QuizResult } from '@/shared/models/quizResult.model';
import { Quiz } from '@/shared/models/quiz.model';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

interface RecentQuiz {
  quizId: string;
  quizTitle: string;
  typeName: string;
  totalQuestions: number;
  score: number;
  completionPercentage: number;
}

@Component({
  standalone: true,
  selector: 'app-recent-quizzes-widget',
  imports: [CommonModule, ButtonModule, MenuModule, ProgressSpinnerModule],
  template: `
    <ng-container *ngIf="loading || recentQuizzes.length > 0">
    <div class="flex items-center mb-6">
      <div class="font-semibold text-md">Recent Quizzes</div>
    </div>

    <!-- Loading Spinner -->
    <div *ngIf="loading" class="flex justify-center items-center h-32">
      <p-progressSpinner styleClass="w-12 h-12" strokeWidth="2"></p-progressSpinner>
    </div>

    <!-- Recent Quizzes List -->
    <ul *ngIf="!loading" class="list-none p-0 m-0">
      <li
        *ngFor="let quiz of recentQuizzes"
        class="flex flex-row items-center justify-between mb-6"
      >
        <div class="text-surface-900 dark:text-surface-0 font-medium mr-2 mb-1 md:mb-0">
          {{ quiz.quizTitle }}
          <div class="mt-1 text-muted-color">{{ quiz.typeName }}</div>
        </div>
        <div class="mt-2 md:mt-0 ml-0 md:ml-20 flex items-center">
          <span class="text-primary ml-4 font-medium">{{ quiz.score }} / {{ quiz.totalQuestions }}</span>
        </div>
      </li>
    </ul>
    </ng-container>
  `
})
export class RecentQuizzesWidget implements OnInit {

  recentQuizzes: RecentQuiz[] = [];
  loading = true;

  constructor(
    private quizResultService: QuizResultsService,
    private quizzesService: QuizzesService,
    private auth: AuthService
  ) {}

  async ngOnInit() {
    await this.loadRecentQuizzes();
  }

  private async loadRecentQuizzes() {
    this.loading = true;

    this.auth.user$.subscribe(async user => {
      if (!user?.uid) {
        this.loading = false;
        return;
      }

      // Get all user quiz results
      const results: QuizResult[] = await firstValueFrom(
        this.quizResultService.getUserResults(user.uid)
      );
      if (!results.length) {
        this.loading = false;
        return;
      }

      // Filter completed and sort by completion date descending
      const sortedResults = results
        .filter(r => r.status === 'completed')
        .sort((a, b) => {
          const getTime = (d: any) => {
            if (!d) return 0;
            if ('toMillis' in d) return d.toMillis(); // Firestore Timestamp
            if (d instanceof Date) return d.getTime(); // JS Date
            return 0;
          };
          return getTime(b.completedAt) - getTime(a.completedAt);
        })
        .slice(0, 5);

      const recentQuizzes: RecentQuiz[] = [];

      // Loop through results and fetch each quiz individually
      for (const r of sortedResults) {
        const quiz: Quiz | undefined = await firstValueFrom(
          this.quizzesService.getQuizByQuizId(r.quizId.toString())
        );

        const totalQuestions = r.totalQuestions || 1;
        const score = r.score ?? 0;
        const completionPercentage = Math.min(100, Math.round((score / totalQuestions) * 100));

        recentQuizzes.push({
          quizId: String(r.quizId),
          quizTitle: quiz?.quizTitle ?? 'Untitled Quiz',
          typeName: this.getTypeName(quiz?.quizType),
          totalQuestions,
          score,
          completionPercentage
        });
      }

      this.recentQuizzes = recentQuizzes;
      this.loading = false;
    });
  }

  private getTypeName(type?: number): string {
    switch (type) {
      case 1: return 'Weekly';
      case 2: return 'Fifty+';
      case 3: return 'Collaboration';
      case 4: return 'Question Type';
      default: return 'Unknown';
    }
  }
}

