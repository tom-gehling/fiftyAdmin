import { Component, ElementRef, Input, OnChanges, OnInit, Optional, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';

import { Quiz } from '@/shared/models/quiz.model';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { QuizResultsService } from '@/shared/services/quiz-result.service';
import { AuthService } from '@/shared/services/auth.service';
import { QuizPdfService } from '@/shared/services/quiz-pdf.service';
import { ActivatedRoute } from '@angular/router';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-quiz-display',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule, ButtonModule],
  template: `
    <!-- Loading Spinner -->
    <div *ngIf="loading" class="flex items-center justify-center h-96">
      <p-progressSpinner class="w-16 h-16" strokeWidth="1" animationDuration=".5s"></p-progressSpinner>
    </div>

    <!-- Quiz Container -->
    <div *ngIf="!loading && quiz" class="quizContainer">

      <!-- Locked message -->
      <ng-container *ngIf="locked">
        <p class="text-center text-gray-300 text-lg font-bold mb-4">
          Upgrade to Fifty+ and access the full quiz!
        </p>
      </ng-container>

      <!-- Title and Download -->
      <div class="quizHeader">
        <div class="quizTitle">{{ quiz.quizTitle || 'Quiz ' + quiz.quizId }}</div>
        <p-button
          *ngIf="!locked"
          icon="pi pi-download"
          label="Download"
          [outlined]="true"
          severity="secondary"
          (onClick)="downloadPdf()"
          class="downloadButton">
        </p-button>
      </div>

      <!-- Questions -->
      <ng-container *ngFor="let q of quiz.questions; let i = index">
        <div class="question" *ngIf="!locked || i < 3">

          <!-- Question button -->
          <button
            class="accordionButton"
            [class.active]="questionClicked[i]"
            (click)="toggleQuestion(i)"
          >
            <span class="dot" [ngClass]="{ removed: answers[i]?.correct !== null }"></span>
            <span class="questionText"><b>Q{{ i + 1 }}. </b> <span [innerHTML]="q.question"></span></span>
          </button>

          <!-- "Click for answer" -->
          <div *ngIf="questionClicked[i]" class="flex justify-center my-2">
            <button class="genericButton reveal" (click)="toggleAnswer(i)">
              Click for answer
            </button>
          </div>

          <!-- Answer & buttons -->
          <div *ngIf="answerRevealed[i]" class="panel answer">
            <p [innerHTML]="q.answer"></p>

            <ng-container *ngIf="!locked">
              <div class="flex gap-2 w-full justify-center">
                <button
                  class="genericButton"
                  [ngClass]="{ correct: answers[i]?.correct === true }"
                  (click)="markAnswer(i, true)"
                >
                  Correct
                </button>
                <button
                  class="genericButton"
                  [ngClass]="{ incorrect: answers[i]?.correct === false }"
                  (click)="markAnswer(i, false)"
                >
                  Incorrect
                </button>
              </div>
            </ng-container>
          </div>

        </div>
      </ng-container>

      <!-- Score & Reset -->
      <ng-container *ngIf="!locked && !previewMode">
        <div class="score">
          Score: {{ score }} / {{ answeredQuestions }}
        </div>

        <button
          *ngIf="isQuizCompleted"
          class="genericButton"
          (click)="resetQuiz()"
        >
          Reset Quiz
        </button>
      </ng-container>

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
      padding: 20px;
      border-radius: 15px;
      font-family: var(--font);
      background-color: var(--secondary);
      color: var(--primary);
    }

    .quizHeader {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }

    .quizTitle {
      text-align: center;
      padding: 10px;
      font-size: 30px;
      font-weight: 600;
      color: var(--primary);
    }

    .downloadButton {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
    }

    .accordionButton {
      width: 100%;
      border: none;
      padding: 25px;
      margin-bottom: 20px;
      font-size: var(--header);
      font-weight: 400;
      text-align: center;
      line-height: 130%;
      color: var(--primary);
      background-color: var(--secondary);
      transition: var(--transition);
    }

    .accordionButton.active {
      background-color: var(--primary);
      color: var(--secondary);
    }

    .genericButton {
      margin: 5px;
      padding: 15px;
      font-size: var(--normal);
      font-weight: 600;
      border-radius: 15px;
      border: 3px solid var(--primary);
      background-color: var(--primary);
      color: var(--secondary);
      transition: var(--transition);
      font-family: var(--font);
    }

    .genericButton.correct,
    .genericButton.incorrect {
      background-color: var(--secondary);
      color: var(--primary);
    }

    .dot {
      width: 10px;
      height: 10px;
      margin-right: 10px;
      display: inline-block;
      border-radius: 50%;
      background-color: var(--tertiary);
    }

    .panel {
      padding: 15px 0;
      width: auto;
      text-align: center;
      font-size: var(--normal);
    }

    .panel.answer {
      font-size: var(--header);
      font-weight: 800;
    }

    .score {
      margin-top: 20px;
      text-align: center;
      font-size: var(--header);
      font-weight: 800;
      color: var(--primary);
    }
  `
})
export class QuizDisplayComponent implements OnInit, OnChanges {

