import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { QuizStatsService } from '@/shared/services/quiz-stats.service';

interface WeeklyQuizStat {
  quizId: string;
  completedCount: number;
  averageScore: number;
}

@Component({
  standalone: true,
  selector: 'app-weekly-quiz-stats',
  imports: [CommonModule, ChartModule],
  template: `
    <div class="card mb-4 p-4 fiftyBorder w-full">
      <div class="flex justify-between items-center mb-2">
        <span class="block text-surface-0 font-medium text-xl">Weekly Quiz Performance</span>
      </div>
      
      <ng-container *ngIf="loading; else chartContent">
        <div class="flex justify-center items-center h-72">
          <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
        </div>
      </ng-container>
      
      <ng-template #chartContent>
        <ng-container *ngIf="weeklyStats.length > 0; else noData">
          <p-chart
            type="bar"
            [data]="chartData"
            [options]="chartOptions"
            class="w-full h-96"
          ></p-chart>
        </ng-container>
        
        <ng-template #noData>
          <div class="text-center text-gray-500 dark:text-gray-400 flex items-center justify-center h-72">
            No weekly quiz data available.
          </div>
        </ng-template>
      </ng-template>
    </div>
  `
})
export class WeeklyQuizStatsComponent implements OnInit {
  weeklyStats: WeeklyQuizStat[] = [];
  loading = true;
  chartData: any;
  chartOptions: any;

  constructor(private quizStatsService: QuizStatsService) {}

  async ngOnInit() {
    await this.loadWeeklyQuizStats();
  }

  async loadWeeklyQuizStats() {
    this.loading = true;
    try {
      // Get all weekly quiz aggregate IDs (quizId < 1000 and > 100)
      const quizIds = await this.quizStatsService.getAllQuizAggregateIds();
      
      // Sort by quizId descending to show most recent first
      const sortedIds = quizIds
        .map(id => parseInt(id, 10))
        .filter(id => !isNaN(id))
        .sort((a, b) => b - a);

      // Fetch aggregate data for each quiz
      const statsPromises = sortedIds.map(async (quizId) => {
        const aggregate = await this.quizStatsService.getQuizAggregatesFirestore(String(quizId));
        if (aggregate) {
          const completedCount = aggregate.completedCount || 0;
          const totalScore = aggregate.totalScore || 0;
          const averageScore = completedCount > 0 ? totalScore / completedCount : 0;
          
          return {
            quizId: String(quizId),
            completedCount,
            averageScore
          };
        }
        return null;
      });

      const results = await Promise.all(statsPromises);
      this.weeklyStats = results.filter((stat): stat is WeeklyQuizStat => stat !== null && stat.completedCount > 0);
      
      // Limit to last 20 quizzes for better readability
      this.weeklyStats = this.weeklyStats.slice(0, 20);
      
      this.initChart();
    } catch (error) {
      console.error('Error loading weekly quiz stats:', error);
    } finally {
      this.loading = false;
    }
  }

  private initChart() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const borderColor = documentStyle.getPropertyValue('--surface-border');
    const primaryColor = documentStyle.getPropertyValue('--p-primary-500');
    const secondaryColor = documentStyle.getPropertyValue('--p-primary-200');

    // Sort by quizId ascending for display (oldest to newest)
    const sortedStats = [...this.weeklyStats].sort((a, b) => parseInt(a.quizId) - parseInt(b.quizId));
    
    const labels = sortedStats.map(stat => `Quiz #${stat.quizId}`);
    const completedCounts = sortedStats.map(stat => stat.completedCount);
    const averageScores = sortedStats.map(stat => stat.averageScore);

    this.chartData = {
      labels,
      datasets: [
        {
          label: 'Completed Sessions',
          data: completedCounts,
          backgroundColor: primaryColor,
          borderColor: primaryColor,
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          label: 'Average Score',
          data: averageScores,
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
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: textColor
          }
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              if (context.datasetIndex === 0) {
                return `Completed Sessions: ${context.parsed.y}`;
              } else {
                return `Average Score: ${context.parsed.y.toFixed(2)}`;
              }
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Weekly Quiz',
            color: textColor
          },
          ticks: {
            color: textColor
          },
          grid: {
            color: borderColor
          }
        },
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: {
            display: true,
            text: 'Completed Sessions',
            color: textColor
          },
          ticks: {
            color: textColor,
            beginAtZero: true
          },
          grid: {
            color: borderColor
          }
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: 'Average Score',
            color: textColor
          },
          ticks: {
            color: textColor,
            beginAtZero: true
          },
          grid: {
            drawOnChartArea: false,
          },
        }
      }
    };
  }
}
