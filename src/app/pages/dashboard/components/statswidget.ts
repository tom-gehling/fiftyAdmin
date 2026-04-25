import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { Quiz } from '@/shared/models/quiz.model';
import { firstValueFrom } from 'rxjs';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';
import { Timestamp } from 'firebase/firestore';
import { QuizStatsService } from '@/shared/services/quiz-stats.service';
import { UserService } from '@/shared/services/user.service';
import { VenueService } from '@/shared/services/venue.service';

@Component({
    standalone: true,
    selector: 'app-stats-widget',
    imports: [CommonModule, RouterModule],
    template: `
        <!-- Active Weekly Quiz -->
        <div class="col-span-6 sm:col-span-6 xl:col-span-3 min-w-0">
            <a routerLink="/fiftyPlus/admin/quizzes" class="block no-underline h-full">
                <div class="card mb-0 h-full flex flex-col justify-between p-3 sm:p-4 fiftyBorder relative transition-transform hover:scale-[1.02] cursor-pointer" style="background: rgb(40, 40, 40); border-radius: 1rem;">
                    <ng-container *ngIf="!loadingActiveQuiz; else loadingSpinner">
                        <div>
                            <span class="block text-white font-bold mb-1 sm:mb-2 text-xs sm:text-lg uppercase">Active Weekly Quiz</span>
                            <div class="font-black text-2xl sm:text-5xl" style="color: var(--fifty-pink);">
                                {{ activeQuiz?.quizTitle || activeQuiz?.quizId }}
                            </div>
                        </div>
                        <div class="mt-2 sm:mt-4 text-white text-xs sm:text-base font-bold">Deployment: {{ getDeploymentDate(activeQuiz?.deploymentDate) | date: 'mediumDate' }}</div>
                    </ng-container>
                </div>
            </a>
        </div>

        <!-- Next Weekly Quiz Status -->
        <div class="col-span-6 sm:col-span-6 xl:col-span-3 min-w-0">
            <a routerLink="/fiftyPlus/admin/quizzes" class="block no-underline h-full">
                <div class="card mb-0 h-full flex flex-col justify-between p-3 sm:p-4 fiftyBorder relative transition-transform hover:scale-[1.02] cursor-pointer" style="background: rgb(40, 40, 40); border-radius: 1rem;">
                    <ng-container *ngIf="!loadingNextQuiz; else loadingSpinner">
                        <div>
                            <span class="block text-white font-bold mb-1 sm:mb-2 text-xs sm:text-lg uppercase">Next Quiz Status</span>
                            <div class="flex flex-wrap gap-2 sm:gap-3 items-center">
                                <div class="text-2xl sm:text-5xl font-bold mt-1 sm:mt-2 break-words" style="color: var(--fifty-pink);">
                                    {{ nextQuizReady === null ? 'Yet to be created' : nextQuizReady ? 'Ready' : 'In Progress' }}
                                </div>
                                <div class="w-4 h-4 sm:w-6 sm:h-6 shrink-0 flex items-center justify-center rounded-full border-2 border-green-500" [class.bg-green-500]="nextQuizReady" *ngIf="nextQuizReady !== null">
                                    <i *ngIf="nextQuizReady" class="pi pi-check text-white text-xs sm:text-sm"></i>
                                </div>
                            </div>
                        </div>
                        <div class="mt-2 sm:mt-4 text-white text-xs sm:text-base font-bold" *ngIf="nextDeployment">Due to Deploy: {{ nextDeployment | date: 'h:mm a - MMM d' }}</div>
                    </ng-container>
                </div>
            </a>
        </div>

        <!-- Active Venues -->
        <div class="col-span-6 sm:col-span-6 xl:col-span-3 min-w-0">
            <a routerLink="/fiftyPlus/admin/venues" class="block no-underline h-full">
                <div class="card mb-0 h-full flex flex-col justify-between p-3 sm:p-4 fiftyBorder relative transition-transform hover:scale-[1.02] cursor-pointer" style="background: rgb(40, 40, 40); border-radius: 1rem;">
                    <ng-container *ngIf="!loadingVenues; else loadingSpinner">
                        <div class="flex justify-between items-center">
                            <div>
                                <span class="block text-white font-bold mb-1 sm:mb-2 text-xs sm:text-lg uppercase">Active Venues</span>
                                <div class="font-black text-2xl sm:text-5xl" style="color: var(--fifty-pink);">
                                    {{ activeVenueCount }}
                                </div>
                            </div>
                        </div>
                        <div class="mt-2 sm:mt-4 text-white text-xs sm:text-base font-bold">{{ newVenuesLast7Days >= 0 ? '+' : '' }}{{ newVenuesLast7Days }} in last 7 days</div>
                    </ng-container>
                </div>
            </a>
        </div>

        <!-- Member Count -->
        <div class="col-span-6 sm:col-span-6 xl:col-span-3 min-w-0">
            <a routerLink="/fiftyPlus/admin/users" class="block no-underline h-full">
                <div class="card mb-0 h-full flex flex-col justify-between p-3 sm:p-4 fiftyBorder relative transition-transform hover:scale-[1.02] cursor-pointer" style="background: rgb(40, 40, 40); border-radius: 1rem;">
                    <ng-container *ngIf="!loadingMembers; else loadingSpinner">
                        <div class="flex justify-between items-center">
                            <div>
                                <span class="block text-white font-bold mb-1 sm:mb-2 text-xs sm:text-lg uppercase">Fifty+ Members</span>
                                <div class="font-black text-2xl sm:text-5xl" style="color: var(--fifty-pink);">
                                    {{ memberCount }}
                                </div>
                            </div>
                            <div class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-border w-7 h-7 sm:w-10 sm:h-10">
                                <i class="pi pi-users text-cyan-500 text-sm! sm:text-xl!"></i>
                            </div>
                        </div>
                        <div class="mt-2 sm:mt-4 text-white text-xs sm:text-base font-bold">{{ newMembersLast7Days >= 0 ? '+' : '' }}{{ newMembersLast7Days }} in last 7 days</div>
                    </ng-container>
                </div>
            </a>
        </div>

        <!-- Admin Quick Links -->
        <div class="col-span-12">
            <div class="card mb-0 p-4 fiftyBorder flex flex-wrap items-center gap-2" style="background: rgb(40, 40, 40); border-radius: 1rem;">
                <span class="text-white font-bold uppercase text-sm mr-2">Admin</span>
                <a
                    routerLink="/fiftyPlus/admin/stats/weekly"
                    class="inline-flex items-center gap-2 py-1.5 px-3 rounded-full text-sm font-medium no-underline transition-opacity hover:opacity-80"
                    style="background: rgba(76, 251, 171, 0.15); color: var(--fifty-neon-green); border: 1px solid var(--fifty-neon-green);"
                >
                    <i class="pi pi-chart-line text-xs"></i>
                    <span>Quiz Stats</span>
                </a>
                <a
                    routerLink="/fiftyPlus/admin/stats/total"
                    class="inline-flex items-center gap-2 py-1.5 px-3 rounded-full text-sm font-medium no-underline transition-opacity hover:opacity-80"
                    style="background: rgba(76, 251, 171, 0.15); color: var(--fifty-neon-green); border: 1px solid var(--fifty-neon-green);"
                >
                    <i class="pi pi-chart-line text-xs"></i>
                    <span>Location Stats</span>
                </a>
                <a
                    routerLink="/fiftyPlus/admin/quizTags"
                    class="inline-flex items-center gap-2 py-1.5 px-3 rounded-full text-sm font-medium no-underline transition-opacity hover:opacity-80"
                    style="background: rgba(76, 251, 171, 0.15); color: var(--fifty-neon-green); border: 1px solid var(--fifty-neon-green);"
                >
                    <i class="pi pi-tags text-xs"></i>
                    <span>Quiz Tags</span>
                </a>
                <a
                    routerLink="/fiftyPlus/admin/submissionForms"
                    class="inline-flex items-center gap-2 py-1.5 px-3 rounded-full text-sm font-medium no-underline transition-opacity hover:opacity-80"
                    style="background: rgba(76, 251, 171, 0.15); color: var(--fifty-neon-green); border: 1px solid var(--fifty-neon-green);"
                >
                    <i class="pi pi-file-edit text-xs"></i>
                    <span>Submission Forms</span>
                </a>
                <a
                    routerLink="/fiftyPlus/admin/contactForms"
                    class="inline-flex items-center gap-2 py-1.5 px-3 rounded-full text-sm font-medium no-underline transition-opacity hover:opacity-80"
                    style="background: rgba(76, 251, 171, 0.15); color: var(--fifty-neon-green); border: 1px solid var(--fifty-neon-green);"
                >
                    <i class="pi pi-envelope text-xs"></i>
                    <span>Contact Forms</span>
                </a>
            </div>
        </div>

        <!-- Spinner Template -->
        <ng-template #loadingSpinner>
            <div class="flex justify-center items-center h-full">
                <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
            </div>
        </ng-template>
    `
})
export class StatsWidget implements OnInit {
    private quizzesService = inject(QuizzesService);
    private quizStatsService = inject(QuizStatsService);
    private userService = inject(UserService);
    private venueService = inject(VenueService);

