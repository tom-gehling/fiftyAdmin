import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { Subscription } from 'rxjs';
import { LayoutService } from '../../../layout/service/layout.service';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { QuizResultsService } from '@/shared/services/quiz-result.service';
import { QuizStatsService } from '@/shared/services/quiz-stats.service';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-user-quiz-history-widget',
  imports: [CommonModule, ChartModule],
  template: `
    <div class="card mb-8 p-4 fiftyBorder">
      <div class="font-semibold text-xl mb-4">Weekly Quiz History</div>

      <ng-container *ngIf="loading; else chartBlock">
        <div class="flex justify-center items-center h-100">
          <span class="pi pi-spin pi-spinner text-2xl"></span>
        </div>
      </ng-container>

      <ng-template #chartBlock>
        <ng-container *ngIf="quizScores.length; else noData">
          <p-chart type="line" [data]="chartData" [options]="chartOptions"></p-chart>
        </ng-container>
        <ng-template #noData>
          <div class="text-center text-gray-500 dark:text-gray-400 flex items-center justify-center">
            No completed quizzes yet.
          </div>
        </ng-template>
      </ng-template>
    </div>
  `
})
export class UserQuizHistoryWidget implements OnInit, OnDestroy {
  quizScores: { quizId: number; score: number | null }[] = [];
  siteAverages: { quizId: number; avgScore: number | null }[] = [];
  chartData: any;
  chartOptions: any;
  subscriptions = new Subscription();
  loading = true;

  private layoutService = inject(LayoutService);
  private quizResultsService = inject(QuizResultsService);
  private quizStatsService = inject(QuizStatsService);
  private auth = inject(Auth);

  ngOnInit() {
    this.subscriptions.add(
      this.layoutService.configUpdate$.subscribe(() => this.initChart())
    );

    // Properly handle auth state changes with cleanup
    const unsubscribeAuth = onAuthStateChanged(this.auth, async user => {
      this.loading = true;

      if (!user) {
        this.quizScores = [];
        this.siteAverages = [];
        this.loading = false;
        this.initChart();
        return;
      }

      try {
        // Use the optimized getUserQuizScoreHistory method
        // This only fetches completed quizzes with quizId <= 1000
        this.quizScores = await this.quizResultsService.getUserQuizScoreHistory(user.uid);

        if (!this.quizScores.length) {
          this.siteAverages = [];
          this.loading = false;
          this.initChart();
          return;
        }

        // Load stats for each quiz (only for the quizzes the user has completed)
        const statsPromises = this.quizScores.map(async q => {
          try {
            const stat = await this.quizStatsService.getQuizStats(q.quizId.toString());
            return {
              quizId: q.quizId,
              avgScore: stat.averageScore ?? null
            };
          } catch {
            return { quizId: q.quizId, avgScore: null };
          }
        });

        this.siteAverages = await Promise.all(statsPromises);
      } catch (err) {
        console.error('Error loading quiz history', err);
        this.quizScores = [];
        this.siteAverages = [];
      } finally {
        this.loading = false;
        this.initChart();
      }
    });

    // Store the cleanup function for auth subscription
    this.subscriptions.add(() => unsubscribeAuth());
  }

  private initChart() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const borderColor = documentStyle.getPropertyValue('--surface-border');
    const primaryColor = documentStyle.getPropertyValue('--p-primary-500');

    const labels = this.quizScores.map(q => `#${q.quizId}`);
    const userData = this.quizScores.map(q => q.score);
    const siteData = this.siteAverages.map(q => q.avgScore);

    this.chartData = {
      labels,
      datasets: [
        {
          label: 'Your Score',
          data: userData,
          borderColor: primaryColor,
          backgroundColor: primaryColor,
          tension: 0.3,
          fill: false,
          pointRadius: 5,
          pointHoverRadius: 7
        },
        {
          label: 'Members Avg',
          data: siteData,
          borderColor: '#fbe2df',
          backgroundColor: '#fbe2df',
          tension: 0.3,
          fill: false,
          borderDash: [5, 5],
          pointRadius: 5,
          pointHoverRadius: 7
        }
      ]
    };

    this.chartOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (context: any) => `Score: ${context.parsed.y}/50`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Quiz', color: textColor },
          ticks: { color: textColor },
          grid: { color: 'transparent', borderColor: 'transparent' }
        },
        y: {
          min: 0,
          max: 55,
          title: { display: true, text: 'Score', color: textColor },
          ticks: { color: textColor, stepSize: 5 },
          grid: { color: borderColor, borderColor: 'transparent' }
        }
      }
    };
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
