import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { QuizCollectionComponent } from '../common/quizCollection/quizCollection';
import { AuthService } from '@/shared/services/auth.service';

@Component({
    selector: 'app-fifty-page',
    standalone: true,
    imports: [QuizCollectionComponent, AsyncPipe, ButtonModule],
    template: `
        <div class="relative">
            <!-- Quiz content — blurred and non-interactive when locked -->
            <div [class.blur-sm]="!(auth.isMember$ | async)" [class.pointer-events-none]="!(auth.isMember$ | async)" [class.select-none]="!(auth.isMember$ | async)">
                <app-quiz-collection [title]="title" [quizType]="quizType" [selectedQuizId]="selectedQuizId"></app-quiz-collection>
            </div>

            <!-- Lock overlay — only shown when not a paid member -->
            @if (!(auth.isMember$ | async)) {
                <div class="absolute inset-0 flex flex-col items-center justify-center rounded-2xl" style="background: rgba(0,0,0,0.6); min-height: 400px">
                    <i class="pi pi-lock text-primary mb-4" style="font-size: 3rem"></i>
                    <h2 class="text-2xl font-semibold text-surface-0 mb-3">Fifty+ Members Only</h2>
                    <p class="text-surface-300 mb-8 text-center px-8 max-w-sm">Subscribe to unlock all exclusive quizzes, archives, and member content.</p>
                    <p-button label="Become a Member" icon="pi pi-star" (click)="router.navigate(['/join'], { queryParams: { returnUrl: router.url } })"></p-button>
                </div>
            }
        </div>
    `,
})
export class FiftyPageComponent implements OnInit {
    quizType!: 'archives' | 'exclusives' | 'collaborations' | 'questions';
    title!: string;
    selectedQuizId?: string;

    constructor(
        private route: ActivatedRoute,
        public router: Router,
        public auth: AuthService
    ) {}

    ngOnInit(): void {
        const typeMap: Record<number, 'archives' | 'exclusives' | 'collaborations' | 'questions'> = {
            1: 'archives',
            2: 'exclusives',
            3: 'collaborations',
            4: 'questions',
        };

        const typeNum = this.route.snapshot.data['type'];
        this.title = this.route.snapshot.data['title'] || this.getDefaultTitle(typeNum);
        this.quizType = typeMap[typeNum] ?? 'archives';

        this.selectedQuizId = this.route.snapshot.paramMap.get('quizid') ?? undefined;

        this.route.paramMap.subscribe((params) => {
            const quizId = params.get('quizid');
            this.selectedQuizId = quizId ?? undefined;
        });
    }

    private getDefaultTitle(typeNum: number): string {
        const titles: Record<number, string> = {
            1: 'Archives',
            2: 'Exclusives',
            3: 'Collaborations',
            4: 'Question Quizzes',
        };
        return titles[typeNum] || 'Quizzes';
    }
}