    activeQuiz: Quiz | null = null;
    nextQuizReady: boolean | null = null;
    nextDeployment: Date | null = null;

    totalSessions = 0;
    averageScore = 0;

    memberCount = 0;
    newMembersLast7Days = 0;

    activeVenueCount = 0;
    newVenuesLast7Days = 0;

    // Loading flags
    loadingActiveQuiz = true;
    loadingNextQuiz = true;
    loadingStats = true;
    loadingMembers = true;
    loadingVenues = true;
    refreshing = false;

    async ngOnInit() {
        // Load Active Quiz first — required before stats
        await this.loadActiveQuiz();

        // Then load dependent data
        await Promise.all([this.loadNextQuizStatus(), this.loadQuizStats(), this.loadMembers(), this.loadVenues()]);
    }

    async loadVenues() {
        this.loadingVenues = true;
        try {
            const venues = await firstValueFrom(this.venueService.getActiveVenues());
            this.activeVenueCount = venues.length;
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            this.newVenuesLast7Days = venues.filter((v) => {
                if (!v.createdAt) return false;
                const created = v.createdAt instanceof Date ? v.createdAt : (v.createdAt as any).toDate?.();
                return created && created >= sevenDaysAgo;
            }).length;
        } catch (error) {
            console.error('Error loading venues:', error);
        } finally {
            this.loadingVenues = false;
        }
    }

