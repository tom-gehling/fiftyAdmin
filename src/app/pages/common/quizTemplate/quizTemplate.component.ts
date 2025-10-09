import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { Quiz } from '@/shared/models/quiz.model';
import { QuizAnswer } from '@/shared/models/quizResult.model';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { AuthService } from '@/shared/services/auth.service';
import { QuizResultsService } from '@/shared/services/quiz-result.service';

@Component({
  selector: 'app-quiz-template',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule],
  template: `
    <!-- Loading Spinner -->
    <div *ngIf="loading" class="flex items-center justify-center h-96">
      <p-progressSpinner
        styleClass="w-16 h-16 "
        strokeWidth="1"
        animationDuration=".5s"
        fill="#4cfbab">
      </p-progressSpinner>
    </div>

    <!-- Quiz Content -->
    <div *ngIf="!loading && quiz" class="w-full max-w-3xl mx-auto p-4">
      <!-- Quiz Title -->
      <h2 class="text-3xl font-bold text-center text-pink-200 mb-4">
        {{ quiz.quizTitle || 'Quiz ' + quiz.quizId }}
      </h2>

      <!-- Questions -->
      <div *ngFor="let question of quiz.questions; let i = index"
           [ngClass]="{
             'mb-4 rounded-lg shadow-md overflow-hidden': true,
             'border-2': true,
             'border-green-400': answers[i]?.correct === true,
             'border-red-400': answers[i]?.correct === false,
             'border-gray-300': answers[i]?.correct === null
           }">
        <!-- Question Button -->
       <button
  class="w-full flex items-center justify-center px-4 py-3 bg-gray-100 hover:bg-gray-200 font-semibold text-center"
  (click)="toggleReveal(i)">
  
  <!-- Fixed-width container for the dot -->
  <span class="w-4 flex justify-center">
    <span 
      *ngIf="answers[i]?.correct === null"
      class="inline-block w-2 h-2 rounded-full bg-teal-300">
    </span>
  </span>

  <!-- Question text -->
  <span class="prose flex-1 text-center ml-2">
    <strong>Q{{ i + 1 }}.</strong>
    <span [innerHTML]="question.question"></span>
  </span>

  <!-- Answer mark (✔ / ✖) -->
  <div class="text-lg ml-2">
    <span *ngIf="answers[i]?.correct === true" class="text-green-600 font-bold">✔</span>
    <span *ngIf="answers[i]?.correct === false" class="text-red-600 font-bold">✖</span>
  </div>
</button>


        <!-- Answer Section -->
        <div *ngIf="revealed[i]" 
          class="flex flex-col justify-center items-center p-4 bg-gray-100 space-y-4 rounded-b-lg">
        <!-- Answer text centered -->
        <p class="font-bold text-center" [innerHTML]="question.answer"></p>

        <!-- Correct / Incorrect buttons -->
        <div class="flex gap-2 w-full">
          <button
            class="flex-1 py-2 rounded font-semibold text-white"
            [ngClass]="{
              'bg-green-500 hover:bg-green-600': answers[i]?.correct !== true,
              'bg-green-700': answers[i]?.correct === true
            }"
            (click)="markAnswer(i, true)">
            Correct
          </button>

          <button
            class="flex-1 py-2 rounded font-semibold text-white"
            [ngClass]="{
              'bg-red-500 hover:bg-red-600': answers[i]?.correct !== false,
              'bg-red-700': answers[i]?.correct === false
            }"
            (click)="markAnswer(i, false)">
            Incorrect
          </button>
        </div>
      </div>

      </div>
      <!-- Score -->
      <p class="text-2xl font-extrabold text-center text-green-400 mb-6">
        Score: {{ score }} / {{ totalQuestions }}
      </p>

      <button
        *ngIf="isQuizCompleted"
        class="px-4 py-2 rounded bg-green-500 hover:bg-yellow-600 text-white font-semibold"
        (click)="resetQuiz()">
        Reset Quiz
      </button>
    </div>
    

    <!-- If no quiz found -->
    <div *ngIf="!loading && !quiz" class="p-6 text-center text-gray-400">
      No quiz to display.
    </div>
  `
})
export class QuizTemplateComponent implements OnInit {
  @Input() quiz?: Quiz;

