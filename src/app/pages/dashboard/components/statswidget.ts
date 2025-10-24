import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { Quiz } from '@/shared/models/quiz.model';
import { firstValueFrom } from 'rxjs';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { QuizStatsService } from '@/shared/services/quiz-stats.service';

@Component({
  standalone: true,
  selector: 'app-stats-widget',
  imports: [CommonModule],
  template: `
    <!-- Active Weekly Quiz -->
    <div class="col-span-6 lg:col-span-6 xl:col-span-3">
      <div class="card mb-0 h-full flex flex-col justify-between p-4 fiftyBorder">
        <div>
          <span class="block text-muted-color font-medium mb-2">Active Weekly Quiz</span>
          <div class="text-surface-900 dark:text-surface-0 font-semibold text-xl">
            #{{ activeQuiz?.quizTitle || activeQuiz?.quizId }}
          </div>
        </div>
        <div class="mt-4 text-muted-color text-sm">
          Deployment: {{ getDeploymentDate(activeQuiz?.deploymentDate) | date:'mediumDate' }}
        </div>
      </div>
    </div>

    <!-- Next Weekly Quiz Status -->
    <div class="col-span-6 lg:col-span-6 xl:col-span-3">
      <div class="card mb-0 h-full flex flex-col justify-between p-4 fiftyBorder">
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
      </div>
    </div>
    <!-- Quiz Sessions -->

    <div class="col-span-6 lg:col-span-6 xl:col-span-3">
      <div class="card mb-0 h-full flex flex-col justify-between p-4 fiftyBorder">
        <div>
          <span class="block text-muted-color font-medium mb-2">Active Quiz Sessions</span>
          <div class="text-surface-900 dark:text-surface-0 font-semibold text-xl">
            {{ totalSessions }}
          </div>
        </div>
        <div class="mt-4 text-muted-color text-sm">
          Average Score: {{ averageScore | number:'1.0-2' }}
        </div>
      </div>
    </div>
    <div class="col-span-6 lg:col-span-6 xl:col-span-3">
        <div class="card mb-0 h-full flex flex-col justify-between p-4 fiftyBorder">
            <div class="flex justify-between items-center">
                <div>
                    <span class="block text-muted-color font-medium mb-2">Fifty+ Member Count</span>
                    <div class="text-surface-900 dark:text-surface-0 font-semibold text-xl">{{ memberCount }}</div>
                </div>
                <div class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                    <i class="pi pi-users text-cyan-500 text-xl!"></i>
                </div>
            </div>
            <div class="mt-4">
                <span class="text-primary font-medium">{{ memberIncrease }}%</span>
                <span class="text-muted-color"> since last week</span>
            </div>
        </div>
    </div>
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
  memberCount = Math.floor(Math.random() * (4000 - 2000 + 1)) + 2000;
  memberIncrease = Math.floor(Math.random() * (1 - 20 + 1)) + 20;

  async ngOnInit() {
    this.activeQuiz = await firstValueFrom(this.quizzesService.getActiveQuiz()) || null;
    await this.loadNextQuizStatus();
    await this.loadQuizStats();
  }

  getDeploymentDate(date: Date | any) {
    if (!date) return null;
    return date instanceof Date ? date : date.toDate?.();
  }

  async loadNextQuizStatus() {
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
      return;
    }

    this.nextQuizReady = !!(nextQuiz.questions?.length);
    this.nextDeployment = nextQuiz.deploymentDate;
  }


async loadQuizStats() {
  if (!this.activeQuiz?.quizId) return;

  try {
    const stats = await this.quizStatsService.getQuizTotalStats(String(this.activeQuiz.quizId));


    // assign totalSessions and averageScore safely
    this.totalSessions = stats?.totalSessions ?? 0;
    this.averageScore = stats?.averageScore ?? 0;
  } catch (error) {
    console.error('Error loading quiz stats:', error);
  }
}

}
