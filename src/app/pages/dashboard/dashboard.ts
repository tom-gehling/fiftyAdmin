import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CommonModule, AsyncPipe, DatePipe } from '@angular/common';
import { StatsWidget } from './components/statswidget';
import { FiftyQuizzesDashboardComponent } from './components/fiftyquizzes';
import { RecentQuizzesWidget } from './components/userrecentquizzes';
import { VenueCalendarComponent } from './components/venuecalendar';
import { TagInvitesWidget } from './components/taginviteswidget';
import { AuthService } from '@/shared/services/auth.service';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { Quiz } from '@/shared/models/quiz.model';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, AsyncPipe, DatePipe, RouterModule, StatsWidget, FiftyQuizzesDashboardComponent, RecentQuizzesWidget, VenueCalendarComponent, TagInvitesWidget],
    template: `
        <div class="card px-1 py-3 sm:p-6 fifty-dashboard-lg rounded-none sm:rounded-2xl">
            <!-- Top band: free-user CTA / admin overview -->
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
                <app-stats-widget class="contents" *ngIf="auth.isAdmin$ | async" />
            </div>

            <!-- Greeting + quick access (capped at 800px, centered on xl+) -->
            <section class="mx-auto w-full xl:max-w-[800px] mt-6 sm:mt-10 mb-8 sm:mb-12">
                @if (auth.user$ | async; as user) {
                    @if (user.displayName) {
                        <h1 class="font-bold m-0 leading-tight" style="font-size: 72px;">{{ greeting }}, {{ user.displayName }}</h1>
                        <hr class="my-5 sm:my-7 border-0" style="border-top: 3px solid var(--fifty-neon-green);" />
                    }
                }

                <div class="grid grid-cols-4 gap-2 sm:gap-4 xl:gap-6">
                    <a routerLink="/weekly-quiz" class="quick-tile">
                        <div class="quick-tile-box">
                            <img src="/assets/logos/logo.png" alt="This Week's Quiz" />
                            @if (thisWeekDate) {
                                <span class="quick-tile-badge">{{ thisWeekDate | date: 'd MMM' }}</span>
                            }
                        </div>
                        <span class="quick-tile-label">This Week's Quiz</span>
                    </a>
                    <a [routerLink]="lastWeekRouterLink" class="quick-tile">
                        <div class="quick-tile-box">
                            <img src="/assets/logos/logo.png" alt="Last Week's Quiz" />
                            @if (lastWeekDate) {
                                <span class="quick-tile-badge">{{ lastWeekDate | date: 'd MMM' }}</span>
                            }
                        </div>
                        <span class="quick-tile-label">Last Week's Quiz</span>
                    </a>
                    <a routerLink="/fiftyPlus/archives" class="quick-tile">
                        <div class="quick-tile-box">
                            <img src="/assets/logos/archivesLogo.png" alt="Full Archives" />
                        </div>
                        <span class="quick-tile-label">Full Archives</span>
                    </a>
                    <a routerLink="/fiftyPlus/stats" class="quick-tile">
                        <div class="quick-tile-box">
                            <i class="pi pi-chart-bar"></i>
                        </div>
                        <span class="quick-tile-label">Stats Page</span>
                    </a>
                </div>
            </section>

            <!-- Lower widgets -->
            <div class="grid grid-cols-12 gap-3 sm:gap-8">
                <!-- TODO: Spotlight area — admin-curated highlight (a featured quiz, an upcoming event, merch drop, etc). Build component later. -->

                <div class="col-span-12 xl:col-span-6 flex flex-col gap-8">
                    <app-fifty-quizzes-dashboard />
                    <app-recent-quizzes-widget />
                </div>

                <div class="col-span-12 xl:col-span-6 flex flex-col gap-8">
                    <app-tag-invites-widget />    
                    <app-venue-calendar class="contents" />
                </div>
            </div>
        </div>
    `,
    styles: [
        `
            .quick-tile {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-decoration: none;
                cursor: pointer;
                transition: transform 0.15s ease;
            }
            .quick-tile:hover {
                transform: scale(1.05);
            }
            .quick-tile-box {
                position: relative;
                width: 100%;
                aspect-ratio: 1 / 1;
                border-radius: 0.75rem;
                overflow: hidden;
                background: #000;
                border: 2px solid var(--fifty-neon-green);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
            }
            .quick-tile-box img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                padding: 0.4rem;
            }
            .quick-tile-box i {
                font-size: 1.75rem;
                color: var(--fifty-neon-green);
            }
            .quick-tile-badge {
                position: absolute;
                bottom: 0.25rem;
                right: 0.25rem;
                font-size: 0.55rem;
                font-weight: 700;
                padding: 0.1rem 0.35rem;
                border-radius: 999px;
                background: rgba(0, 0, 0, 0.75);
                color: var(--fifty-neon-green);
                border: 1px solid var(--fifty-neon-green);
                white-space: nowrap;
            }
            .quick-tile-label {
                margin-top: 0.5rem;
                font-size: 0.7rem;
                font-weight: 600;
                text-align: center;
                line-height: 1.2;
            }
            @media (min-width: 640px) {
                .quick-tile-box {
                    border-radius: 1rem;
                    border-width: 3px;
                }
                .quick-tile-box img {
                    padding: 0.5rem;
                }
                .quick-tile-box i {
                    font-size: 3rem;
                }
                .quick-tile-badge {
                    font-size: 0.65rem;
                    bottom: 0.4rem;
                    right: 0.4rem;
                    padding: 0.15rem 0.5rem;
                }
                .quick-tile-label {
                    font-size: 0.875rem;
                    margin-top: 0.75rem;
                }
            }
            @media (min-width: 1280px) {
                .quick-tile-box i {
                    font-size: 4rem;
                }
                .quick-tile-badge {
                    font-size: 0.7rem;
                    bottom: 0.6rem;
                    right: 0.6rem;
                }
                .quick-tile-label {
                    font-size: 1rem;
                    margin-top: 0.85rem;
                }
            }
        `
    ]
})
export class Dashboard implements OnInit, OnDestroy {
    private sub = new Subscription();
    private quizzesService = inject(QuizzesService);

    private readonly greetings = ['Hi', 'Hey', 'Welcome back', "G'day", 'Good to see you', 'Hiya'];
    greeting = this.greetings[Math.floor(Math.random() * this.greetings.length)];

    lastWeekRouterLink: any[] = ['/fiftyPlus/archives'];
    thisWeekDate: Date | null = null;
    lastWeekDate: Date | null = null;

    constructor(public auth: AuthService) {}

    ngOnInit() {
        this.sub.add(
            this.quizzesService.getActiveQuiz().subscribe((quiz) => {
                this.thisWeekDate = this.toDate(quiz?.deploymentDate);
            })
        );

        this.sub.add(
            this.quizzesService.getArchiveQuizzes().subscribe((archives: Quiz[]) => {
                const lastWeek = archives?.[0];
                if (lastWeek?.quizId != null) {
                    this.lastWeekRouterLink = ['/fiftyPlus/archives', lastWeek.quizId];
                }
                this.lastWeekDate = this.toDate(lastWeek?.deploymentDate);
            })
        );
    }

    private toDate(value: any): Date | null {
        if (!value) return null;
        if (value instanceof Date) return value;
        if (typeof value.toDate === 'function') return value.toDate();
        return null;
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }
}
