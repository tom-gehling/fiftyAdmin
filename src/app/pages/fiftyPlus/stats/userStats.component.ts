import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from '@/shared/services/auth.service';
import { NotifyService } from '@/shared/services/notify.service';
import { StatsFixture, UserStatsService } from '@/shared/services/user-stats.service';
import { UserStatsResponse } from '@/shared/models/userStats.model';

import { HeroSummaryWidget } from './widgets/hero-summary.widget';
import { ImprovementCalloutWidget } from './widgets/improvement-callout.widget';
import { QuizTypeBreakdownWidget } from './widgets/quiz-type-breakdown.widget';
import { LoyaltyCardWidget } from './widgets/loyalty-card.widget';
import { TrajectoryChartWidget } from './widgets/trajectory-chart.widget';
import { QuizDeepDiveWidget } from './widgets/quiz-deep-dive.widget';
import { DailyGamesWidget } from './widgets/daily-games.widget';
import { CategoryStrengthsWidget } from './widgets/category-strengths.widget';
import { TimePatternsWidget } from './widgets/time-patterns.widget';
import { CompletionTimesWidget } from './widgets/completion-times.widget';
import { HighlightsWidget } from './widgets/highlights.widget';
import { LocalRankWidget } from './widgets/local-rank.widget';

@Component({
    standalone: true,
    selector: 'app-user-stats',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ProgressSpinnerModule,
        HeroSummaryWidget,
        ImprovementCalloutWidget,
        QuizTypeBreakdownWidget,
        LoyaltyCardWidget,
        TrajectoryChartWidget,
        QuizDeepDiveWidget,
        DailyGamesWidget,
        CategoryStrengthsWidget,
        TimePatternsWidget,
        CompletionTimesWidget,
        HighlightsWidget,
        LocalRankWidget
    ],
    template: `
        <div class="px-3 sm:px-6 py-4 sm:py-6 max-w-screen-xl mx-auto flex flex-col gap-6 sm:gap-8">
            @if (loading()) {
                <div class="flex items-center justify-center" style="min-height: 60vh;">
                    <p-progressSpinner strokeWidth="3" [style]="{ width: '48px', height: '48px' }"></p-progressSpinner>
                </div>
            }
            @if (!loading() && stats(); as data) {
                <app-stats-hero-summary [summary]="data.summary" [displayName]="displayName()"></app-stats-hero-summary>

                <!-- <app-stats-improvement-callout [improvement]="data.summary.improvement4wVsFirst4w"></app-stats-improvement-callout> -->

                <app-stats-quiz-type-breakdown [breakdown]="data.byQuizType"></app-stats-quiz-type-breakdown>

                <app-stats-trajectory-chart [history]="data.history"></app-stats-trajectory-chart>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                    <app-stats-loyalty-card [summary]="data.summary"></app-stats-loyalty-card>
                    <div class="lg:col-span-2">
                        <app-stats-category-strengths [categories]="data.categories"></app-stats-category-strengths>
                    </div>
                </div>

                <app-stats-quiz-deep-dive [quizzes]="data.deepDives"></app-stats-quiz-deep-dive>

                <app-stats-daily-games [dailyGames]="data.dailyGames"></app-stats-daily-games>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                        <app-stats-time-patterns [patterns]="data.timePatterns"></app-stats-time-patterns>
                        <app-stats-completion-times [patterns]="data.timePatterns"></app-stats-completion-times>
                    </div>
                    <app-stats-highlights [highlights]="data.highlights"></app-stats-highlights>
                </div>

                <app-stats-local-rank [localRank]="data.localRank"></app-stats-local-rank>

                <div class="text-center text-sm text-gray-500 pt-2">
                    Stats refresh every few minutes. Daily games stats arrive once Daily Games ships. Some questions don't have categories yet — they'll appear once tagged.
                </div>
            }
        </div>
    `
})
export class UserStatsComponent implements OnInit, OnDestroy {
    private auth = inject(AuthService);
    private statsService = inject(UserStatsService);
    private notify = inject(NotifyService);
    private route = inject(ActivatedRoute);

    loading = signal(true);
    stats = signal<UserStatsResponse | null>(null);
    displayName = signal<string>('quizzer');

    private sub = new Subscription();

    ngOnInit() {
        const fixture = this.readFixtureFromQuery();

        this.sub.add(
            this.auth.user$.subscribe((u) => {
                if (u) {
                    this.displayName.set(u.displayName || u.email?.split('@')[0] || 'quizzer');
                }
            })
        );

        this.sub.add(
            this.statsService.getMyStats(fixture).subscribe({
                next: (data) => {
                    this.stats.set(data);
                    this.loading.set(false);
                },
                error: (err) => {
                    console.error('Failed to load user stats', err);
                    this.notify.error('Could not load your stats — try refreshing.');
                    this.loading.set(false);
                }
            })
        );
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }

    private readFixtureFromQuery(): StatsFixture | null {
        const v = this.route.snapshot.queryParamMap.get('fixture');
        if (v === 'lowScorer' || v === 'newcomer' || v === 'realistic') return v;
        return null;
    }
}
