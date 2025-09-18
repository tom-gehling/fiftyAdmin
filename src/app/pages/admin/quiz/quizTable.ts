import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { RouterModule, Router } from '@angular/router';
import { Quiz } from '@/shared/models/quiz.model';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { AuthService } from '@/shared/services/auth.service';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';

@Component({
    selector: 'app-quiz-table',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        InputTextModule,
        ButtonModule,
        CardModule,
        TooltipModule,
        RouterModule
    ],
    template: `
        <p-card>
            <div class="flex justify-between items-center mb-4">
                <h2>All Quizzes</h2>
                <div class="flex gap-2">
                    <input
                        pInputText
                        type="text"
                        placeholder="Search all columns..."
                        (input)="applyGlobalFilter($event)"
                    />
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

            <p-table
                #quizTable
                [value]="quizzes"
                [paginator]="true"
                [rows]="10"
                [sortField]="'quizId'"
                [sortOrder]="1"
                [rowHover]="true"
                [globalFilterFields]="['quizId', 'quizTypeLabel']"
                [responsiveLayout]="'scroll'"
                selectionMode="single"
                [(selection)]="selectedQuiz"
                (onRowSelect)="goToDetails($event.data)"
            >
                <ng-template pTemplate="header">
                    <tr>
                        <th pSortableColumn="quizId">Quiz <p-sortIcon field="quizId"></p-sortIcon></th>
                        <th pSortableColumn="quizTypeLabel">Type <p-sortIcon field="quizTypeLabel"></p-sortIcon></th>
                        <!-- <th pSortableColumn="creationTime">Created <p-sortIcon field="creationTime"></p-sortIcon></th> -->
                    </tr>
                </ng-template>
                <ng-template pTemplate="body" let-quiz>
                    <tr [pSelectableRow]="quiz">
                        <td>{{ quiz.quizId }}</td>
                        <td>{{ getQuizTypeLabel(quiz.quizType) }}</td>
                        <!-- <td>{{ quiz.creationTime | date:'short' }}</td> -->
                    </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                    <tr>
                        <td colspan="3">No quizzes found.</td>
                    </tr>
                </ng-template>
            </p-table>
        </p-card>
    `,
})
export class QuizTableComponent implements OnInit {
    quizzes: Quiz[] = [];
    selectedQuiz: Quiz | null = null;
    quizTypeLabels = ['Weekly', 'Fifty+', 'Collaboration'];

    @ViewChild('quizTable') quizTable!: Table;

    constructor(
        private quizzesService: QuizzesService,
        private authService: AuthService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.quizzesService.getAllQuizzes().subscribe((data) => {
            this.quizzes = data;
            this.cdr.detectChanges();
        });
    }

    applyGlobalFilter(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.quizTable.filterGlobal(value, 'contains');
    }

    getQuizTypeLabel(type?: QuizTypeEnum): string {
        if (type === undefined) return 'Unknown';
        return this.quizTypeLabels[type] || 'Unknown';
    }

    canWrite(): boolean {
        return !!this.authService.user$.value && !this.authService.isAnonymous;
    }

    createQuiz() {
        if (this.canWrite()) {
            // Navigate to new quiz detail page (0 or 'new' ID)
            this.router.navigate(['/members/admin/quizzes', 0]);
        }
    }

    goToDetails(quiz: any) {
        if (!quiz || !this.canWrite()) return;
        // Navigate to quiz detail page by ID
        this.router.navigate(['/members/admin/quizzes', quiz.id]);
    }
}
