import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';

import { Quiz } from '@/shared/models/quiz.model';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { AuthService } from '@/shared/services/auth.service';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';
import { NotifyService } from '@/shared/services/notify.service';

@Component({
  selector: 'app-quiz-table',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CardModule,
    ButtonModule,
    FloatLabelModule,
    SelectModule,
    InputTextModule,
    TagModule
  ],
  template: `
    <p-card>
      <!-- Header and Filters -->
      <div class="flex flex-col sm:flex-row justify-between items-start md:items-center mb-4 gap-2">
        <h2>All Quizzes</h2>

        <div class="flex flex-col sm:flex-row gap-2 flex-1 w-full md:ml-4">
          <!-- Quiz type filter -->
          <div class="flex-1 min-w-0">
            <p-floatlabel class="w-full" variant="in">
              <p-select
                id="quizType"
                [options]="quizType"
                [(ngModel)]="selectedType"
                optionLabel="viewValue"
                optionValue="value"
                (ngModelChange)="loadQuizzes()"
                class="w-full"
              ></p-select>
              <label for="quizType">Quiz Type</label>
            </p-floatlabel>
          </div>

          <!-- Search -->
          <input
            pInputText
            type="text"
            placeholder="Search quizzes..."
            class="flex-1 min-w-0"
            [(ngModel)]="searchText"
            (input)="loadQuizzes()"
          />

          <!-- Create quiz button -->
          <button
            pButton
            label="Create"
            icon="pi pi-plus"
            class="p-button-primary"
            *ngIf="canWrite()"
            (click)="createQuiz()"
          ></button>
        </div>
      </div>

      <!-- Quiz List -->
      <div *ngIf="!loading && quizzes.length > 0; else loadingOrEmpty" class="rounded-lg overflow-hidden">
       <div
  *ngFor="let quiz of quizzes; let first = first"
  style="display: flex !important; flex-direction:row; background: rgba(255,255,255,0.04); box-shadow: 0 1px 3px rgba(0,0,0,0.15); gap: 20px; position: relative;"
  class="flex flex-row items-center justify-between cursor-pointer transition-colors"
  [ngClass]="{
    'bg-surface-50 dark:bg-surface-700': selectedQuiz?.id === quiz?.id,
    'hover:bg-surface-100 dark:hover:bg-surface-600': selectedQuiz?.id !== quiz?.id
  }"
  (click)="highlightRow(quiz)"
  (dblclick)="openQuiz(quiz)"
>
          <div *ngIf="!first" style="width:100%;height:1px;background:var(--fifty-neon-green);position:absolute;top:0;left:0"></div>
          <!-- Left: image + title -->
          <div class="flex flex-1 items-center gap-4 p-3">
            <img
              *ngIf="quiz?.imageUrl"
              [src]="'/assets/logos/' + quiz.imageUrl"
              [alt]="quiz.quizTitle"
              class="w-20 h-20 rounded object-cover border border-surface-200"
            />
            <div class="flex flex-col justify-center">
              <div class="font-semibold text-lg text-surface-900 dark:text-surface-100">
                {{ quiz?.quizTitle }}
              </div>
            </div>
          </div>

          <!-- Right: deployment + flags + buttons -->
          <div class="flex flex-col justify-between items-end p-3">
            <div class="flex flex-col items-end gap-2">
              <div class="flex items-center gap-2 text-sm text-gray-500">
                <span
                  *ngIf="quiz?.isPremium"
                  style = "backgroundColor: var(--fifty-pink)"
                  class="px-2 py-0.5 text-xs font-semibold text-black rounded-full"
                >
                  Fifty+
                </span>
                <span
                  *ngIf="quiz?.isActive"
                  class="px-2 py-0.5 text-xs font-semibold text-white bg-green-500 rounded-full"
                >
                  Active
                </span>
              </div>
            </div>

            <div class="flex gap-2 mt-2">
              <button
                pButton
                icon="pi pi-pencil"
                class="p-button-text p-button-sm"
                *ngIf="canWrite()"
                (click)="editQuiz(quiz); $event.stopPropagation()"
              ></button>
              <button
                pButton
                icon="pi pi-trash"
                class="p-button-text p-button-sm p-button-danger"
                *ngIf="canWrite()"
                (click)="deleteQuiz(quiz); $event.stopPropagation()"
              ></button>
            </div>
          </div>
        </div>
      </div>

      <ng-template #loadingOrEmpty>
        <div class="text-center text-gray-500 py-4" *ngIf="loading">Loading quizzes...</div>
        <div class="text-center text-gray-500 py-4" *ngIf="!loading && !quizzes.length">
          No quizzes found.
        </div>
      </ng-template>
    </p-card>
  `
})
export class QuizTableComponent implements OnInit {
  quizzes: Quiz[] = [];
  selectedType: number | null = 1;
  searchText: string = '';
  loading = false;
  selectedQuiz: Quiz | null = null;

  quizType = [
    { value: QuizTypeEnum.Weekly, viewValue: 'Weekly' },
    { value: QuizTypeEnum.FiftyPlus, viewValue: 'Fifty+' },
    { value: QuizTypeEnum.Collab, viewValue: 'Collaboration' },
    { value: QuizTypeEnum.QuestionType, viewValue: 'Question Type' }
  ];

  constructor(
    private quizzesService: QuizzesService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private notify: NotifyService
  ) {}

  ngOnInit(): void {
    this.loadQuizzes();
  }

  loadQuizzes() {
  this.loading = true;
  this.quizzesService.getAllFilteredQuizzes(this.selectedType, this.searchText).subscribe(res => {
    this.quizzes = res
      .filter(q => !!q.quizTitle)
      .map(q => ({
        ...q,
        deploymentDate: (q.deploymentDate instanceof Date
            ? q.deploymentDate
            : q.deploymentDate?.toDate()) as Date | undefined
      }))
      .sort((a, b) => {
        if (this.selectedType === QuizTypeEnum.Weekly) {
          // Sort weekly quizzes by quizId descending
          return Number(b.quizId) - Number(a.quizId);
        } else {
          // Sort other quizzes alphabetically
          return a.quizTitle!.localeCompare(b.quizTitle!);
        }
      });
    this.loading = false;
    this.cdr.detectChanges();
  });
}


  canWrite(): boolean {
    return !!this.authService.user$.value;
  }

  createQuiz() {
    if (this.canWrite()) this.router.navigate(['/fiftyPlus/admin/quizzes', 0]);
  }

  editQuiz(quiz: Quiz) {
    this.router.navigate(['/fiftyPlus/admin/quizzes', quiz.id]);
  }

  highlightRow(quiz: Quiz) {
    this.selectedQuiz = quiz;
  }

  openQuiz(quiz: Quiz) {
    this.router.navigate(['/fiftyPlus/admin/quizzes', quiz.id]);
  }

  deleteQuiz(quiz: Quiz) {
    // if (quiz.id) this.quizzesService.deleteQuiz(quiz.id);
    this.notify.warn('Steady on Big Fella!');
  }
}
