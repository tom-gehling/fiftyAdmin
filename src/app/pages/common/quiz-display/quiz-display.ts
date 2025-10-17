import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { Quiz } from '@/shared/models/quiz.model';
import { QuizAnswer } from '@/shared/models/quizResult.model';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { AuthService } from '@/shared/services/auth.service';
import { QuizResultsService } from '@/shared/services/quiz-result.service';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';

@Component({
  selector: 'app-quiz-display',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule],
  template: `
    <!-- Loading Spinner -->
    <div *ngIf="loading" class="flex items-center justify-center h-96">
      <p-progressSpinner styleClass="w-16 h-16" strokeWidth="1" animationDuration=".5s"></p-progressSpinner>
    </div>

    <!-- Quiz Container -->
    <div *ngIf="!loading && quiz" class="quizContainer">
      <div class="quizTitle">{{ quiz.quizTitle || 'Quiz ' + quiz.quizId }}</div>

      <ng-container *ngIf="locked">
        <p class="text-center text-gray-300 mb-4">
          Upgrade to access the full quiz!
        </p>
      </ng-container>

      <ng-container *ngFor="let question of quiz.questions; let i = index">
  <div class="question" *ngIf="!locked || i < 3">
    <!-- Question button -->
    <button class="accordionButton" (click)="toggleQuestion(i)">
      <span class="dot" [ngClass]="{'removed': answers[i]?.correct !== null}"></span>
      <span><b>Q{{ i + 1 }}.</b> <span [innerHTML]="question.question"></span></span>
    </button>

    <!-- Click for answer button -->
    <div *ngIf="questionClicked[i]" class="flex justify-center my-2">
      <button class="genericButton reveal" (click)="toggleAnswer(i)">Click for answer</button>
    </div>

    <!-- Answer panel -->
    <div *ngIf="answerRevealed[i]" class="panel answer">
      <p [innerHTML]="question.answer"></p>
      <div class="flex gap-2 w-full justify-center" *ngIf="!locked">
        <button class="genericButton" [ngClass]="{'correct': answers[i]?.correct === true}" (click)="markAnswer(i, true)">Correct</button>
        <button class="genericButton" [ngClass]="{'incorrect': answers[i]?.correct === false}" (click)="markAnswer(i, false)">Incorrect</button>
      </div>
    </div>
  </div>
</ng-container>


      <!-- Score -->
      <div *ngIf="!locked" class="score">Score: {{ score }} / {{ totalQuestions }}</div>

      <!-- Reset -->
      <button *ngIf="!locked && isQuizCompleted" class="genericButton" (click)="resetQuiz()">Reset Quiz</button>
    </div>
  `,
  styles: `
    :host {
      --tertiary: #4cfbab;
      --secondary: #677c73;
      --primary: #fbe2df;
      --font: Helvetica, Arial, sans-serif;
      --header: 25px;
      --normal: 22px;
      --smaller: 18px;
      --transition: 0.3s;
      background-color: var(--secondary);
      color: var(--primary);
    }

    .quizContainer {
      width: 100%;
      font-family: var(--font);
      padding: 20px;
      border-radius: 15px;
      background-color: var(--secondary);
      color: var(--primary);
    }

    .quizTitle {
      font-size: 30px;
      font-weight: 600;
      color: var(--primary);
      text-align: center;
      padding: 10px;
    }

    .accordionButton {
      color: var(--primary);
      background-color: var(--secondary);
      border: none;
      width: 100%;
      font-size: var(--header);
      font-weight: 400;
      padding: 25px;
      margin-bottom: 20px;
      line-height: 130%;
      text-align: center;
      transition: var(--transition);
    }

    .accordionButton.active {
      color: var(--secondary);
      background-color: var(--primary);
    }

    .genericButton {
      font-family: var(--font);
      font-weight: 600;
      color: var(--secondary);
      background-color: var(--primary);
      border: 3px solid var(--primary);
      border-radius: 15px;
      font-size: var(--normal);
      padding: 15px;
      margin: 5px;
      transition: var(--transition);
    }

    .genericButton.correct {
      color: var(--primary);
      background-color: var(--secondary);
    }

    .genericButton.incorrect {
      color: var(--primary);
      background-color: var(--secondary);
    }

    .dot {
      height: 10px;
      width: 10px;
      background-color: var(--tertiary);
      border-radius: 50%;
      display: inline-block;
      margin-right: 10px;
    }

    .panel {
      display: block;
      font-size: var(--normal);
      padding: 15px 0;
      width: auto;
      text-align: center;
    }

    .panel.answer {
      font-size: var(--header);
      font-weight: 800;
    }

    .score {
      color: var(--primary);
      text-align: center;
      font-size: var(--header);
      font-weight: 800;
      margin-top: 20px;
    }
  `
})
export class QuizDisplayComponent implements OnInit, OnChanges {
  @Input() quizId?: string;
  @Input() locked: boolean = false; // NEW INPUT
  quiz?: Quiz;

