import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { QuizResultsService } from '@/shared/services/quiz-result.service';
import { Quiz } from '@/shared/models/quiz.model';
import { QuizResult } from '@/shared/models/quizResult.model';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-quiz-stats-widget',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule, FormsModule],
  template: `
    <div class="card mb-8 p-4 bg-gray-800 text-white rounded-lg shadow-md w-full">
      
      <!-- Quiz selector -->
      <div class="mb-4 flex justify-end">
        <select
          class="bg-gray-700 text-white rounded px-2 py-1"
          [(ngModel)]="selectedQuizId"
          (change)="selectedQuizId && loadQuiz(selectedQuizId)">
          <option *ngFor="let q of allQuizzes" [value]="q.quizId">{{ q.quizTitle || 'Quiz ' + q.quizId }}</option>
        </select>
      </div>

      <!-- Loading spinner -->
      <div *ngIf="loading" class="flex justify-center items-center h-32">
        <p-progressSpinner styleClass="w-12 h-12" strokeWidth="2" fill="#4cfbab"></p-progressSpinner>
      </div>

      <!-- Stats display -->
      <div *ngIf="!loading && quiz" class="space-y-4 w-full">
        <h3 class="text-xl font-bold text-center w-full">{{ quiz.quizTitle || 'Quiz ' + quiz.quizId }}</h3>

        <p class="text-center w-full">Average Score: <span class="font-bold">{{ averageScore | number:'1.0-2' }} / {{ quiz.questions.length }}</span></p>

        <div *ngIf="mostCorrectQuestion" class="w-full">
          <p>Most correctly answered question:</p>
          <p class="pl-4 font-semibold text-green-400" [innerHTML]="mostCorrectQuestion"></p>
          <p class="text-sm text-gray-400">{{ mostCorrectCount }} users answered correctly</p>
        </div>

        <div *ngIf="leastCorrectQuestion" class="w-full">
          <p>Least correctly answered question:</p>
          <p class="pl-4 font-semibold text-red-400" [innerHTML]="leastCorrectQuestion"></p>
          <p class="text-sm text-gray-400">{{ leastCorrectCount }} users answered correctly</p>
        </div>

        <p *ngIf="results.length === 0" class="text-center text-gray-400 w-full">No results yet.</p>
      </div>

      <div *ngIf="!loading && !quiz" class="p-4 text-center text-gray-400 w-full">
        Quiz not found.
      </div>
    </div>
  `
})
export class QuizStatsWidgetComponent implements OnInit {
  selectedQuizId?: string;
  allQuizzes: Quiz[] = [];
  quiz?: Quiz;
  results: QuizResult[] = [];
  loading = true;

  averageScore = 0;
  mostCorrectQuestion?: string;
  leastCorrectQuestion?: string;
  mostCorrectCount = 0;
  leastCorrectCount = 0;

  constructor(
    private quizzesService: QuizzesService,
    private quizResultsService: QuizResultsService
  ) {}

  async ngOnInit() {
    try {
      this.loading = true;

      // Fetch all quizzes to populate dropdown
      this.allQuizzes = await firstValueFrom(this.quizzesService.getAllQuizzes());

      // Default to current active quiz
      const activeQuiz = this.allQuizzes.find(q => q.isActive) || this.allQuizzes[0];
      this.selectedQuizId = activeQuiz?.quizId.toString();

      if (this.selectedQuizId) {
        await this.loadQuiz(this.selectedQuizId);
      }
    } catch (err) {
      console.error('Error loading quizzes', err);
    } finally {
      this.loading = false;
    }
  }

  async loadQuiz(quizId: string) {
    try {
      this.loading = true;
      this.quiz = await firstValueFrom(this.quizzesService.getQuizById(quizId));
      this.results = await firstValueFrom(this.quizResultsService.getQuizResults(quizId));

      console.log(this.quiz)
      this.computeStats();
    } catch (err) {
      console.error('Error loading quiz stats', err);
      this.quiz = undefined;
      this.results = [];
    } finally {
      this.loading = false;
    }
  }

  private computeStats() {
    if (!this.quiz) return;

    const questionCounts: Record<number, number> = {};
    this.quiz.questions.forEach(q => (questionCounts[q.questionId] = 0));

    let totalScore = 0;

    this.results.forEach(r => {
      const userScore = r.answers.filter(a => a.correct).length;
      totalScore += userScore;

      r.answers.forEach(a => {
        const qId = typeof a.questionId === 'string' ? parseInt(a.questionId, 10) : a.questionId;
        if (a.correct && questionCounts[qId] !== undefined) {
          questionCounts[qId]++;
        }
      });
    });

    this.averageScore = totalScore / (this.results.length || 1);

    const sorted = Object.entries(questionCounts)
      .map(([k,v]) => ({ questionId: Number(k), count: v }))
      .sort((a, b) => b.count - a.count);

    const most = sorted[0];
    const least = sorted[sorted.length - 1];

    this.mostCorrectCount = most ? most.count : 0;
    this.leastCorrectCount = least ? least.count : 0;

    this.mostCorrectQuestion = this.quiz.questions.find(q => q.questionId === most?.questionId)?.question;
    this.leastCorrectQuestion = this.quiz.questions.find(q => q.questionId === least?.questionId)?.question;
  }
}
