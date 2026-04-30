import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { firstValueFrom } from 'rxjs';
import { QuizResultsService } from '@/shared/services/quiz-result.service';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { AuthService } from '@/shared/services/auth.service';
import { QuizResult } from '@/shared/models/quizResult.model';
import { Quiz } from '@/shared/models/quiz.model';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { getQuizTypeStyle, QuizTypeStyle } from '@/shared/constants/quiz-type-styles';

interface RecentQuiz {
    quizId: string;
    quizTitle: string;
    totalQuestions: number;
    score: number;
    completionPercentage: number;
    teamBadge?: string;
    routerLink: any[];
    style: QuizTypeStyle;
}

@Component({
    standalone: true,
    selector: 'app-recent-quizzes-widget',
    imports: [CommonModule, RouterModule, ButtonModule, ProgressSpinnerModule],
    template: `
        @if (loading || recentQuizzes.length > 0) {
            <div class="card p-4 sm:p-6 fiftyBorder" style="background: rgb(40, 40, 40); border-radius: 1rem;">
                <h3 class="text-2xl font-bold text-surface-900 dark:text-surface-0 m-0 mb-5">Recent Quizzes</h3>

                @if (loading) {
                    <div class="flex justify-center items-center h-32">
                        <p-progressSpinner styleClass="w-12 h-12" strokeWidth="2"></p-progressSpinner>
                    </div>
                } @else {
                    <div class="flex flex-col gap-3">
                        @for (quiz of recentQuizzes; track quiz.quizId) {
                            <a [routerLink]="quiz.routerLink" class="quiz-card" [style.--type-accent]="quiz.style.accent" [style.--type-chip]="quiz.style.chip" [style.--type-glow]="quiz.style.glow">
                                <div class="flex flex-col min-w-0 flex-1 mr-3">
                                    <span class="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full self-start mb-1.5" [style.background]="quiz.style.chip" [style.color]="quiz.style.accent">
                                        <i class="pi" [class]="quiz.style.icon" style="font-size: 0.7rem;"></i>
                                        {{ quiz.style.badge }}
                                    </span>
                                    <span class="font-semibold text-surface-900 dark:text-surface-0 truncate">{{ quiz.quizTitle }}</span>
                                    @if (quiz.teamBadge) {
                                        <span class="mt-1.5 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full self-start" style="background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.1);">
                                            <i class="pi pi-users text-[10px]"></i> {{ quiz.teamBadge }}
                                        </span>
                                    }
                                </div>
                                <div class="flex items-center gap-3 flex-shrink-0">
                                    <span class="text-lg font-bold" [style.color]="quiz.style.accent">{{ quiz.score }} <span class="text-sm font-medium text-muted-color">/ {{ quiz.totalQuestions }}</span></span>
                                    <i class="pi pi-arrow-right text-sm text-muted-color"></i>
                                </div>
                            </a>
                        }
                    </div>
                }
            </div>
        }
    `,
    styles: [
        `
            .quiz-card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.85rem 1rem;
                border-radius: 0.75rem;
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.06);
                text-decoration: none;
                cursor: pointer;
                transition:
                    background-color 0.18s ease,
                    transform 0.18s ease,
                    border-color 0.18s ease,
                    box-shadow 0.18s ease;
            }
            .quiz-card:hover {
                background: rgba(255, 255, 255, 0.09);
                border-color: var(--type-accent, rgba(76, 251, 171, 0.35));
                transform: translateY(-2px);
                box-shadow:
                    0 6px 16px rgba(0, 0, 0, 0.25),
                    inset 0 0 24px var(--type-glow, transparent);
            }
        `
    ]
})
export class RecentQuizzesWidget implements OnInit {
    recentQuizzes: RecentQuiz[] = [];
    loading = true;

    constructor(
        private quizResultService: QuizResultsService,
        private quizzesService: QuizzesService,
        private auth: AuthService
    ) {}

    async ngOnInit() {
        await this.loadRecentQuizzes();
    }

    private async loadRecentQuizzes() {
        this.loading = true;

        this.auth.user$.subscribe(async (user) => {
            if (!user?.uid) {
                this.recentQuizzes = [];
                this.loading = false;
                return;
            }

            const [ownResults, taggedInResults] = await Promise.all([firstValueFrom(this.quizResultService.getUserResults(user.uid)), firstValueFrom(this.quizResultService.getTaggedInResults(user.uid))]);

            const merged: { result: QuizResult; teamBadge?: string }[] = [];

            for (const r of ownResults) {
                if (r.status !== 'completed' || r.userHidden) continue;
                const acceptedTeammates = (r.taggedUsers ?? []).filter((t) => !t.status || t.status === 'accepted');
                const teamBadge = acceptedTeammates.length > 0 ? `Played with ${acceptedTeammates.map((t) => '@' + t.displayName).join(', ')}` : undefined;
                merged.push({ result: r, teamBadge });
            }

            for (const r of taggedInResults) {
                if (r.status !== 'completed' || r.userHidden) continue;
                if (r.userId === user.uid) continue;
                merged.push({ result: r, teamBadge: 'Played as a team' });
            }

            if (!merged.length) {
                this.recentQuizzes = [];
                this.loading = false;
                return;
            }

            const getTime = (d: any) => {
                if (!d) return 0;
                if ('toMillis' in d) return d.toMillis();
                if (d instanceof Date) return d.getTime();
                return 0;
            };

            const sorted = merged.sort((a, b) => getTime(b.result.completedAt) - getTime(a.result.completedAt)).slice(0, 5);

            const recentQuizzes: RecentQuiz[] = [];

            for (const { result: r, teamBadge } of sorted) {
                const quiz: Quiz | undefined = await firstValueFrom(this.quizzesService.getQuizByQuizId(r.quizId.toString()));

                const totalQuestions = r.total || quiz?.questions?.length || 0;
                const score = r.score ?? 0;
                const completionPercentage = totalQuestions > 0 ? Math.min(100, Math.round((score / totalQuestions) * 100)) : 0;
                const quizId = String(r.quizId);

                recentQuizzes.push({
                    quizId,
                    quizTitle: quiz?.quizTitle ?? 'Untitled Quiz',
                    totalQuestions,
                    score,
                    completionPercentage,
                    teamBadge,
                    routerLink: this.getQuizRouterLink(quiz?.quizType, quizId),
                    style: getQuizTypeStyle(quiz?.quizType)
                });
            }

            this.recentQuizzes = recentQuizzes;
            this.loading = false;
        });
    }

    private getQuizRouterLink(type: number | undefined, quizId: string): any[] {
        switch (type) {
            case 2:
                return ['/fiftyPlus/exclusives', quizId];
            case 3:
                return ['/fiftyPlus/collabs', quizId];
            case 4:
                return ['/fiftyPlus/questionQuizzes', quizId];
            default:
                return ['/fiftyPlus/archives', quizId];
        }
    }
}
