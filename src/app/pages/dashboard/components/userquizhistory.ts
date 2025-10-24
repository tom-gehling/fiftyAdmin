import { Component, OnInit, OnDestroy, Input, inject } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { Subscription } from 'rxjs';
import { LayoutService } from '../../../layout/service/layout.service';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { QuizResultsService } from '@/shared/services/quiz-result.service';
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
  chartData: any;
  chartOptions: any;
  subscription!: Subscription;
  loading = true;

  private layoutService = inject(LayoutService);
  private quizResultsService = inject(QuizResultsService);
  private auth = inject(Auth);

  ngOnInit() {
    this.subscription = this.layoutService.configUpdate$.subscribe(() => this.initChart());

    // Watch auth state to load user results dynamically
    onAuthStateChanged(this.auth, async user => {
      if (user) {
        this.quizResultsService.getUserResults(user.uid).subscribe(results => {
          this.quizScores = results
            .filter(r => r.status === 'completed')
            .map(r => ({
              quizId: Number(r.quizId),
              score: r.score ?? null
            }))
            .sort((a, b) => a.quizId - b.quizId);

          this.loading = false;
          this.initChart();
        });
      } else {
        this.quizScores = [];
        this.loading = false;
        this.initChart();
      }
    });
  }

  private initChart() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const borderColor = documentStyle.getPropertyValue('--surface-border');
    const textMutedColor = documentStyle.getPropertyValue('--text-color-secondary');
    const primaryColor = documentStyle.getPropertyValue('--p-primary-500');

    const labels = this.quizScores.map(q => `#${q.quizId}`);
    const data = this.quizScores.map(q => q.score);

    this.chartData = {
      labels,
      datasets: [
        {
          label: 'Score',
          data,
          borderColor: primaryColor,
          backgroundColor: primaryColor,
          tension: 0.3,
          fill: false,
          pointRadius: 5,
          pointHoverRadius: 7,
        }
      ]
    };

    this.chartOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context: any) => `Score: ${context.parsed.y}/50`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Quiz', color: textMutedColor },
          ticks: { color: textColor },
          grid: { color: 'transparent', borderColor: 'transparent' }
        },
        y: {
          min: 0,
          max: 55,
          title: { display: true, text: 'Score', color: textMutedColor },
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
