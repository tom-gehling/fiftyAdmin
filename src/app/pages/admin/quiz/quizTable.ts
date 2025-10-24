import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { ScrollerModule } from 'primeng/scroller';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';

import { Quiz } from '@/shared/models/quiz.model';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { AuthService } from '@/shared/services/auth.service';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';

@Component({
    selector: 'app-quiz-table',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        CardModule,
        ButtonModule,
        TooltipModule,
        FloatLabelModule,
        SelectModule,
        ScrollerModule,
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
                                (ngModelChange)="filterByType()"
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
                        (input)="applyGlobalFilter($event)"
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

            <!-- Virtual Scroller -->
            <p-virtualScroller
                [items]="filteredQuizzes"
                [lazy]="true"
                
                [itemSize]="20"
                (onLazyLoad)="loadLazyQuizzes($event)"
                [loading]="loading"
                styleClass="w-full"
            >
                <ng-template let-quiz pTemplate="item">
                    <div
                        class="p-card mb-2 flex flex-row transition-colors cursor-pointer"
                        [ngClass]="{
                          'bg-surface-100 dark:bg-surface-800': selectedQuiz?.id === quiz.id,
                          'hover:bg-surface-50 dark:hover:bg-surface-700': selectedQuiz?.id !== quiz.id
                        }"
                        (click)="highlightRow(quiz)"
                        (dblclick)="openQuiz(quiz)"
                    >
                        <!-- Left: image + title -->
                        <div class="flex flex-1 items-center gap-4 p-3">
                            <img
                              *ngIf="quiz.imageUrl"
                              [src]="'/assets/logos/'+quiz.imageUrl"
                              [alt]="quiz.quizTitle"
                              class="w-20 h-20 rounded object-cover border border-surface-200"
                            />
                            <div class="flex flex-col justify-center">
                                <div class="font-semibold text-lg text-surface-900 dark:text-surface-100">
                                    {{ quiz.quizTitle }}
                                </div>
                            </div>
                        </div>

                        <!-- Right: deployment + flags + buttons -->
                        <div class="flex flex-col justify-between items-end p-3">
                            <div class="flex flex-col items-end gap-2">
                                <div class="text-sm text-gray-500">{{ quiz.deploymentDate | date:'short' }}</div>
                                <div class="flex items-center gap-2 text-sm text-gray-500">
                                    <span *ngIf="quiz.isPremium" class="px-2 py-0.5 text-xs font-semibold text-white bg-green-500 rounded-full">
                                        Fifty+
                                    </span>
                                    <span *ngIf="quiz.isActive" class="px-2 py-0.5 text-xs font-semibold text-white bg-green-500 rounded-full">
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
                </ng-template>
            </p-virtualScroller>
        </p-card>
    `
})
export class QuizTableComponent implements OnInit {
    quizzes: Quiz[] = [];
    filteredQuizzes: Quiz[] = [];
    selectedType: number | null = 1;
    loading = true;
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
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.loadQuizzes();
    }

    loadQuizzes() {
        this.quizzesService.getAllQuizzes().subscribe(data => {
            this.quizzes = data.map(q => {
                let deploymentDate: Date | undefined;
                if (q.deploymentDate) {
                    const ts = q.deploymentDate;
                    if (ts instanceof Date) deploymentDate = ts;
                    else if ('toDate' in ts && typeof ts.toDate === 'function')
                        deploymentDate = ts.toDate();
                    else deploymentDate = new Date(ts as any);
                }
                return { ...q, deploymentDate };
            });
            this.filteredQuizzes = [...this.quizzes];
            this.filterByType();
            this.loading = false;
            this.cdr.detectChanges();
        });
    }

    // Lazy load for virtual scroller
    loadLazyQuizzes(event: any) {
        // event.first = index of first row
        // event.rows = number of rows to load
        this.filteredQuizzes = this.quizzes.slice(event.first, event.first + event.rows);
    }

    applyGlobalFilter(event: Event) {
        const value = (event.target as HTMLInputElement).value.toLowerCase();
        this.filteredQuizzes = this.quizzes.filter(q =>
            ((q.quizTitle ?? '').toLowerCase()).includes(value) ||
            ((this.getQuizTypeName(q.quizType ?? 1) ?? '').toLowerCase()).includes(value)
        );
    }

    filterByType() {
        if (this.selectedType == null) {
            this.filteredQuizzes = [...this.quizzes];
        } else {
            this.filteredQuizzes = this.quizzes.filter(q => q.quizType === this.selectedType);
        }
    }

    getQuizTypeName(quizTypeId: number) {
        return this.quizType.find(x => x.value == quizTypeId)?.viewValue;
    }

    canWrite(): boolean {
        return !!this.authService.user$.value && !this.authService.isAnonymous;
    }

    createQuiz() { if (this.canWrite()) this.router.navigate(['/members/admin/quizzes', 0]); }
    editQuiz(quiz: Quiz) { this.router.navigate(['/members/admin/quizzes', quiz.id]); }
    highlightRow(quiz: Quiz) { this.selectedQuiz = quiz; }
    openQuiz(quiz: Quiz) { this.router.navigate(['/members/admin/quizzes', quiz.id]); }
    deleteQuiz(quiz: Quiz) { if(quiz.id) this.quizzesService.deleteQuiz(quiz.id); }
}
