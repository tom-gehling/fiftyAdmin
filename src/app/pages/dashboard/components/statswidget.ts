import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { Quiz } from '@/shared/models/quiz.model';
import { firstValueFrom } from 'rxjs';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';
import { Timestamp } from 'firebase/firestore';
import { QuizStatsService } from '@/shared/services/quiz-stats.service';

@Component({
  standalone: true,
  selector: 'app-stats-widget',
  imports: [CommonModule],
  template: `
    <!-- Active Weekly Quiz -->
    <div class="col-span-6 lg:col-span-6 xl:col-span-3">
      <div class="card mb-0 h-full flex flex-col justify-between p-4 fiftyBorder relative">
        <ng-container *ngIf="!loadingActiveQuiz; else loadingSpinner">
          <div>
            <span class="block text-muted-color font-medium mb-2">Active Weekly Quiz</span>
            <div class="text-surface-900 dark:text-surface-0 font-semibold text-xl">
              #{{ activeQuiz?.quizTitle || activeQuiz?.quizId }}
            </div>
          </div>
          <div class="mt-4 text-muted-color text-sm">
            Deployment: {{ getDeploymentDate(activeQuiz?.deploymentDate) | date:'mediumDate' }}
          </div>
        </ng-container>
      </div>
    </div>

    <!-- Next Weekly Quiz Status -->
    <div class="col-span-6 lg:col-span-6 xl:col-span-3">
      <div class="card mb-0 h-full flex flex-col justify-between p-4 fiftyBorder relative">
        <ng-container *ngIf="!loadingNextQuiz; else loadingSpinner">
          <div>
            <span class="block text-muted-color font-medium mb-2">Next Weekly Quiz Status</span>
            <div class="inline-flex gap-3">
              <div class="text-surface-900 dark:text-surface-0 font-semibold text-xl mt-2">
                {{ nextQuizReady === null ? 'Yet to be created' : (nextQuizReady ? 'Ready' : 'In Progress') }}
              </div>
              <div 
                class="w-6 h-6 flex items-center justify-center rounded-full border-2 border-green-500"
                [class.bg-green-500]="nextQuizReady"
                *ngIf="nextQuizReady !== null"
              >
                <i *ngIf="nextQuizReady" class="pi pi-check text-white text-sm"></i>
              </div>
            </div>
          </div>
          <div class="mt-4 text-muted-color text-sm" *ngIf="nextDeployment">
            Due to Deploy: {{ nextDeployment | date:'mediumDate' }}
          </div>
        </ng-container>
      </div>
    </div>

    <!-- Quiz Sessions -->
    <div class="col-span-6 lg:col-span-6 xl:col-span-3">
      <div class="card mb-0 h-full flex flex-col justify-between p-4 fiftyBorder relative">
        <ng-container *ngIf="!loadingStats; else loadingSpinner">
          <div class="flex justify-between items-center">
            <div>
              <span class="block text-muted-color font-medium mb-2">
                #{{ activeQuiz?.quizTitle || activeQuiz?.quizId }} Completed Sessions
              </span>
              <div class="text-surface-900 dark:text-surface-0 font-semibold text-xl">
                {{ totalSessions }}
              </div>
            </div>

          </div>
          <div class="flex justify-between items-center">
          <div class="mt-4 text-muted-color text-sm">
            Avg Score: {{ (averageScore * 50) | number:'1.2-2' }}
          </div>
          <button
              class="flex items-center justify-center text-fifty-neon-green hover:opacity-80 transition-opacity"
              (click)="refreshStats()"
              [disabled]="refreshing"
              title="Refresh Stats"
            >
              <i
                class="pi text-xl"
                [ngClass]="refreshing ? 'pi-spin pi-spinner' : 'pi-refresh'"
              ></i>
            </button>
</div>
        </ng-container>
      </div>
    </div>

    <!-- Member Count -->
    <div class="col-span-6 lg:col-span-6 xl:col-span-3">
      <div class="card mb-0 h-full flex flex-col justify-between p-4 fiftyBorder relative">
        <ng-container *ngIf="!loadingMembers; else loadingSpinner">
          <div class="flex justify-between items-center">
            <div>
              <span class="block text-muted-color font-medium mb-2">Fifty+ Member Count</span>
              <div class="text-surface-900 dark:text-surface-0 font-semibold text-xl">
                {{ memberCount }}
              </div>
            </div>
            <div
              class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-border"
              style="width: 2.5rem; height: 2.5rem"
            >
              <i class="pi pi-users text-cyan-500 text-xl!"></i>
            </div>
          </div>
          <div class="mt-4">
            <span class="text-primary font-medium">{{ memberIncrease }}%</span>
            <span class="text-muted-color"> since last week</span>
          </div>
        </ng-container>
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

  activeQuiz: Quiz | null = null;
  nextQuizReady: boolean | null = null;
  nextDeployment: Date | null = null;

  totalSessions = 0;
  averageScore = 0;

  memberCount = 0;
  memberIncrease = 0;

  // Loading flags
  loadingActiveQuiz = true;
  loadingNextQuiz = true;
  loadingStats = true;
  loadingMembers = true;
  refreshing = false;

  async ngOnInit() {
    // Load Active Quiz first — required before stats
    await this.loadActiveQuiz();

    // Then load dependent data
    await Promise.all([
      this.loadNextQuizStatus(),
      this.loadQuizStats(),
      this.loadMembers()
    ]);
  }

  getDeploymentDate(date: Date | any) {
    if (!date) return null;
    return date instanceof Date ? date : date.toDate?.();
  }

  async loadActiveQuiz() {
    this.loadingActiveQuiz = true;
    try {
      this.activeQuiz = await firstValueFrom(this.quizzesService.getActiveQuiz()) || null;
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
        .filter((q): q is Quiz & { deploymentDate: Date | Timestamp } =>
          q.quizType === QuizTypeEnum.Weekly && !!q.deploymentDate
        )
        .map(q => ({
          ...q,
          deploymentDate: q.deploymentDate instanceof Date ? q.deploymentDate : q.deploymentDate.toDate()
        }))
        .filter(q => q.deploymentDate > now)
        .sort((a, b) => a.deploymentDate.getTime() - b.deploymentDate.getTime());

      const nextQuiz = futureQuizzes[0];

      if (!nextQuiz) {
        this.nextQuizReady = null;
        this.nextDeployment = null;
      } else {
        this.nextQuizReady = !!(nextQuiz.questions?.length);
        this.nextDeployment = nextQuiz.deploymentDate;
      }
    } finally {
      this.loadingNextQuiz = false;
    }
  }

  async loadQuizStats() {
    this.loadingStats = true;
    try {
      // Wait until we have an active quiz
      if (!this.activeQuiz?.quizId) return;
      const stats = await this.quizStatsService.getQuizTotalStats(String(this.activeQuiz.quizId));
      this.totalSessions = stats?.totalSessions ?? 0;
      this.averageScore = this.averageScore = stats?.averageScore ?? 0;
    } catch (error) {
      console.error('Error loading quiz stats:', error);
    } finally {
      this.loadingStats = false;
    }
  }

  async loadMembers() {
    this.loadingMembers = true;
    try {
      // simulate async fetch
      await new Promise(r => setTimeout(r, 500));
      this.memberCount = Math.floor(Math.random() * (4000 - 2000 + 1)) + 2000;
      this.memberIncrease = Math.floor(Math.random() * (20 - 1 + 1)) + 1;
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
