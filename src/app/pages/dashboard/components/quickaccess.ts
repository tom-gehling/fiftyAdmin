import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { QuizzesService } from '@/shared/services/quizzes.service';
import { Quiz } from '@/shared/models/quiz.model';

interface QuickAccessItem {
    label: string;
    icon?: string;
    iconSizeClass?: string;
    imageUrl?: string;
    dateBadge?: Date | null;
    routerLink?: string;
    action?: () => void;
    disabled?: boolean;
}

@Component({
    selector: 'app-quick-access-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, DatePipe],
    template: `
        <div class="card w-full flex flex-col gap-4 p-4 sm:p-6 mb-8 fiftyBorder" style="background: rgb(40, 40, 40); border-radius: 1rem;">
            <div class="text-2xl font-semibold text-surface-900 dark:text-surface-0">Quick Access</div>

            <div class="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4 w-full">
                @for (item of items; track item.label) {
                    <ng-container *ngTemplateOutlet="tile; context: { item: item }"></ng-container>
                }
            </div>
        </div>

        <ng-template #tile let-item="item">
            @if (item.disabled) {
                <div class="flex flex-col items-center justify-start p-1 opacity-60 cursor-not-allowed select-none">
                    <ng-container *ngTemplateOutlet="tileInner; context: { item: item }"></ng-container>
                    <span class="text-sm sm:text-base text-center mt-3 font-semibold line-clamp-2">{{ item.label }}</span>
                </div>
            } @else if (item.routerLink) {
                <a [routerLink]="item.routerLink" class="flex flex-col items-center justify-start cursor-pointer transition-transform hover:scale-110 p-1 no-underline">
                    <ng-container *ngTemplateOutlet="tileInner; context: { item: item }"></ng-container>
                    <span class="text-sm sm:text-base text-center mt-3 font-semibold line-clamp-2 text-surface-900 dark:text-surface-0">{{ item.label }}</span>
                </a>
            } @else {
                <div (click)="item.action && item.action()" class="flex flex-col items-center justify-start cursor-pointer transition-transform hover:scale-110 p-1">
                    <ng-container *ngTemplateOutlet="tileInner; context: { item: item }"></ng-container>
                    <span class="text-sm sm:text-base text-center mt-3 font-semibold line-clamp-2">{{ item.label }}</span>
                </div>
            }
        </ng-template>

        <ng-template #tileInner let-item="item">
            <div class="relative w-full aspect-square sm:aspect-auto sm:min-h-[150px] rounded-2xl overflow-hidden shadow-lg flex items-center justify-center" style="border: 3px solid #4cfbab; background-color: #000000">
                @if (item.imageUrl) {
                    <img [src]="item.imageUrl" [alt]="item.label" class="w-full h-full object-contain p-2" />
                } @else if (item.icon) {
                    <i [ngClass]="item.icon" [class]="item.iconSizeClass || 'text-4xl sm:text-6xl'" style="color: var(--fifty-neon-green);"></i>
                }
                @if (item.dateBadge) {
                    <span
                        class="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full"
                        style="background: rgba(0,0,0,0.75); color: var(--fifty-neon-green); border: 1px solid var(--fifty-neon-green);"
                    >
                        {{ item.dateBadge | date: 'd MMM' }}
                    </span>
                }
                @if (item.disabled) {
                    <span class="absolute top-2 right-2 text-[10px] sm:text-xs uppercase font-bold px-2 py-0.5 rounded-full" style="background: rgba(0,0,0,0.6); color: var(--fifty-neon-green); border: 1px solid var(--fifty-neon-green);">Soon</span>
                }
            </div>
        </ng-template>
    `
})
export class QuickAccessDashboardComponent implements OnInit {
    thisWeekDate: Date | null = null;
    lastWeekDate: Date | null = null;
    lastWeekQuizId: number | null = null;

    items: QuickAccessItem[] = [];

    constructor(
        private quizzesService: QuizzesService,
        private router: Router
    ) {}

    ngOnInit() {
        this.items = this.buildItems();

        this.quizzesService.getActiveQuiz().subscribe((quiz) => {
            this.thisWeekDate = this.toDate(quiz?.deploymentDate);
            this.items = this.buildItems();
        });

        this.quizzesService.getArchiveQuizzes().subscribe((archives: Quiz[]) => {
            const lastWeek = archives[0];
            this.lastWeekQuizId = lastWeek?.quizId ?? null;
            this.lastWeekDate = this.toDate(lastWeek?.deploymentDate);
            this.items = this.buildItems();
        });
    }

    private toDate(value: any): Date | null {
        if (!value) return null;
        if (value instanceof Date) return value;
        if (typeof value.toDate === 'function') return value.toDate();
        return null;
    }

    private buildItems(): QuickAccessItem[] {
        return [
            {
                label: "This Week's Quiz",
                imageUrl: '/assets/logos/logo.png',
                dateBadge: this.thisWeekDate,
                routerLink: '/weekly-quiz'
            },
            {
                label: "Last Week's Quiz",
                imageUrl: '/assets/logos/logo.png',
                dateBadge: this.lastWeekDate,
                action: () => {
                    if (this.lastWeekQuizId != null) {
                        this.router.navigate(['/fiftyPlus/archives', this.lastWeekQuizId]);
                    } else {
                        this.router.navigate(['/fiftyPlus/archives']);
                    }
                }
            },
            {
                label: 'Full Archives',
                imageUrl: '/assets/logos/archivesLogo.png',
                routerLink: '/fiftyPlus/archives'
            },
            {
                label: 'Daily Games',
                icon: 'pi pi-th-large',
                iconSizeClass: 'text-6xl sm:text-8xl',
                disabled: true
            },
            {
                label: 'Your Stats',
                icon: 'pi pi-chart-bar',
                iconSizeClass: 'text-6xl sm:text-8xl',
                disabled: true
            }
        ];
    }
}