    getDeploymentDate(date: Date | any) {
        if (!date) return null;
        return date instanceof Date ? date : date.toDate?.();
    }

    async loadActiveQuiz() {
        this.loadingActiveQuiz = true;
        try {
            this.activeQuiz = (await firstValueFrom(this.quizzesService.getActiveQuiz())) || null;
        } finally {
            this.loadingActiveQuiz = false;
        }
    }

    async loadNextQuizStatus() {
        this.loadingNextQuiz = true;
        try {
            const now = new Date();
            const quizzes = await firstValueFrom(this.quizzesService.getAllQuizzes());

            const futureQuizzes = quizzes
                .filter((q): q is Quiz & { deploymentDate: Date | Timestamp } => q.quizType === QuizTypeEnum.Weekly && !!q.deploymentDate)
                .map((q) => ({
                    ...q,
                    deploymentDate: q.deploymentDate instanceof Date ? q.deploymentDate : q.deploymentDate.toDate()
                }))
                .filter((q) => q.deploymentDate > now)
                .sort((a, b) => a.deploymentDate.getTime() - b.deploymentDate.getTime());

            const nextQuiz = futureQuizzes[0];

            if (!nextQuiz) {
                this.nextQuizReady = null;
                this.nextDeployment = null;
            } else {
                this.nextQuizReady = !!nextQuiz.questions?.length;
                this.nextDeployment = nextQuiz.deploymentDate;
            }
        } finally {
            this.loadingNextQuiz = false;
        }
    }

    async loadQuizStats() {
        this.loadingStats = true;
        try {
            if (!this.activeQuiz?.quizId) return;
            const aggregate = await this.quizStatsService.getQuizAggregatesFirestore(String(this.activeQuiz.quizId));
            if (aggregate) {
                this.totalSessions = (aggregate.completedCount || 0) + (aggregate.inProgressCount || 0);
                this.averageScore = aggregate.averageScore || 0;
            }
        } catch (error) {
            console.error('Error loading quiz stats:', error);
        } finally {
            this.loadingStats = false;
        }
    }

    async loadMembers() {
        this.loadingMembers = true;
        try {
            const users = await this.userService.getAllUsers();
            this.memberCount = users.length;
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            this.newMembersLast7Days = users.filter((u) => {
                if (!u.createdAt) return false;
                const created = u.createdAt instanceof Date ? u.createdAt : u.createdAt.toDate?.();
                return created && created >= sevenDaysAgo;
            }).length;
        } catch (error) {
            console.error('Error loading user count:', error);
        } finally {
            this.loadingMembers = false;
        }
    }

    async refreshStats() {
        this.refreshing = true;
        await this.loadQuizStats();
        this.refreshing = false;
    }
}
