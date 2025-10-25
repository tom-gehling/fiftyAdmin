import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { Subscription, combineLatest, firstValueFrom } from 'rxjs';
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
  subscription!: Subscription;
  loading = true;

  private layoutService = inject(LayoutService);
  private quizResultsService = inject(QuizResultsService);
  private quizStatsService = inject(QuizStatsService);
  private auth = inject(Auth);

  ngOnInit() {
    this.subscription = this.layoutService.configUpdate$.subscribe(() => this.initChart());

    onAuthStateChanged(this.auth, async user => {
      if (!user) {
        this.quizScores = [];
        this.siteAverages = [];
        this.loading = false;
        this.initChart();
        return;
      }

      this.loading = true;

      // Load user quiz results and site-wide averages
      const results = await firstValueFrom(this.quizResultsService.getUserResults(user.uid));
      const completedResults = results
        .filter(r => r.status === 'completed')
        .sort((a, b) => Number(a.quizId) - Number(b.quizId));

      this.quizScores = completedResults.map(r => ({
        quizId: Number(r.quizId),
        score: r.score ?? null
      }));

      // Get site-wide averages for all completed quizzes
      const statsObservables = this.quizScores.map(q =>
        this.quizStatsService.getQuizStats(q.quizId.toString())
      );

      const statsResults = await firstValueFrom(combineLatest(statsObservables));

      this.siteAverages = statsResults.map((stat, i) => ({
        quizId: this.quizScores[i].quizId,
        avgScore: stat?.averageScore ?? null
      }));

      this.loading = false;
      this.initChart();
    });
  }

  private initChart() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const borderColor = documentStyle.getPropertyValue('--surface-border');
    const primaryColor = documentStyle.getPropertyValue('--p-primary-500');
    const secondaryColor = documentStyle.getPropertyValue('--p-secondary-500');

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
    this.subscription?.unsubscribe();
  }
}