  @Input() quizId?: string;
  @Input() quiz?: Quiz;          // for preview mode
  @Input() locked = false;       // restricts to 3 questions
  @Input() previewMode = false;  // no Firestore, no results

  loading = true;

  // Quiz state
  score = 0;
  totalQuestions = 0;

  answers: { correct: boolean | null }[] = [];
  questionClicked: boolean[] = [];
  answerRevealed: boolean[] = [];

  userId?: string;
  resultId?: string;

  constructor(
    private quizService: QuizzesService,
    private quizResultsService: QuizResultsService,
    private authService: AuthService,
    private quizPdfService: QuizPdfService,
    private elRef: ElementRef,
    private route: ActivatedRoute,
    @Optional() public config: DynamicDialogConfig
  ) {}

  // ---------------------------------------------
  // CHANGES
  // ---------------------------------------------
  async ngOnChanges(changes: SimpleChanges) {
    // Reload quiz when quizId input changes (after initial load)
    if (changes['quizId'] && !changes['quizId'].firstChange) {
      const newId = changes['quizId'].currentValue;
      if (newId && newId !== changes['quizId'].previousValue) {
        this.quizId = newId;
        await this.loadQuiz();
      }
    }
  }

  // ---------------------------------------------
  // INIT
  // ---------------------------------------------
  async ngOnInit() {
  // 1️⃣ Use quiz passed via DynamicDialogConfig or Input
  if (this.config?.data?.quiz) {
    this.quiz = this.config.data.quiz;
  }

  this.previewMode = !!this.config?.data?.previewMode || this.previewMode;
  this.locked = !!this.config?.data?.locked || this.locked;

  // 2️⃣ If quiz already exists, initialize state immediately
  if (this.quiz) {
    this.initializeQuizState(this.quiz);
    this.applyThemeColors();
    this.loading = false;
    return;
  }

  // 3️⃣ Otherwise, try to load quiz by Input or route
  const routeId = this.route.snapshot.paramMap.get('quizId');
  if (routeId) this.quizId = routeId;

  if (!this.quizId) {
    console.warn('QuizDisplayComponent: no quizId provided and no quiz input');
    this.loading = false;
    return;
  }

  await this.loadQuiz();
}

// ---------------------------------------------
// Separate helper to initialize quiz arrays
// ---------------------------------------------
private initializeQuizState(quiz: Quiz) {
  const questions = this.locked ? quiz.questions.slice(0, 3) : quiz.questions;
  this.totalQuestions = questions.length;

  this.answers = Array.from({ length: this.totalQuestions }, () => ({ correct: null }));
  this.questionClicked = Array.from({ length: this.totalQuestions }, () => false);
  this.answerRevealed = Array.from({ length: this.totalQuestions }, () => false);
  this.score = 0;

  // If not previewMode, attempt to resume previous result
  if (!this.previewMode && this.userId) {
    this.initializeOrResumeQuiz(quiz); // optional: can await inside ngOnInit if desired
  }
}


  // ---------------------------------------------
  // LOAD QUIZ
  // ---------------------------------------------
  private async loadQuiz() {
    this.loading = true;
    this.quiz = undefined;

    try {
      await firstValueFrom(this.authService.initialized$);
      this.userId = this.authService.currentUserId ?? undefined;

      if (!this.quizId) return;

      const loaded = await firstValueFrom(this.quizService.getQuizByQuizId(this.quizId));
      if (loaded) {
        await this.initializeOrResumeQuiz(loaded);
      }
    } catch (err) {
      console.error('Error during loadQuiz()', err);
    } finally {
      this.loading = false;
    }

    this.applyThemeColors();
  }

