import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { Quiz } from '@/shared/models/quiz.model';
import { firstValueFrom } from 'rxjs';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';
import { Timestamp } from 'firebase/firestore';

@Component({
  standalone: true,
  selector: 'app-stats-widget',
  imports: [CommonModule],
  template: `
    <!-- Active Weekly Quiz -->
    <div class="col-span-6 lg:col-span-6 xl:col-span-3">
      <div class="card mb-0 h-full flex flex-col justify-between p-4">
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
      <div class="card mb-0 h-full flex flex-col justify-between p-4">
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
    <!-- Weekly Quiz Page Views -->
    <div class="col-span-6 lg:col-span-6 xl:col-span-3">
        <div class="card mb-0 h-full flex flex-col justify-between p-4">
            <div class="flex justify-between items-center">
                <div>
                    <span class="block text-muted-color font-medium mb-2">Weekly Quiz Page Views</span>
                    <div class="text-surface-900 dark:text-surface-0 font-semibold text-xl">{{ pageViews }}</div>
                </div>
                <div class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                    <i class="pi pi-globe text-cyan-500 text-xl!"></i>
                </div>
            </div>
            <div class="mt-4 text-muted-color text-sm">
                    Last 30 days
                </div>
        </div>
    </div>

    <!-- Member Count -->
    <div class="col-span-6 lg:col-span-6 xl:col-span-3">
        <div class="card mb-0 h-full flex flex-col justify-between p-4">
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

    <!-- Weekly Submissions -->
    <!-- <div class="col-span-6 lg:col-span-6 xl:col-span-3">
        <div class="card mb-0 h-full flex flex-col justify-between p-4">
            <div class="flex justify-between items-center">
                <div>
                    <span class="block text-muted-color font-medium mb-2">Submissions This Week</span>
                    <div class="text-surface-900 dark:text-surface-0 font-semibold text-xl">{{ weeklySubmissions }}</div>
                </div>
                <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem">
                    <i class="pi pi-file text-purple-500 text-xl!"></i>
                </div>
            </div>
        </div>
    </div> -->
  `
})
export class StatsWidget implements OnInit {
  private quizzesService = inject(QuizzesService);

  nextQuizReady: boolean | null = null;
  nextDeployment: Date | null = null;

  activeQuiz: Quiz | null = null;
  pageViews = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000;
  memberCount = Math.floor(Math.random() * (4000 - 2000 + 1)) + 2000;
  memberIncrease = Math.floor(Math.random() * (1 - 20 + 1)) + 20;
  weeklySubmissions = Math.floor(Math.random() * (100 - 300 + 1)) + 300;

  async ngOnInit() {
    // Fetch active weekly quiz from Firestore
    this.activeQuiz = await firstValueFrom(this.quizzesService.getActiveQuiz()) || null;

    // Load next quiz status and deployment date
    await this.loadNextQuizStatus();
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
}
