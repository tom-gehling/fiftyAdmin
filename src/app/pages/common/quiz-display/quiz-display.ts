import { Component, ElementRef, Input, OnChanges, OnInit, Optional, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Quiz } from '@/shared/models/quiz.model';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { QuizResultsService } from '@/shared/services/quiz-result.service';
import { AuthService } from '@/shared/services/auth.service';
import { QuizPdfService } from '@/shared/services/quiz-pdf.service';
import { SubmissionFormService } from '@/shared/services/submission-form.service';
import { QuizSubmissionService } from '@/shared/services/quiz-submission.service';
import { SubmissionForm, SubmissionFormField } from '@/shared/models/submissionForm.model';
import { TaggedUser } from '@/shared/models/quizSubmission.model';
import { QuizStatsService } from '@/shared/services/quiz-stats.service';
import { UserTagSelectorComponent } from '../userTagSelector/userTagSelector.component';
import { ActivatedRoute } from '@angular/router';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-quiz-display',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule, ButtonModule, DialogModule, ReactiveFormsModule, UserTagSelectorComponent],
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
        <div class="quizTitle">{{ getQuizTitle() }}</div>
        <div *ngIf="!locked" class="downloadRow">
          <p-button
            icon="pi pi-download"
            label="Download"
            [outlined]="true"
            (onClick)="downloadPdf()"
            class="downloadButton">
          </p-button>
        </div>
      </div>

      <!-- Notes Above -->
      <div *ngIf="quiz.notesAbove" class="notes" [innerHTML]="quiz.notesAbove"></div>

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
            <button class="genericButton" [ngClass]="{ reveal: answerRevealed[i] }" (click)="toggleAnswer(i)">
              Click for answer
            </button>
          </div>

          <!-- Answer & buttons -->
          <div *ngIf="questionClicked[i] && answerRevealed[i]" class="panel answer">
            <p [innerHTML]="q.answer"></p>

            <ng-container *ngIf="!locked">
              <div class="flex flex-col items-center gap-1">
                <div class="flex gap-2">
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
                <span *ngIf="answers[i]?.percentCorrect !== undefined" class="questionStat">
                  ({{ answers[i]?.percentCorrect }}% got this right)
                </span>
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

      <!-- Notes Below -->
      <div *ngIf="quiz.notesBelow" class="notes" [innerHTML]="quiz.notesBelow"></div>

      <!-- Submission Form -->
      <ng-container *ngIf="submissionForm && !submitted">
        <div class="submissionFormSection">
          <p *ngIf="submissionForm.description" class="formDescription">{{ submissionForm.description }}</p>

          <form [formGroup]="submissionFormGroup!" (ngSubmit)="submitForm()">

            <ng-container *ngFor="let field of sortedFields">

              <div class="formField" *ngIf="field.fieldType === 'text'">
                <label class="fieldLabel">{{ field.label }}<span *ngIf="field.required"> *</span></label>
                <input type="text" [formControlName]="field.fieldId"
                  [placeholder]="field.placeholder || ''" class="fieldInput" />
              </div>

              <div class="formField" *ngIf="field.fieldType === 'number'">
                <label class="fieldLabel">{{ field.label }}<span *ngIf="field.required"> *</span></label>
                <input type="number" [formControlName]="field.fieldId"
                  [placeholder]="field.placeholder || ''" class="fieldInput"
                  [attr.min]="field.validation?.min" [attr.max]="field.validation?.max" />
              </div>

              <div class="formField" *ngIf="field.fieldType === 'dropdown'">
                <label class="fieldLabel">{{ field.label }}<span *ngIf="field.required"> *</span></label>
                <select [formControlName]="field.fieldId" class="fieldInput fieldSelect">
                  <option value="">Select...</option>
                  <option *ngFor="let opt of field.options" [value]="opt">{{ opt }}</option>
                </select>
              </div>

              <div class="formField" *ngIf="field.fieldType === 'file'">
                <label class="fieldLabel">{{ field.label }}<span *ngIf="field.required"> *</span></label>
                <input type="file" class="fieldInput fileInput"
                  [accept]="getAcceptedTypes(field)"
                  (change)="onFileChange(field.fieldId, $event)" />
              </div>

              <div class="formField" *ngIf="field.fieldType === 'userTag'">
                <label class="fieldLabel">{{ field.label }}</label>
                <app-user-tag-selector
                  [placeholder]="field.placeholder || 'Search for teammates...'"
                  [selectedUsers]="taggedUsers[field.fieldId] || []"
                  (selectedUsersChange)="taggedUsers[field.fieldId] = $event">
                </app-user-tag-selector>
              </div>

            </ng-container>

            <p *ngIf="!userId" class="loginNotice">Please log in to submit.</p>

            <div class="formButtonRow">
              <button type="submit" class="genericButton"
                [disabled]="submitting || !userId">
                {{ submitting ? 'Submitting...' : 'Submit' }}
              </button>
              <button type="button" class="genericButton"
                [disabled]="generatingPreview" (click)="toggleSharePanel()">
                {{ generatingPreview ? 'Loading...' : 'Share' }}
              </button>
            </div>

          </form>

        </div>
      </ng-container>

      <!-- Submission Success -->
      <div *ngIf="submitted" class="submissionSuccess">
        Thanks for submitting!
      </div>

    </div>

    <!-- Share Modal -->
    <p-dialog
      [(visible)]="showSharePanel"
      (onHide)="sharePreviewDataUrl = undefined"
      [modal]="true"
      [closable]="true"
      [resizable]="false"
      [draggable]="false"
      header="Share Your Result"
      [style]="{ width: '90vw', maxWidth: '500px' }">

      <div class="shareDialogContent">

        <!-- Generating preview spinner -->
        <div *ngIf="generatingPreview" class="shareLoading">
          <p-progressSpinner strokeWidth="2" animationDuration=".5s"></p-progressSpinner>
        </div>

        <!-- Image preview (team photo was selected) -->
        <ng-container *ngIf="!generatingPreview && sharePreviewDataUrl">
          <img [src]="sharePreviewDataUrl" class="sharePreviewImg" alt="Your quiz result" />
          <button class="genericButton shareFullBtn" (click)="downloadShareImage()">
            Download Image
          </button>
        </ng-container>

        <!-- Text template (no photo — Wordle-style) -->
        <ng-container *ngIf="!generatingPreview && !sharePreviewDataUrl">
          <pre class="shareTextPreview">{{ getShareText() }}</pre>
          <button class="genericButton shareFullBtn" (click)="copyShareText()">
            {{ copySuccess ? 'Copied!' : 'Copy' }}
          </button>
        </ng-container>

      </div>

    </p-dialog>
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
      padding-top: "20px";
      // padding: 20px;
      border-radius: 15px;
      font-family: var(--font);
      background-color: var(--secondary);
      color: var(--primary);
    }

    .quizHeader {
      display: flex;
      flex-direction: column;
      margin-bottom: 20px;
    }

    .downloadRow {
      display: flex;
      justify-content: center;
    }

    .quizTitle {
      text-align: center;
      padding: 10px;
      font-size: 30px;
      font-weight: 600;
      color: var(--primary);
    }

    .questionText {
      display: contents;
    }

    ::ng-deep .accordionButton p {
      margin: 0;
      display: inline;
    }

    :host ::ng-deep .downloadButton .p-button {
      background-color: transparent;
      border-color: var(--tertiary);
      color: var(--tertiary);
    }

    :host ::ng-deep .downloadButton .p-button:hover {
      filter: brightness(0.9);
    }

    .notes {
      font-size: var(--header);
      font-weight: 800;
      line-height: 150%;
      padding: 15px 0;
      color: var(--primary);
      text-align: center;
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
      cursor: pointer;
    }

    .genericButton.reveal {
      background-color: var(--secondary);
      color: var(--primary);
      border: 3px solid var(--primary);
    }

    .genericButton.correct,
    .genericButton.incorrect {
      background-color: var(--secondary);
      color: var(--primary);
    }

    .questionStat {
      font-size: 14px;
      color: var(--primary);
      opacity: 0.7;
      margin-left: 8px;
      white-space: nowrap;
    }

    .genericButton:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .dot {
      width: 10px;
      height: 10px;
      margin-right: 10px;
      display: inline-block;
      border-radius: 50%;
      background-color: var(--tertiary);
    }

    .dot.removed {
      display: none;
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

    /* Submission Form */
    .submissionFormSection {
      margin-top: 30px;
      border-top: 2px solid var(--primary);
      padding: 20px;
    }

    .formTitle {
      text-align: center;
      font-size: var(--header);
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 10px;
    }

    .formDescription {
      text-align: center;
      font-size: var(--smaller);
      color: var(--primary);
      margin-bottom: 20px;
      opacity: 0.8;
    }

    .formField {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 18px;
    }

    .fieldLabel {
      font-size: var(--smaller);
      font-weight: 600;
      color: var(--primary);
    }

    .fieldInput {
      padding: 12px 15px;
      font-size: var(--smaller);
      font-family: var(--font);
      border-radius: 10px;
      border: 2px solid var(--primary);
      background-color: var(--secondary);
      color: var(--primary);
      transition: var(--transition);
      width: 100%;
      box-sizing: border-box;
    }

    .fieldInput:focus {
      outline: none;
      border-color: var(--tertiary);
    }

    .fieldSelect {
      cursor: pointer;
    }

    .fileInput {
      padding: 8px;
    }

    .fileInput::file-selector-button {
      background-color: var(--primary);
      color: var(--secondary);
      border: none;
      border-radius: 8px;
      padding: 6px 12px;
      cursor: pointer;
      font-family: var(--font);
      font-weight: 600;
      margin-right: 10px;
    }

    .loginNotice {
      text-align: center;
      color: var(--primary);
      font-size: var(--smaller);
      opacity: 0.7;
      margin-bottom: 10px;
    }

    .formButtonRow {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 10px;
    }

    .formButtonRow button {
      flex: 1;
      min-width: 120px;
    }

    .shareDialogContent {
      text-align: center;
      padding: 4px 0 8px;
    }

    .shareLoading {
      display: flex;
      justify-content: center;
      padding: 30px;
    }

    .sharePreviewImg {
      width: 100%;
      max-width: 380px;
      border-radius: 12px;
      display: block;
      margin: 0 auto 16px;
    }

    .shareTextPreview {
      background-color: #1e1e1e;
      color: var(--primary);
      padding: 18px 22px;
      border-radius: 12px;
      font-family: var(--font);
      font-size: 15px;
      white-space: pre;
      text-align: left;
      line-height: 1.7;
      margin-bottom: 16px;
      overflow-x: auto;
    }

    .shareFullBtn {
      width: 50%;
      max-width: 380px;
      border: none;
      background-color: var(--tertiary);
      color: var(--primary);
    }

    .submissionSuccess {
      margin-top: 20px;
      text-align: center;
      font-size: var(--header);
      font-weight: 800;
      color: var(--tertiary);
      padding: 20px 0;
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

  answers: { correct: boolean | null; percentCorrect?: number }[] = [];
  questionClicked: boolean[] = [];
  answerRevealed: boolean[] = [];

  userId?: string;
  resultId?: string;

  // Submission form state
  submissionForm?: SubmissionForm;
  submissionFormGroup?: FormGroup;
  taggedUsers: { [fieldId: string]: TaggedUser[] } = {};
  fileByField: { [fieldId: string]: File } = {};
  submitting = false;
  submitted = false;

  // Share state
  shareTeamName = '';
  shareLocation = '';
  sharePictureUrl?: string;
  sharePercentile?: number;
  copySuccess = false;
  showSharePanel = false;
  sharePreviewDataUrl?: string;
  generatingPreview = false;

  constructor(
    private quizService: QuizzesService,
    private quizResultsService: QuizResultsService,
    private quizStatsService: QuizStatsService,
    private authService: AuthService,
    private quizPdfService: QuizPdfService,
    private submissionFormService: SubmissionFormService,
    private quizSubmissionService: QuizSubmissionService,
    private fb: FormBuilder,
    private elRef: ElementRef,
    private route: ActivatedRoute,
    @Optional() public config: DynamicDialogConfig
  ) {}

  get sortedFields() {
    return [...(this.submissionForm?.fields ?? [])].sort((a, b) => a.order - b.order);
  }

  // ---------------------------------------------
  // CHANGES
  // ---------------------------------------------
  async ngOnChanges(changes: SimpleChanges) {
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
    if (this.config?.data?.quiz) {
      this.quiz = this.config.data.quiz;
    }

    this.previewMode = !!this.config?.data?.previewMode || this.previewMode;
    this.locked = !!this.config?.data?.locked || this.locked;

    if (this.quiz) {
      this.initializeQuizState(this.quiz);
      this.applyThemeColors();
      await this.loadSubmissionForm();
      this.loading = false;
      return;
    }

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

    if (!this.previewMode && this.userId) {
      this.initializeOrResumeQuiz(quiz);
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
        await this.loadSubmissionForm();
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
  // SUBMISSION FORM
  // ---------------------------------------------
  private async loadSubmissionForm() {
    if (!this.quiz?.submissionFormId) return;
    try {
      this.submissionForm = await this.submissionFormService.getFormById(this.quiz.submissionFormId);
      if (this.submissionForm) {
        this.buildSubmissionFormGroup();
      }
    } catch (err) {
      console.error('Failed to load submission form', err);
    }
  }

  private buildSubmissionFormGroup() {
    if (!this.submissionForm) return;
    const group: { [key: string]: any } = {};
    for (const field of this.submissionForm.fields) {
      if (field.fieldType !== 'file' && field.fieldType !== 'userTag') {
        group[field.fieldId] = ['', field.required ? Validators.required : []];
      }
      if (field.fieldType === 'userTag') {
        this.taggedUsers[field.fieldId] = [];
      }
    }
    this.submissionFormGroup = this.fb.group(group);
  }

  getAcceptedTypes(field: SubmissionFormField): string {
    return field.validation?.allowedFileTypes?.join(',') || 'image/*';
  }

  onFileChange(fieldId: string, event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.fileByField[fieldId] = input.files[0];
    }
  }

  async submitForm() {
    if (!this.submissionFormGroup || !this.quiz || !this.userId) return;
    if (!this.submissionFormGroup.valid) {
      this.submissionFormGroup.markAllAsTouched();
      return;
    }

    this.submitting = true;
    try {
      const values = this.submissionFormGroup.value;
      let pictureUrl: string | undefined;

      // Upload any file fields
      for (const [, file] of Object.entries(this.fileByField)) {
        pictureUrl = await this.quizSubmissionService.uploadSubmissionPhoto(
          file, this.quiz.quizId, this.userId
        );
      }

      // Flatten tagged users across all userTag fields
      const taggedUsers: TaggedUser[] = Object.values(this.taggedUsers).flat();

      // Separate built-in fields from custom fields
      const builtinIds = new Set(['teamName', 'location', 'score', 'photo', 'taggedUsers']);
      const customFields: { [key: string]: any } = {};
      for (const [key, val] of Object.entries(values)) {
        if (!builtinIds.has(key)) customFields[key] = val;
      }

      await this.quizSubmissionService.createSubmission({
        quizId: this.quiz.quizId,
        quizDocId: this.quiz.id || '',
        formId: this.submissionForm!.id || '',
        submitterId: this.userId,
        submitterName: this.userId,
        teamName: values['teamName'] || '',
        location: values['location'] || '',
        score: Number(values['score']) || 0,
        pictureUrl,
        taggedUsers,
        customFields,
      });

      this.shareTeamName = values['teamName'] || '';
      this.shareLocation = values['location'] || '';
      this.sharePictureUrl = pictureUrl;
      this.submitted = true;
    } catch (err) {
      console.error('Failed to submit form', err);
    } finally {
      this.submitting = false;
    }
  }

  // ---------------------------------------------
  // UI HELPERS
  // ---------------------------------------------
  getQuizTitle(): string {
    if (!this.quiz) return '';
    if (this.quiz.quizType === QuizTypeEnum.Weekly && this.quiz.deploymentDate) {
      const date = this.quiz.deploymentDate instanceof Date
        ? this.quiz.deploymentDate
        : this.quiz.deploymentDate.toDate();
      const formatted = new Intl.DateTimeFormat('en-AU', {
        timeZone: 'Australia/Adelaide',
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      }).format(date);
      return `Quiz ${this.quiz.quizId} - ${formatted}`;
    }
    return this.quiz.quizTitle || `Quiz ${this.quiz.quizId}`;
  }

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
    if (!this.quiz || this.locked) return;

    const previous = this.answers[i].correct;

    if (previous === true && !correct) this.score--;
    else if ((previous === null || previous === false) && correct) this.score++;

    this.answers[i] = { correct };

    if (this.previewMode || !this.resultId || !this.userId) return;

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
        this.applyStatsToAnswers();
      } catch (err) {
        console.error('Failed to complete result', err);
      }
    }
  }

  // ---------------------------------------------
  // QUIZ STATS
  // ---------------------------------------------
  private async applyStatsToAnswers() {
    if (!this.quiz) return;
    try {
      const aggregate = await this.quizStatsService.getQuizAggregatesFirestore(this.quiz.quizId.toString());
      if (!aggregate || (aggregate.completedCount ?? 0) < 50) return;
      const questionAccuracy: { questionId: string | number; correctRate: number }[] = aggregate.questionAccuracy ?? [];
      this.answers = this.answers.map((answer, i) => {
        const q = this.quiz!.questions[i];
        if (!q) return answer;
        const stat = questionAccuracy.find(qa => Number(qa.questionId) === q.questionId);
        if (!stat) return answer;
        return { ...answer, percentCorrect: Math.round(stat.correctRate * 100) };
      });

      // Calculate percentile if score distribution is available in the aggregate
      if (aggregate.scoreDistribution) {
        const dist: number[] = aggregate.scoreDistribution;
        const total = dist.reduce((s: number, c: number) => s + c, 0);
        if (total > 0) {
          const below = dist.slice(0, this.score).reduce((s: number, c: number) => s + c, 0);
          this.sharePercentile = Math.round((below / total) * 100);
        }
      }
    } catch (err) {
      console.error('Failed to load quiz stats', err);
    }
  }

  // ---------------------------------------------
  // DOWNLOAD PDF
  // ---------------------------------------------
  async downloadPdf() {
    if (!this.quiz) return;
    await this.quizPdfService.downloadQuizPdf(this.quiz);
  }

  // ---------------------------------------------
  // SHARE
  // ---------------------------------------------

  /** Wordle-style text template (shown when no photo is uploaded) */
  getShareText(): string {
    if (!this.quiz) return '';
    const teamName = this.submissionFormGroup?.value['teamName'] || this.shareTeamName || '';
    const location = this.submissionFormGroup?.value['location'] || this.shareLocation || '';
    const lines: string[] = [];

    lines.push(`Fifty Quiz ${this.quiz.quizId}`);
    if (teamName) lines.push(teamName);
    lines.push(`Score: ${this.score}/${this.totalQuestions}`);
    if (this.sharePercentile !== undefined) {
      lines.push(`Better than ${this.sharePercentile}% of players!`);
    }
    lines.push('');

    // Wordle-style answer grid — 🟩 correct, 🟥 incorrect, ⬜ unanswered
    const emojis = this.answers.map(a =>
      a.correct === true ? '🟩' : a.correct === false ? '🟥' : '⬜'
    );
    for (let i = 0; i < emojis.length; i += 10) {
      lines.push(emojis.slice(i, i + 10).join(''));
    }

    lines.push('');
    if (location) lines.push(`📍 ${location}`);
    lines.push('#FiftyQuiz');

    return lines.join('\n');
  }

  async copyShareText() {
    const text = this.getShareText();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    this.copySuccess = true;
    setTimeout(() => this.copySuccess = false, 2000);
  }

  /** Open the share modal; generates the image preview if a photo is available */
  async toggleSharePanel() {
    this.showSharePanel = true;

    const hasPhoto = Object.values(this.fileByField).length > 0 || !!this.sharePictureUrl;
    if (!hasPhoto) return; // text template will be shown instead

    this.generatingPreview = true;
    try {
      this.sharePreviewDataUrl = await this.buildShareImage();
    } catch (err) {
      console.error('Failed to generate share preview', err);
    } finally {
      this.generatingPreview = false;
    }
  }

  downloadShareImage() {
    if (!this.sharePreviewDataUrl || !this.quiz) return;
    const a = document.createElement('a');
    a.href = this.sharePreviewDataUrl;
    a.download = `quiz-${this.quiz.quizId}-result.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private async buildShareImage(): Promise<string> {
    const teamName = this.submissionFormGroup?.value['teamName'] || this.shareTeamName || '';
    const location = this.submissionFormGroup?.value['location'] || this.shareLocation || '';

    const photoFile = Object.values(this.fileByField)[0];
    const photoBlobUrl = photoFile ? URL.createObjectURL(photoFile) : undefined;
    const photoSrc = photoBlobUrl ?? this.sharePictureUrl;

    const size = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Background (fifty-green)
    ctx.fillStyle = '#677c73';
    ctx.fillRect(0, 0, size, size);

    // Team photo as full-bleed cover
    if (photoSrc) await this.drawImageCover(ctx, photoSrc, size);

    // // Top gradient — darkens upper third for text legibility
    // const topGrad = ctx.createLinearGradient(0, 0, 0, size * 0.52);
    // topGrad.addColorStop(0, 'rgba(0,0,0,0.80)');
    // topGrad.addColorStop(1, 'rgba(0,0,0,0)');
    // // ctx.fillStyle = topGrad;
    // ctx.fillRect(0, 0, size, size * 0.52);

    // // Bottom gradient — darkens lower fifth for location pill
    // const bottomGrad = ctx.createLinearGradient(0, size * 0.72, 0, size);
    // bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
    // bottomGrad.addColorStop(1, 'rgba(0,0,0,0.65)');
    // ctx.fillStyle = bottomGrad;
    // ctx.fillRect(0, size * 0.72, size, size * 0.28);

    const pink = '#fbe2df';

    // Team name — top center, large pink
    let scoreLabelY = 80;
    if (teamName) {
      ctx.fillStyle = pink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      let fontSize = 102;
      ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
      while (ctx.measureText(teamName).width > size - 80 && fontSize > 40) {
        fontSize -= 4;
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      }
      ctx.fillText(teamName, size / 2, 80);
      scoreLabelY = 80 + fontSize + 14;
    }

    // Score — just below team name, smaller
    ctx.fillStyle = pink;
    ctx.font = `bold 48px Helvetica, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Score: ${this.score}`, size / 2, scoreLabelY);

    // Location — fifty-green pill at the bottom
    if (location) {
      const pillFont = 'bold 40px Helvetica, Arial, sans-serif';
      ctx.font = pillFont;
      const textW = ctx.measureText(location).width;
      const pinH = 36;
      const pinGap = 14;
      const totalContentW = pinH + pinGap + textW;
      const padX = 50;
      const pillH = 76;
      const pillW = Math.min(totalContentW + padX * 2, size - 80);
      const pillX = (size - pillW) / 2;
      const pillY = size - 130;

      ctx.fillStyle = '#677c73';
      this.canvasRoundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fill();

      const textCenterY = pillY + pillH / 2;
      const contentStartX = size / 2 - totalContentW / 2;

      this.drawMapPin(ctx, contentStartX + pinH / 2, textCenterY, pinH, pink);

      ctx.fillStyle = pink;
      ctx.font = pillFont;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(location, contentStartX + pinH + pinGap, textCenterY, pillW - padX - pinH - pinGap);
    }

    // Logo — bottom-left
    await this.drawImageBottomLeft(ctx, 'assets/logos/logo.png', size, 100);

    if (photoBlobUrl) URL.revokeObjectURL(photoBlobUrl);
    return canvas.toDataURL('image/png');
  }

  private canvasRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  private drawMapPin(ctx: CanvasRenderingContext2D, cx: number, cy: number, totalH: number, color: string) {
    const r = totalH * 0.32;
    const headCy = cy - totalH * 0.18;
    const tipY = cy + totalH * 0.5;
    ctx.fillStyle = color;
    // Circle head
    ctx.beginPath();
    ctx.arc(cx, headCy, r, 0, Math.PI * 2);
    ctx.fill();
    // Triangle tail
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.65, headCy + r * 0.5);
    ctx.lineTo(cx + r * 0.65, headCy + r * 0.5);
    ctx.lineTo(cx, tipY);
    ctx.closePath();
    ctx.fill();
  }

  private drawImageBottomLeft(ctx: CanvasRenderingContext2D, url: string, size: number, logoH: number): Promise<void> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const logoW = (img.width / img.height) * logoH;
        ctx.drawImage(img, 40, size - logoH - 40, logoW, logoH);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = url;
    });
  }

  private drawImageCover(ctx: CanvasRenderingContext2D, url: string, size: number): Promise<void> {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const imgRatio = img.width / img.height;
        let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
        if (imgRatio > 1) {
          srcW = img.height;
          srcX = (img.width - srcW) / 2;
        } else {
          srcH = img.width;
          srcY = (img.height - srcH) / 2;
        }
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, size, size);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = url;
    });
  }
}