  // ---------------------------------------------
  // THEME
  // ---------------------------------------------
  private applyThemeColors() {
    if (!this.quiz) return;

    const root = this.elRef.nativeElement as HTMLElement;

    if (this.quiz.theme) {
      root.style.setProperty('--secondary', this.quiz.theme.backgroundColor || '#18181b');
      root.style.setProperty('--primary', this.quiz.theme.fontColor || '#fbe2df');
      root.style.setProperty('--tertiary', this.quiz.theme.tertiaryColor || '#4cfbab');
    }

    // if (this.quiz.quizType === QuizTypeEnum.Weekly) {
    //   root.style.setProperty('--secondary', '#18181b');
    //   root.style.setProperty('--primary', '#fbe2df');
    //   root.style.setProperty('--tertiary', '#4cfbab');
    // }
  }

  // ---------------------------------------------
  // SESSION INITIALIZATION
  // ---------------------------------------------
  private async initializeOrResumeQuiz(quiz: Quiz) {
    this.quiz = quiz;

    const questions = this.locked ? quiz.questions.slice(0, 3) : quiz.questions;
    this.totalQuestions = questions.length;

    this.answers = Array.from({ length: this.totalQuestions }, () => ({ correct: null }));
    this.questionClicked = Array.from({ length: this.totalQuestions }, () => false);
    this.answerRevealed = Array.from({ length: this.totalQuestions }, () => false);
    this.score = 0;

    if (this.locked || !this.userId || this.previewMode) return;

    const allResults = await firstValueFrom(this.quizResultsService.getUserResults(this.userId));
    const quizResults = allResults.filter(r => r.quizId === quiz.quizId.toString());

    const inProgress = quizResults.find(r => r.status === 'in_progress');
    if (inProgress) {
      this.resultId = inProgress.resultId;
      inProgress.answers.forEach(a => {
        const idx = questions.findIndex(q => q.questionId === a.questionId);
        if (idx !== -1) this.answers[idx] = { correct: a.correct ?? null };
      });
      this.score = this.answers.filter(a => a.correct).length;
      return;
    }

    const completed = quizResults
      .filter(r => r.status === 'completed')
      .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))[0];

    if (completed) {
      this.resultId = completed.resultId;
      completed.answers.forEach(a => {
        const idx = questions.findIndex(q => q.questionId === a.questionId);
        if (idx !== -1) this.answers[idx] = { correct: a.correct ?? null };
      });
      this.score = this.answers.filter(a => a.correct).length;
      return;
    }

    this.resultId = await this.quizResultsService.createResult(
      quiz.quizId.toString(),
      this.userId,
      this.totalQuestions
    );
  }

  // ---------------------------------------------
  // UI HELPERS
  // ---------------------------------------------
  toggleQuestion(i: number) {
    this.questionClicked[i] = !this.questionClicked[i];
  }

  toggleAnswer(i: number) {
    this.answerRevealed[i] = !this.answerRevealed[i];
  }

  get isQuizCompleted(): boolean {
    return this.answers.every(a => a.correct !== null);
  }

  get answeredQuestions(): number {
    return this.answers.filter(a => a.correct !== null).length;
  }

  // ---------------------------------------------
  // RESET
  // ---------------------------------------------
  async resetQuiz() {
    if (!this.quiz || !this.userId || this.locked) return;

    try {
      this.resultId = await this.quizResultsService.createResult(
        this.quiz.quizId.toString(),
        this.userId,
        this.totalQuestions
      );

      this.answers = Array.from({ length: this.totalQuestions }, () => ({ correct: null }));
      this.questionClicked = Array.from({ length: this.totalQuestions }, () => false);
      this.answerRevealed = Array.from({ length: this.totalQuestions }, () => false);
      this.score = 0;

    } catch (err) {
      console.error('Failed to reset quiz', err);
    }
  }

  // ---------------------------------------------
  // MARK ANSWER
  // ---------------------------------------------
  async markAnswer(i: number, correct: boolean) {
    if (!this.quiz || this.locked || this.previewMode) return;

    const previous = this.answers[i].correct;

    if (previous === true && !correct) this.score--;
    else if ((previous === null || previous === false) && correct) this.score++;

    this.answers[i].correct = correct;

    if (this.resultId && this.userId) {
      try {
        await this.quizResultsService.addAnswer(this.resultId, {
          questionId: this.quiz.questions[i].questionId,
          correct,
          clickedAt: new Date()
        });
      } catch (err) {
        console.error('Failed to persist answer', err);
      }
    }

    if (this.isQuizCompleted && this.resultId) {
      try {
        await this.quizResultsService.completeResult(this.resultId);
      } catch (err) {
        console.error('Failed to complete result', err);
      }
    }
  }

  // ---------------------------------------------
  // DOWNLOAD PDF
  // ---------------------------------------------
  async downloadPdf() {
    if (!this.quiz) return;
    await this.quizPdfService.downloadQuizPdf(this.quiz);
  }
}
