import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
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
import { UserQuizHistoryWidget } from "./components/userquizhistory";
import { UserSummaryWidget } from "./components/usersummary";
import { MembershipService, MembershipTier } from '@/shared/services/membership.service';
import { RecentQuizzesWidget } from "./components/userrecentquizzes";
import { VenueCalendarComponent } from "./components/venuecalendar";

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, StatsWidget, BestSellingWidget, MembershipReportWidget, NotificationsWidget, SubmissionsWallWidget, AsyncPipe, FiftyQuizzesDashboardComponent, QuizStatsWidgetComponent, UserQuizHistoryWidget, UserSummaryWidget, RecentQuizzesWidget, VenueCalendarComponent],
    template: `
        <div class="grid grid-cols-12 gap-8">
            <!-- [x]: fiftyBorder to all widgets -->
            <!-- Only show stats widget if user is NOT admin -->
            <app-stats-widget class="contents" *ngIf="(auth.isAdmin$ | async) && membershipTier == MembershipTier.Admin" />
            <!-- [x]: widget with dataview for all quiz score history-->
            <div class="col-span-12 xl:col-span-6 flex flex-col gap-8">
                <app-user-summary-widget />
                <app-fifty-quizzes-dashboard />
                <!-- <app-quiz-stats-widget *ngIf="membershipTier != MembershipTier.Fifty" /> -->
                <app-user-quiz-history-widget *ngIf="membershipTier != MembershipTier.Fifty" />
                <!-- <app-best-selling-widget /> -->
            </div>

            <div class="col-span-12 xl:col-span-6 flex flex-col gap-8">
                <app-venue-calendar class="contents" />


                <app-submissions-wall-widget />
                <!-- <app-membership-report-widget *ngIf="(auth.isAdmin$ | async) && membershipTier == MembershipTier.Admin" /> -->
                <!-- <app-notifications-widget /> -->
            </div>

            
        </div>
    `
})
export class Dashboard implements OnDestroy {
    membershipTier: MembershipTier = MembershipTier.FiftyGold;
    MembershipTier = MembershipTier;
    private sub = new Subscription();
    constructor(public auth: AuthService, private membershipService: MembershipService) {}
    ngOnInit() {
        this.sub.add(this.membershipService.membership$.subscribe(tier => this.membershipTier = tier));
    }
    ngOnDestroy() {
        this.sub.unsubscribe();
    }
}