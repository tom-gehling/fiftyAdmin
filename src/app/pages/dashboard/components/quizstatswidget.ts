import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { firstValueFrom } from 'rxjs';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { QuizStatsService, QuizStatsResponse } from '@/shared/services/quiz-stats.service';
import { Quiz } from '@/shared/models/quiz.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-quiz-stats-widget',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    ButtonModule,
    MenuModule
  ],
  template: `
    <div class="card p-5">
      <!-- Header -->
      <div class="flex justify-between items-center mb-4">
        <div class="font-semibold text-xl">Quiz Statistics</div>
        <!-- Quiz Selector -->
        <div class="mb-5">
          <p-select
            [options]="allQuizzes"
            [(ngModel)]="selectedQuizId"
            optionLabel="quizId"
            optionValue="quizId"
            placeholder="Select Quiz"
            (onChange)="loadQuizStats(selectedQuizId?.toString())">
          </p-select>
        </div>
      </div>

      

      <!-- Loading Spinner -->
      <div *ngIf="loading" class="flex justify-center items-center h-32">
        <p-progressSpinner styleClass="w-12 h-12" strokeWidth="2"></p-progressSpinner>
      </div>

      <!-- Stats Summary -->
      <div *ngIf="!loading && stats" class="mb-6">
        <!-- [ ]: should not load any stats unless there are completeds -->
        <div class="text-lg mb-1"><strong>{{ quiz?.quizTitle || 'Quiz ' + selectedQuizId }}</strong></div>
        <div class="text-muted-color text-sm">
          {{ stats.attempts }} attempts •
          Avg Score: <strong>{{ stats.averageScore | number:'1.1-2' }}</strong> •
          Avg Time: <strong>{{ stats.averageTime | number:'1.0-0' }}s</strong>
        </div>
      

      <!-- Easiest Questions -->
      <div *ngIf="easiestQuestions.length" class="mb-6">
        <!-- [ ]: make this in the same way as the best selling widget -> add start of question? -->
        <div class="font-semibold text-green-500 mb-3">Easiest Questions</div>
        <ul class="list-none p-0 m-0">
          <li *ngFor="let q of easiestQuestions" class="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <div class="text-sm md:w-1/2">
              <span class="font-medium text-surface-900 dark:text-surface-0">
                {{ q.question }}
              </span>
            </div>
            <div class="mt-2 md:mt-0 flex items-center md:w-1/2">
              <p-progressBar [value]="q.correctRate * 100" styleClass="flex-1" [showValue]="false" [style]="{ height: '8px' }"></p-progressBar>
              <span class="text-green-400 ml-3 font-medium">{{ (q.correctRate * 100) | number:'1.0-0' }}%</span>
            </div>
          </li>
        </ul>
      </div>

      <!-- Hardest Questions -->
      <div *ngIf="hardestQuestions.length">
        <div class="font-semibold text-red-400 mb-3">Hardest Questions</div>
        <ul class="list-none p-0 m-0">
          <li *ngFor="let q of hardestQuestions" class="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <div class="text-sm md:w-1/2">
              <span class="font-medium text-surface-900 dark:text-surface-0">
                {{ q.question }}
              </span>
            </div>
            <div class="mt-2 md:mt-0 flex items-center md:w-1/2">
              <p-progressBar [value]="q.correctRate * 100" styleClass="flex-1 p-progressbar-danger" [showValue]="false" [style]="{ height: '8px' }"></p-progressBar>
              <span class="text-red-400 ml-3 font-medium">{{ (q.correctRate * 100) | number:'1.0-0' }}%</span>
            </div>
          </li>
        </ul>
      </div>
      </div>

      <div *ngIf="!loading && !stats" class="text-center text-gray-500">No stats available.</div>
    </div>
  `
})
export class QuizStatsWidgetComponent implements OnInit {
  allQuizzes: Quiz[] = [];
  selectedQuizId?: string;
  quiz?: Quiz;
  stats?: QuizStatsResponse;
  hardestQuestions: { question: string; correctRate: number }[] = [];
  easiestQuestions: { question: string; correctRate: number }[] = [];
  loading = true;

  constructor(
    private quizzesService: QuizzesService,
    private quizStatsService: QuizStatsService
  ) {}

  async ngOnInit() {
    try {
      this.loading = true;
      this.allQuizzes = await firstValueFrom(this.quizzesService.getAllQuizzes());
      const activeQuiz = this.allQuizzes.find(q => q.isActive) || this.allQuizzes[0];
      this.selectedQuizId = activeQuiz?.quizId.toString();
      if (this.selectedQuizId) await this.loadQuizStats(this.selectedQuizId);
    } catch (err) {
      console.error('Error loading quizzes', err);
    } finally {
      this.loading = false;
    }
  }

  async loadQuizStats(quizId?: string) {
    if (!quizId) return;
    try {
      this.loading = true;
      this.quiz = await firstValueFrom(this.quizzesService.getQuizByQuizId(quizId));
      this.stats = await this.quizStatsService.getQuizStats(quizId);

      this.hardestQuestions = this.stats.hardestQuestions.map(h => ({
        question: this.quiz?.questions.find(q => q.questionId === h.questionId)?.question || `Q${h.questionId}`,
        correctRate: h.correctRate
      }));

      this.easiestQuestions = this.stats.easiestQuestions.map(e => ({
        question: this.quiz?.questions.find(q => q.questionId === e.questionId)?.question || `Q${e.questionId}`,
        correctRate: e.correctRate
      }));
    } catch (err) {
      console.error('Error loading quiz stats:', err);
      this.stats = undefined;
    } finally {
      this.loading = false;
    }
  }
}