  // UI state
  score = 0;
  totalQuestions = 0;
  answers: { correct: boolean | null }[] = [];
  questionClicked: boolean[] = [];
  answerRevealed: boolean[] = [];

  // Firestore tracking
  resultId?: string;
  userId?: string;
  loading = true;

  constructor(
    private quizService: QuizzesService,
    private quizResultsService: QuizResultsService,
    private authService: AuthService,
    private elRef: ElementRef 
  ) {}

  async ngOnInit() {
    await this.loadQuiz();
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['quizId'] && !changes['quizId'].firstChange) {
      await this.loadQuiz();
    }
  }

  private async loadQuiz() {
    this.loading = true;
    this.quiz = undefined;

    try {
      await firstValueFrom(this.authService.initialized$);
      this.userId = this.authService.currentUserId ?? undefined;

      if (!this.quizId) {
        this.loading = false;
        return;
      }

      const quizToLoad = await firstValueFrom(this.quizService.getQuizByQuizId(this.quizId));
      if (quizToLoad) {
        await this.initializeOrResumeQuiz(quizToLoad);
      }
    } catch (err) {
      console.error('Error during load', err);
    } finally {
      this.loading = false;
    }
    this.applyThemeColors();
  }

  private applyThemeColors() {
  if (!this.quiz) return;
  // [ ]: sort out applying themeing to container based on incoming quiz style

  const root = this.elRef?.nativeElement as HTMLElement;
    console.log(this.quiz.theme)
  if (this.quiz.theme) {
    root.style.setProperty('--secondary', this.quiz.theme.backgroundColor || '#677c73');
    root.style.setProperty('--primary', this.quiz.theme.fontColor || '#fbe2df');
    root.style.setProperty('--tertiary', this.quiz.theme.tertiaryColor || '#4cfbab');
  } else if (this.quiz.quizType == QuizTypeEnum.Weekly) {
    root.style.setProperty('--secondary', '#677c73'); // main background
    root.style.setProperty('--primary', '#fbe2df');   // text
    root.style.setProperty('--tertiary', '#4cfbab');   // accents
  } else {
    // fallback defaults
    root.style.setProperty('--secondary', '#677c73');
    root.style.setProperty('--primary', '#fbe2df');
    root.style.setProperty('--tertiary', '#4cfbab');
  }
}

  private async initializeOrResumeQuiz(quiz: Quiz) {
    this.quiz = quiz;

    // Only first 3 questions if locked
    const questionsToUse = this.locked ? quiz.questions.slice(0, 3) : quiz.questions;
    this.totalQuestions = questionsToUse.length;

    // Reset local state
    this.answers = Array.from({ length: this.totalQuestions }, () => ({ correct: null }));
    this.questionClicked = Array.from({ length: this.totalQuestions }, () => false);
    this.answerRevealed = Array.from({ length: this.totalQuestions }, () => false);
    this.score = 0;

    if (this.locked || !this.userId) return; // Do NOT create result session if locked

    const results = await firstValueFrom(this.quizResultsService.getUserResults(this.userId));
    const quizResults = results.filter(r => r.quizId === quiz.quizId.toString());

    const inProgress = quizResults.find(r => r.status === 'in_progress');
    if (inProgress) {
      this.resultId = inProgress.resultId;
      inProgress.answers.forEach(a => {
        const idx = questionsToUse.findIndex(q => q.questionId === a.questionId);
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
        const idx = questionsToUse.findIndex(q => q.questionId === a.questionId);
        if (idx > -1) this.answers[idx] = { correct: a.correct ?? null };
      });
      this.score = this.answers.filter(a => a.correct === true).length;
      return;
    }

    // Only create a new result if not locked
    this.resultId = await this.quizResultsService.createResult(
      quiz.quizId.toString(),
      this.userId!,
      this.totalQuestions
    );
  }

  toggleQuestion(index: number) { this.questionClicked[index] = !this.questionClicked[index]; }
  toggleAnswer(index: number) { this.answerRevealed[index] = !this.answerRevealed[index]; }
  get isQuizCompleted(): boolean { return this.answers.length > 0 && this.answers.every(a => a.correct !== null); }

  async resetQuiz() {
    if (!this.quiz || !this.userId || this.locked) return;
    try {
      this.resultId = await this.quizResultsService.createResult(
        this.quiz.quizId.toString(),
        this.userId,
        this.totalQuestions
      );
      this.score = 0;
      this.answers = Array.from({ length: this.totalQuestions }, () => ({ correct: null }));
      this.questionClicked = Array.from({ length: this.totalQuestions }, () => false);
      this.answerRevealed = Array.from({ length: this.totalQuestions }, () => false);
    } catch (err) {
      console.error('Failed to reset quiz', err);
    }
  }

  async markAnswer(index: number, correct: boolean) {
    if (!this.quiz || this.locked) return;

    const previous = this.answers[index]?.correct ?? null;

    if (previous === true && correct === false) {
      this.score = Math.max(0, this.score - 1);
    } else if ((previous === null || previous === false) && correct === true) {
      this.score++;
    }

    this.answers[index] = { correct };

    if (this.resultId && this.userId) {
      const answer = {
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
