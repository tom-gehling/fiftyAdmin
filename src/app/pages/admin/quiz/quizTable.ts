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
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';

import { Quiz } from '@/shared/models/quiz.model';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { AuthService } from '@/shared/services/auth.service';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';
import { NotifyService } from '@/shared/services/notify.service';
import { CollaboratorsService } from '@/shared/services/collaborators.service';
import { Collaborator } from '@/shared/models/collaborator.model';

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
    TagModule,
    CheckboxModule,
    TooltipModule
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
                (ngModelChange)="onTypeChange()"
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
            [disabled]="bulkEditMode"
          />

          <!-- Bulk Edit toggle -->
          <button
            pButton
            [label]="bulkEditMode ? 'Cancel' : 'Bulk Edit'"
            [icon]="bulkEditMode ? 'pi pi-times' : 'pi pi-list-check'"
            [class]="bulkEditMode ? 'p-button-outlined p-button-secondary' : 'p-button-outlined'"
            *ngIf="canWrite()"
            (click)="toggleBulkEdit()"
          ></button>

          <!-- Save All (bulk edit mode) -->
          <button
            pButton
            label="Save All"
            icon="pi pi-save"
            class="p-button-success"
            *ngIf="bulkEditMode"
            [disabled]="dirtyIds.size === 0 || saving"
            (click)="saveAll()"
          ></button>

          <!-- Create quiz button -->
          <button
            pButton
            label="Create"
            icon="pi pi-plus"
            class="p-button-primary"
            *ngIf="canWrite() && !bulkEditMode"
            (click)="createQuiz()"
          ></button>
        </div>
      </div>

      <!-- Bulk edit hint -->
      <div *ngIf="bulkEditMode" class="mb-3 text-sm text-surface-500 flex items-center gap-2">
        <i class="pi pi-info-circle"></i>
        Edit fields inline. Changed rows are highlighted. Click <strong>Save All</strong> to persist.
      </div>

      <!-- Quiz List -->
      <div *ngIf="!loading && !saving && quizzes.length > 0; else loadingOrEmpty" class="rounded-lg overflow-hidden">

        <!-- Collab: grouped by collaborator -->
        <ng-container *ngIf="selectedType === QuizTypeEnum.Collab; else flatList">
          <ng-container *ngFor="let group of collabGroups">
            <div class="px-4 py-2 mt-3 font-semibold text-base border-b border-surface-300 dark:border-surface-600 text-surface-700 dark:text-surface-200">
              {{ group.collabName }}
            </div>
            <ng-container *ngFor="let quiz of group.quizzes; let first = first">
              <ng-container *ngTemplateOutlet="quizRow; context: { $implicit: quiz, first: first }"></ng-container>
            </ng-container>
          </ng-container>
        </ng-container>

        <!-- All other types: flat list -->
        <ng-template #flatList>
          <ng-container *ngFor="let quiz of draftQuizzes; let first = first">
            <ng-container *ngTemplateOutlet="quizRow; context: { $implicit: quiz, first: first }"></ng-container>
          </ng-container>
        </ng-template>

        <!-- Shared row template -->
        <ng-template #quizRow let-quiz let-first="first">
          <div
            style="display: flex !important; flex-direction:row; background: rgba(255,255,255,0.04); box-shadow: 0 1px 3px rgba(0,0,0,0.15); gap: 20px; position: relative;"
            class="flex flex-row items-center justify-between transition-colors"
            [class.cursor-pointer]="!bulkEditMode"
            [ngClass]="{
              'bg-surface-50 dark:bg-surface-700': !bulkEditMode && selectedQuiz?.id === quiz?.id,
              'hover:bg-surface-100 dark:hover:bg-surface-600': !bulkEditMode && selectedQuiz?.id !== quiz?.id,
              'outline outline-1 outline-yellow-400': bulkEditMode && dirtyIds.has(quiz.id!)
            }"
            (click)="!bulkEditMode && highlightRow(quiz)"
            (dblclick)="!bulkEditMode && openQuiz(quiz)"
          >
            <div *ngIf="!first" style="width:100%;height:1px;background:var(--fifty-neon-green);position:absolute;top:0;left:0"></div>

            <!-- Left: image + title -->
            <div class="flex flex-1 items-center gap-4 p-3">
              <img
                *ngIf="quiz?.imageUrl"
                [src]="quiz.imageUrl"
                [alt]="quiz.quizTitle"
                class="w-20 h-20 rounded object-cover border border-surface-200"
              />

              <!-- READ mode: title -->
              <div *ngIf="!bulkEditMode" class="flex flex-col justify-center">
                <div class="font-semibold text-lg text-surface-900 dark:text-surface-100">
                  {{ getDisplayTitle(quiz) }}
                </div>
              </div>

              <!-- EDIT mode: name + type + flags -->
              <div *ngIf="bulkEditMode" class="flex flex-wrap items-center gap-3 flex-1">
                <input
                  pInputText
                  type="text"
                  [(ngModel)]="quiz.quizTitle"
                  (ngModelChange)="markDirty(quiz)"
                  placeholder="Quiz name"
                  class="flex-1 min-w-0"
                  style="min-width: 160px"
                  (click)="$event.stopPropagation()"
                />
                <input
                  pInputText
                  type="text"
                  [(ngModel)]="quiz.quizSlug"
                  (ngModelChange)="markDirty(quiz)"
                  placeholder="Quiz URL"
                  class="flex-1 min-w-0"
                  style="min-width: 140px"
                  (click)="$event.stopPropagation()"
                />
                <p-select
                  [options]="quizType"
                  [(ngModel)]="quiz.quizType"
                  optionLabel="viewValue"
                  optionValue="value"
                  (ngModelChange)="markDirty(quiz)"
                  placeholder="Type"
                  style="min-width: 140px"
                  (click)="$event.stopPropagation()"
                ></p-select>
                <div class="flex items-center gap-4">
                  <label class="flex items-center gap-2 cursor-pointer select-none text-sm">
                    <p-checkbox
                      [(ngModel)]="quiz.isActive"
                      [binary]="true"
                      (ngModelChange)="markDirty(quiz)"
                      (click)="$event.stopPropagation()"
                    ></p-checkbox>
                    Active
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer select-none text-sm">
                    <p-checkbox
                      [(ngModel)]="quiz.isPremium"
                      [binary]="true"
                      (ngModelChange)="markDirty(quiz)"
                      (click)="$event.stopPropagation()"
                    ></p-checkbox>
                    Fifty+
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer select-none text-sm">
                    <p-checkbox
                      [(ngModel)]="quiz.featuredOnWeekly"
                      [binary]="true"
                      (ngModelChange)="markDirty(quiz)"
                      (click)="$event.stopPropagation()"
                    ></p-checkbox>
                    Featured on Weekly
                  </label>
                </div>
              </div>
            </div>

            <!-- Right: flags + buttons (read mode only) -->
            <div *ngIf="!bulkEditMode" class="flex flex-col justify-between items-end p-3">
              <div class="flex flex-col items-end gap-2">
                <div class="flex items-center gap-2 text-sm text-gray-500">
                  <span
                    *ngIf="quiz?.isPremium"
                    style="background-color: var(--fifty-pink)"
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
                  <span
                    *ngIf="quiz?.featuredOnWeekly"
                    style="background-color: var(--fifty-neon-green)"
                    class="px-2 py-0.5 text-xs font-semibold text-black rounded-full"
                  >
                    Featured
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
        </ng-template>

      </div>

      <ng-template #loadingOrEmpty>
        <div class="flex items-center justify-center py-8 text-gray-500" *ngIf="saving">
          <i class="pi pi-spin pi-spinner text-2xl mr-2"></i> Saving...
        </div>
        <div class="text-center text-gray-500 py-4" *ngIf="loading && !saving">Loading quizzes...</div>
        <div class="text-center text-gray-500 py-4" *ngIf="!loading && !saving && !quizzes.length">
          No quizzes found.
        </div>
      </ng-template>
    </p-card>
  `
})
export class QuizTableComponent implements OnInit {
  quizzes: Quiz[] = [];
  draftQuizzes: Quiz[] = [];
  collaborators: Collaborator[] = [];
  selectedType: number | null = sessionStorage.getItem('quizTableType') !== null
    ? Number(sessionStorage.getItem('quizTableType'))
    : 1;
  searchText: string = '';
  loading = false;
  saving = false;
  selectedQuiz: Quiz | null = null;
  bulkEditMode = false;
  dirtyIds = new Set<string>();
  readonly QuizTypeEnum = QuizTypeEnum;

  get collabGroups(): { collabId: string; collabName: string; quizzes: Quiz[] }[] {
    const map = new Map<string, { collabId: string; collabName: string; quizzes: Quiz[] }>();
    for (const quiz of this.draftQuizzes) {
      const key = quiz.collabId || '__none__';
      if (!map.has(key)) {
        const collab = this.collaborators.find(c => c.id === quiz.collabId);
        map.set(key, {
          collabId: key,
          collabName: collab?.name || quiz.collab || 'Unknown Collaborator',
          quizzes: []
        });
      }
      map.get(key)!.quizzes.push(quiz);
    }
    return Array.from(map.values()).sort((a, b) => a.collabName.localeCompare(b.collabName));
  }

  getDisplayTitle(quiz: Quiz): string {
    if (quiz.quizType === QuizTypeEnum.Collab) {
      const collab = this.collaborators.find(c => c.id === quiz.collabId);
      const prefix = collab?.name || quiz.collab;
      if (prefix) return `(${prefix}) ${quiz.quizTitle || ''}`;
    }
    return quiz.quizTitle || '';
  }

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
    private notify: NotifyService,
    private collaboratorsService: CollaboratorsService
  ) {}

  ngOnInit(): void {
    this.collaboratorsService.getAll().subscribe(c => this.collaborators = c);
    this.loadQuizzes();
  }

  onTypeChange() {
    sessionStorage.setItem('quizTableType', String(this.selectedType));
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
            return Number(b.quizId) - Number(a.quizId);
          } else {
            return a.quizTitle!.localeCompare(b.quizTitle!);
          }
        });
      this.draftQuizzes = this.quizzes.map(q => ({ ...q }));
      this.loading = false;
      this.saving = false;
      this.cdr.detectChanges();
    });
  }

  toggleBulkEdit() {
    if (this.bulkEditMode) {
      // Cancel — restore drafts from originals
      this.draftQuizzes = this.quizzes.map(q => ({ ...q }));
      this.dirtyIds.clear();
    } else {
      this.draftQuizzes = this.quizzes.map(q => ({ ...q }));
      this.dirtyIds.clear();
    }
    this.bulkEditMode = !this.bulkEditMode;
  }

  markDirty(quiz: Quiz) {
    if (quiz.id) this.dirtyIds.add(quiz.id);
  }

  async saveAll() {
    this.saving = true;
    const saves = this.draftQuizzes
      .filter(q => q.id && this.dirtyIds.has(q.id))
      .map(q => this.quizzesService.updateQuiz(q.id!, q));
    try {
      await Promise.all(saves);
      this.notify.success(`Saved ${saves.length} quiz${saves.length !== 1 ? 'zes' : ''}`);
      this.dirtyIds.clear();
      this.bulkEditMode = false;
      this.loadQuizzes(); // saving = false is cleared inside loadQuizzes subscribe
    } catch {
      this.notify.warn('Some saves failed. Please try again.');
      this.saving = false;
    }
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

  deleteQuiz(_quiz: Quiz) {
    this.notify.warn('Steady on Big Fella!');
  }

  async applyFiftyPlusTheme() {
    const count = await this.quizzesService.bulkSetFiftyPlusTheme();
    this.notify.success(`Theme applied to ${count} Fifty+ quizzes`);
  }
}
