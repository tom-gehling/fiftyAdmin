import { Component, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationsWidget } from './components/notificationswidget';
import { StatsWidget } from './components/statswidget';
import { BestSellingWidget } from './components/bestsellingwidget';
import { MembershipReportWidget } from './components/membershipreport';
import { SubmissionsWallWidget } from './components/submissionwallwidget';
import { AuthService } from '@/shared/services/auth.service';
import { CommonModule } from '@angular/common';
import { AsyncPipe } from '@angular/common';
import { FiftyQuizzesDashboardComponent } from './components/fiftyquizzes';
import { QuizStatsWidgetComponent } from './components/quizstatswidget';
import { UserQuizHistoryWidget } from './components/userquizhistory';
import { UserSummaryWidget } from './components/usersummary';
import { RecentQuizzesWidget } from './components/userrecentquizzes';
import { VenueCalendarComponent } from './components/venuecalendar';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        StatsWidget,
        BestSellingWidget,
        MembershipReportWidget,
        NotificationsWidget,
        SubmissionsWallWidget,
        AsyncPipe,
        FiftyQuizzesDashboardComponent,
        QuizStatsWidgetComponent,
        UserQuizHistoryWidget,
        UserSummaryWidget,
        RecentQuizzesWidget,
        VenueCalendarComponent,
        RouterModule
    ],
    template: `
        <div class="card px-1 py-3 sm:p-6 fifty-dashboard-lg rounded-none sm:rounded-2xl">
            <div class="grid grid-cols-12 gap-3 sm:gap-8">
                @if (!(auth.isMember$ | async) && !(auth.isAdmin$ | async)) {
                    <div class="col-span-12">
                        <a
                            routerLink="/join"
                            class="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-xl font-bold text-xl cursor-pointer no-underline transition-opacity hover:opacity-90"
                            style="background: var(--accent-green); color: var(--accent-green-contrast)"
                        >
                            <i class="pi pi-star text-2xl"></i>
                            Become A Fifty+ Member
                        </a>
                    </div>
                }
                <!-- Only show stats widget for admins -->
                <app-stats-widget class="contents" *ngIf="auth.isAdmin$ | async" />
                <div class="col-span-12 xl:col-span-6 flex flex-col gap-8">
                    <app-user-summary-widget *ngIf="auth.isMember$ | async" />
                    <app-fifty-quizzes-dashboard />
                    <!-- <app-quiz-stats-widget *ngIf="auth.isMember$ | async" /> -->
                    <app-user-quiz-history-widget *ngIf="auth.isMember$ | async" />
                    <div class="card p-4 sm:p-6 fiftyBorder flex items-center justify-between gap-4 opacity-60 cursor-not-allowed select-none" style="background: rgb(40, 40, 40); border-radius: 1rem;">
                        <div class="flex items-center gap-4">
                            <div class="flex items-center justify-center rounded-full" style="width: 3rem; height: 3rem; background: rgba(76, 251, 171, 0.15); border: 1px solid var(--fifty-neon-green);">
                                <i class="pi pi-th-large text-2xl" style="color: var(--fifty-neon-green);"></i>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-xl font-semibold text-surface-900 dark:text-surface-0">Games</span>
                                <span class="text-sm text-gray-500 dark:text-gray-400">Coming soon</span>
                            </div>
                        </div>
                        <span class="text-xs uppercase font-bold px-3 py-1 rounded-full" style="background: rgba(255,255,255,0.08); color: var(--fifty-neon-green); border: 1px solid var(--fifty-neon-green);">Soon</span>
                    </div>
                </div>

                <div class="col-span-12 xl:col-span-6 flex flex-col gap-8">
                    <app-venue-calendar class="contents" />
                    <app-submissions-wall-widget />
                    <!-- <app-membership-report-widget *ngIf="auth.isAdmin$ | async" /> -->
                    <!-- <app-notifications-widget /> -->
                </div>
            </div>
        </div>
    `
})
export class Dashboard implements OnDestroy {
    private sub = new Subscription();
    constructor(public auth: AuthService) {}
    ngOnInit() {}
    ngOnDestroy() {
        this.sub.unsubscribe();
    }
}
