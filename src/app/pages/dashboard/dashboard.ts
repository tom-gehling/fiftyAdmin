import { Component } from '@angular/core';
import { NotificationsWidget } from './components/notificationswidget';
import { StatsWidget } from './components/statswidget';
import { RecentSalesWidget } from './components/recentsaleswidget';
import { BestSellingWidget } from './components/bestsellingwidget';
import { MembershipReportWidget } from './components/membershipreport';
import { SubmissionsWallWidget } from './components/submissionwallwidget';
import { AuthService } from '@/shared/services/auth.service';
import { CommonModule } from '@angular/common';
import { AsyncPipe } from '@angular/common';
import { FiftyQuizzesDashboardComponent } from './components/fiftyquizzes';
import { QuizStatsWidgetComponent } from './components/quizstatswidget';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, StatsWidget, BestSellingWidget, MembershipReportWidget, NotificationsWidget, SubmissionsWallWidget, AsyncPipe, FiftyQuizzesDashboardComponent, QuizStatsWidgetComponent],
    template: `
        <div class="grid grid-cols-12 gap-8">
            <!-- Only show stats widget if user is NOT admin -->
            <app-stats-widget class="contents" *ngIf="(auth.isAdmin$ | async)" />
            <!-- <app-fifty-quizzes-dashboard /> -->
            <!-- [ ]: get fifty + carousel created-->
            <!-- [ ]: widget for avg score graph across quizzes-->
            <!-- [ ]: widget for User stats: user name? quizzes completed, avg score, best score -->

            <div class="col-span-12 xl:col-span-6 flex flex-col gap-8">
                <app-submissions-wall-widget />
                <!-- [ ]: fix up height issue on mobile/ keep photos square -->
                <app-best-selling-widget />
            </div>

            <div class="col-span-12 xl:col-span-6 flex flex-col gap-8">
                <app-quiz-stats-widget />
                <app-membership-report-widget />
                <!-- <app-notifications-widget /> -->
            </div>
        </div>
    `
})
export class Dashboard {
    constructor(public auth: AuthService) {}
}
