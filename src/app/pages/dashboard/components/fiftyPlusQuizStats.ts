import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import { QuizStatsService } from '@/shared/services/quiz-stats.service';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';
import { firstValueFrom } from 'rxjs';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface FiftyPlusStat {
    quizId: string;
    quizTitle: string;
    quizType: QuizTypeEnum;
    completedCount: number;
    averageScore: number;
}

interface TypeOption {
    label: string;
    value: QuizTypeEnum | null;
}

@Component({
    standalone: true,
    selector: 'app-fifty-plus-quiz-stats',
    imports: [CommonModule, ChartModule, FormsModule, SelectButtonModule],
    template: `
    <!-- Type Filter -->
    <div class="mb-4 flex flex-wrap gap-2 items-center">
      <p-selectButton
        [(ngModel)]="selectedType"
        [options]="typeOptions"
        optionLabel="label"
        optionValue="value"
        (onChange)="applyFilter()"
      ></p-selectButton>
    </div>

    <!-- Performance Chart -->
    <div class="card mb-4 p-4 fiftyBorder w-full">
      <div class="flex justify-between items-center mb-2">
        <span class="block text-surface-0 font-medium text-xl">Fifty+ Quiz Performance</span>
        <span class="text-surface-400 text-sm">{{ filteredStats.length }} quizzes</span>
      </div>

      <ng-container *ngIf="loading; else chartContent">
        <div class="flex justify-center items-center h-72">
          <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
        </div>
      </ng-container>

      <ng-template #chartContent>
        <ng-container *ngIf="filteredStats.length > 0; else noData">
          <p-chart
            type="bar"
            [data]="chartData"
            [options]="chartOptions"
            class="w-full h-96"
          ></p-chart>
        </ng-container>

        <ng-template #noData>
          <div class="text-center text-gray-500 dark:text-gray-400 flex items-center justify-center h-72">
            No data available for this category.
          </div>
        </ng-template>
      </ng-template>
    </div>

    <!-- Summary Table -->
    <div class="card p-4 fiftyBorder w-full" *ngIf="!loading && filteredStats.length > 0">
      <div class="flex justify-between items-center mb-3">
        <span class="block text-surface-0 font-medium text-xl">Quiz Breakdown</span>
        <span class="text-surface-400 text-sm">{{ filteredStats.length }} {{ selectedType == null ? 'total' : typeLabel(selectedType) }} quizzes</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-100 dark:bg-surface-700">
            <tr>
              <th class="px-4 py-2 text-left">Quiz ID</th>
              <th class="px-4 py-2 text-left">Title</th>
              <th class="px-4 py-2 text-left">Type</th>
              <th class="px-4 py-2 text-right">Completions</th>
              <th class="px-4 py-2 text-right">Avg Score</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let stat of filteredStats; let i = index"
                [class.bg-surface-50]="i % 2 === 0"
                [class.dark:bg-surface-800]="i % 2 === 0">
              <td class="px-4 py-2 font-mono text-xs">{{ stat.quizId }}</td>
              <td class="px-4 py-2">{{ stat.quizTitle }}</td>
              <td class="px-4 py-2">
                <span class="px-2 py-0.5 rounded text-xs font-medium"
                  [ngClass]="{
                    'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200': stat.quizType === 2,
                    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200': stat.quizType === 3,
                    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200': stat.quizType === 4
                  }">
                  {{ typeLabel(stat.quizType) }}
                </span>
              </td>
              <td class="px-4 py-2 text-right">{{ stat.completedCount }}</td>
              <td class="px-4 py-2 text-right">{{ stat.averageScore.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class FiftyPlusQuizStatsComponent implements OnInit {
    allStats: FiftyPlusStat[] = [];
    filteredStats: FiftyPlusStat[] = [];
    loading = true;

    selectedType: QuizTypeEnum | null = null;

    typeOptions: TypeOption[] = [
        { label: 'All', value: null },
        { label: 'Exclusives', value: QuizTypeEnum.FiftyPlus },
        { label: 'Collabs', value: QuizTypeEnum.Collab },
        { label: 'Question Quizzes', value: QuizTypeEnum.QuestionType },
    ];

    chartData: any;
    chartOptions: any;

    constructor(
        private quizStatsService: QuizStatsService,
        private quizzesService: QuizzesService
    ) {}

    async ngOnInit() {
        await this.loadStats();
    }

    async loadStats() {
        this.loading = true;
        try {
            const allQuizzes = await firstValueFrom(this.quizzesService.getAllQuizzes());
            const fiftyPlusQuizzes = allQuizzes.filter(q =>
                q.quizType === QuizTypeEnum.FiftyPlus ||
                q.quizType === QuizTypeEnum.Collab ||
                q.quizType === QuizTypeEnum.QuestionType
            );

            const statsPromises = fiftyPlusQuizzes.map(async (quiz) => {
                const aggregate = await this.quizStatsService.getQuizAggregatesFirestore(String(quiz.quizId));
                const completedCount = aggregate?.completedCount ?? 0;
                const totalScore = aggregate?.totalScore ?? 0;
                const averageScore = completedCount > 0 ? totalScore / completedCount : 0;
                return {
                    quizId: String(quiz.quizId),
                    quizTitle: quiz.quizTitle ?? `Quiz ${quiz.quizId}`,
                    quizType: quiz.quizType as QuizTypeEnum,
                    completedCount,
                    averageScore
                };
            });

            const results = await Promise.all(statsPromises);
            this.allStats = results
                .filter(s => s.completedCount > 0)
                .sort((a, b) => b.completedCount - a.completedCount);

            this.applyFilter();
        } catch (error) {
            console.error('Error loading fifty+ quiz stats:', error);
        } finally {
            this.loading = false;
        }
    }

    applyFilter() {
        this.filteredStats = this.selectedType == null
            ? this.allStats
            : this.allStats.filter(s => s.quizType === this.selectedType);
        this.buildChart();
    }

    typeLabel(type: QuizTypeEnum): string {
        switch (type) {
            case QuizTypeEnum.FiftyPlus: return 'Exclusive';
            case QuizTypeEnum.Collab: return 'Collab';
            case QuizTypeEnum.QuestionType: return 'Question Quiz';
            default: return 'Unknown';
        }
    }

    private buildChart() {
        if (this.filteredStats.length === 0) return;

        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const borderColor = documentStyle.getPropertyValue('--surface-border');
        const primaryColor = documentStyle.getPropertyValue('--p-primary-500');

        const labels = this.filteredStats.map(s =>
            s.quizTitle.length > 20 ? s.quizTitle.slice(0, 20) + '…' : s.quizTitle
        );

        this.chartData = {
            labels,
            datasets: [
                {
                    label: 'Completed Sessions',
                    data: this.filteredStats.map(s => s.completedCount),
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                    borderWidth: 1,
                    yAxisID: 'y',
                },
                {
                    label: 'Average Score',
                    data: this.filteredStats.map(s => s.averageScore),
                    type: 'line',
                    borderColor: '#fbe2df',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#fbe2df',
                    yAxisID: 'y1',
                    tension: 0.3,
                }
            ]
        };

        this.chartOptions = {
            maintainAspectRatio: false,
            responsive: true,
            interaction: { mode: 'index' as const, intersect: false },
            plugins: {
                legend: { display: true, labels: { color: textColor } },
                tooltip: {
                    callbacks: {
                        label: (context: any) => {
                            if (context.datasetIndex === 0) return `Completed Sessions: ${context.parsed.y}`;
                            return `Average Score: ${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor, maxRotation: 45, minRotation: 30 },
                    grid: { color: borderColor }
                },
                y: {
                    type: 'linear' as const,
                    display: true,
                    position: 'left' as const,
                    title: { display: true, text: 'Completed Sessions', color: textColor },
                    ticks: { color: textColor, beginAtZero: true },
                    grid: { color: borderColor }
                },
                y1: {
                    type: 'linear' as const,
                    display: true,
                    position: 'right' as const,
                    title: { display: true, text: 'Average Score', color: textColor },
                    ticks: { color: textColor, beginAtZero: true },
                    grid: { drawOnChartArea: false }
                }
            }
        };
    }
}