  // UI state
  score = 0;
  totalQuestions = 0;
  revealed: boolean[] = [];
  answers: { correct: boolean | null }[] = [];

  // Firestore tracking
  resultId?: string;
  userId?: string;
  loading = true;

  constructor(
    private quizService: QuizzesService,
    private quizResultsService: QuizResultsService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    try {
      await firstValueFrom(this.authService.initialized$);
      this.userId = this.authService.currentUserId ?? undefined;

      if (this.quiz) {
        await this.initializeOrResumeQuiz(this.quiz);
      } else {
        const activeQuiz = await firstValueFrom(this.quizService.getActiveQuiz());
        if (activeQuiz) {
          await this.initializeOrResumeQuiz(activeQuiz);
        }
      }
    } catch (err) {
      console.error('Error during init', err);
    } finally {
      this.loading = false; // ✅ hide spinner once fully initialized
    }
  }

  private async initializeOrResumeQuiz(quiz: Quiz) {
    this.quiz = quiz;
    this.totalQuestions = quiz.questions.length;

    // Reset local state
    this.revealed = Array.from({ length: this.totalQuestions }, () => false);
    this.answers = Array.from({ length: this.totalQuestions }, () => ({ correct: null }));
    this.score = 0;

    if (!this.userId) return;

    const results = await firstValueFrom(this.quizResultsService.getUserResults(this.userId));
    const quizResults = results.filter(r => r.quizId === quiz.quizId.toString());

    const inProgress = quizResults.find(r => r.status === 'in_progress');
    if (inProgress) {
      this.resultId = inProgress.resultId;
      inProgress.answers.forEach(a => {
        const idx = quiz.questions.findIndex(q => q.questionId === a.questionId);
        if (idx > -1) this.answers[idx] = { correct: a.correct ?? null };
      });
      this.score = this.answers.filter(a => a.correct === true).length;
      return;
    }

    const completed = quizResults
      .filter(r => r.status === 'completed')
      .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))[0];

    if (completed) {
      this.resultId = completed.resultId;
      completed.answers.forEach(a => {
        const idx = quiz.questions.findIndex(q => q.questionId === a.questionId);
        if (idx > -1) this.answers[idx] = { correct: a.correct ?? null };
      });
      this.score = this.answers.filter(a => a.correct === true).length;
      return;
    }

    this.resultId = await this.quizResultsService.createResult(
      quiz.quizId.toString(),
      this.userId!,
      this.totalQuestions
    );
  }

  toggleReveal(index: number) {
    this.revealed[index] = !this.revealed[index];
  }

  get isQuizCompleted(): boolean {
    return this.answers.length > 0 && this.answers.every(a => a.correct !== null);
  }

  async resetQuiz() {
    if (!this.quiz || !this.userId) return;
    try {
      this.resultId = await this.quizResultsService.createResult(
        this.quiz.quizId.toString(),
        this.userId,
        this.totalQuestions
      );
      this.score = 0;
      this.revealed = Array.from({ length: this.totalQuestions }, () => false);
      this.answers = Array.from({ length: this.totalQuestions }, () => ({ correct: null }));
    } catch (err) {
      console.error('Failed to reset quiz', err);
    }
  }

  async markAnswer(index: number, correct: boolean) {
    if (!this.quiz) return;

    const previous = this.answers[index]?.correct ?? null;

    if (previous === true && correct === false) {
      this.score = Math.max(0, this.score - 1);
    } else if ((previous === null || previous === false) && correct === true) {
      this.score++;
    }

    this.answers[index] = { correct };

    if (this.resultId && this.userId) {
      const answer: QuizAnswer = {
        questionId: this.quiz.questions[index].questionId,
        correct,
        clickedAt: new Date()
      };
      try {
        await this.quizResultsService.addAnswer(this.resultId, answer);
      } catch (err) {
        console.error('Failed to persist answer', err);
      }
    }

    if (this.answers.every(a => a.correct !== null) && this.resultId) {
      try {
        await this.quizResultsService.completeResult(this.resultId);
      } catch (err) {
        console.error('Failed to complete result', err);
      }
    }
  }
}
