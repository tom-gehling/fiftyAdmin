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
import { UserQuizHistoryWidget } from "./components/userquizhistory";
import { UserSummaryWidget } from "./components/usersummary";
import { RecentQuizzesWidget } from "./components/userrecentquizzes";
import { VenueCalendarComponent } from "./components/venuecalendar";

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, StatsWidget, BestSellingWidget, MembershipReportWidget, NotificationsWidget, SubmissionsWallWidget, AsyncPipe, FiftyQuizzesDashboardComponent, QuizStatsWidgetComponent, UserQuizHistoryWidget, UserSummaryWidget, RecentQuizzesWidget, VenueCalendarComponent, RouterModule],
    template: `
        <div class="grid grid-cols-12 gap-8">
            @if (!(auth.isMember$ | async) && !(auth.isAdmin$ | async)) {
                <div class="col-span-12">
                    <a routerLink="/join" class="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-xl font-bold text-xl cursor-pointer no-underline transition-opacity hover:opacity-90" style="background: var(--accent-green); color: var(--accent-green-contrast)">
                        <i class="pi pi-star text-2xl"></i>
                        Become A Fifty+ Member
                    </a>
                </div>
            }
            <!-- Only show stats widget for admins -->
            <app-stats-widget class="contents" *ngIf="auth.isAdmin$ | async" />
            <div class="col-span-12 xl:col-span-6 flex flex-col gap-8">
                <app-user-summary-widget *ngIf="auth.isMember$ | async"/>
                <app-fifty-quizzes-dashboard />
                <!-- <app-quiz-stats-widget *ngIf="auth.isMember$ | async" /> -->
                <app-user-quiz-history-widget *ngIf="auth.isMember$ | async" />
            </div>

            <div class="col-span-12 xl:col-span-6 flex flex-col gap-8">
                <app-venue-calendar class="contents" />
                <app-submissions-wall-widget />
                <!-- <app-membership-report-widget *ngIf="auth.isAdmin$ | async" /> -->
                <!-- <app-notifications-widget /> -->
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
