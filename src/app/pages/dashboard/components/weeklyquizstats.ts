import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { QuizStatsService, QuizLocationStats } from '@/shared/services/quiz-stats.service';
import { Chart, registerables } from 'chart.js';
import { ChoroplethController, BubbleMapController, GeoFeature, ColorScale, ProjectionScale, SizeScale } from 'chartjs-chart-geo';

// Register Chart.js components
Chart.register(...registerables, ChoroplethController, BubbleMapController, GeoFeature, ColorScale, ProjectionScale, SizeScale);

interface WeeklyQuizStat {
    quizId: string;
    completedCount: number;
    averageScore: number;
}

interface QuizOption {
    label: string;
    value: string;
}

@Component({
    standalone: true,
    selector: 'app-weekly-quiz-stats',
    imports: [CommonModule, ChartModule, FormsModule, SelectModule],
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

    <!-- Location Analytics Section -->
    <div class="card mb-4 p-4 fiftyBorder w-full">
      <div class="mb-4">
        <span class="block text-surface-0 font-medium text-xl mb-3">Location Analytics</span>
        <div class="flex items-center gap-3">
          <label for="quizSelector" class="text-surface-700 dark:text-surface-300 font-medium">Select Quiz:</label>
          <p-select
            [(ngModel)]="selectedQuizId"
            [options]="quizOptions"
            optionLabel="label"
            optionValue="value"
            (onChange)="onQuizChange()"
            placeholder="Select a quiz"
            class="w-80">
          </p-select>
        </div>
      </div>

      <ng-container *ngIf="loadingLocationStats">
        <div class="flex justify-center items-center h-72">
          <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
        </div>
      </ng-container>

      <ng-container *ngIf="!loadingLocationStats && selectedQuizId && locationStats">
        <ng-container *ngIf="locationStats.totalResults > 0; else noLocationData">
          <div class="mb-3 text-surface-600 dark:text-surface-400">
            <p class="text-sm">Total results analyzed: <strong>{{locationStats.totalResults}}</strong></p>
            <p class="text-sm">Countries: <strong>{{locationStats.countries.length}}</strong> | Cities: <strong>{{locationStats.cities.length}}</strong></p>
          </div>

          <!-- World Map - Countries with Submissions -->
          <div class="mb-6">
            <h3 class="text-lg font-medium text-surface-700 dark:text-surface-200 mb-3">Quiz Submissions by Country</h3>
            <div class="w-full h-96 relative">
              <canvas #worldMapCanvas></canvas>
            </div>
          </div>

          <!-- City Distribution -->
          <div class="mb-6">
            <h3 class="text-lg font-medium text-surface-700 dark:text-surface-200 mb-3">Top Cities</h3>
            <p-chart
              type="bar"
              [data]="cityChartData"
              [options]="cityChartOptions"
              class="w-full h-80"
            ></p-chart>
          </div>

          <!-- Performance by Location -->
          <div class="mb-6">
            <h3 class="text-lg font-medium text-surface-700 dark:text-surface-200 mb-3">Performance by Country</h3>
            <p-chart
              type="bar"
              [data]="performanceChartData"
              [options]="performanceChartOptions"
              class="w-full h-80"
            ></p-chart>
          </div>

          <!-- Map Data (Simple List for now) -->
          <div class="mb-4">
            <h3 class="text-lg font-medium text-surface-700 dark:text-surface-200 mb-3">Geographic Distribution</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="bg-surface-100 dark:bg-surface-700">
                  <tr>
                    <th class="px-4 py-2 text-left">Country</th>
                    <th class="px-4 py-2 text-right">Completions</th>
                    <th class="px-4 py-2 text-right">Avg Score</th>
                    <th class="px-4 py-2 text-right">Avg Time</th>
                    <th class="px-4 py-2 text-center">Coordinates</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let country of locationStats.countries.slice(0, 15); let i = index"
                      [class.bg-surface-50]="i % 2 === 0"
                      [class.dark:bg-surface-800]="i % 2 === 0">
                    <td class="px-4 py-2">{{country.name}}</td>
                    <td class="px-4 py-2 text-right">{{country.count}}</td>
                    <td class="px-4 py-2 text-right">{{country.averageScore.toFixed(2)}}</td>
                    <td class="px-4 py-2 text-right">{{country.averageTime.toFixed(0)}}s</td>
                    <td class="px-4 py-2 text-center text-xs text-surface-500">
                      <span *ngIf="country.latitude && country.longitude">
                        {{country.latitude.toFixed(2)}}, {{country.longitude.toFixed(2)}}
                      </span>
                      <span *ngIf="!country.latitude || !country.longitude">-</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ng-container>

        <ng-template #noLocationData>
          <div class="text-center text-gray-500 dark:text-gray-400 flex items-center justify-center h-72">
            No location data available for Quiz #{{selectedQuizId}}.
          </div>
        </ng-template>
      </ng-container>

      <ng-container *ngIf="!loadingLocationStats && !selectedQuizId">
        <div class="text-center text-gray-500 dark:text-gray-400 flex items-center justify-center h-48">
          Select a quiz above to view location analytics.
        </div>
      </ng-container>
    </div>
  `
})
export class WeeklyQuizStatsComponent implements OnInit {
    @ViewChild('worldMapCanvas', { static: false }) worldMapCanvas!: ElementRef<HTMLCanvasElement>;

    weeklyStats: WeeklyQuizStat[] = [];
    loading = true;
    chartData: any;
    chartOptions: any;

    // Location stats
    selectedQuizId: string | null = null;
    quizOptions: QuizOption[] = [];
    locationStats: QuizLocationStats | null = null;
    loadingLocationStats = false;
    worldMapChart: Chart | null = null;
    cityChartData: any;
    cityChartOptions: any;
    performanceChartData: any;
    performanceChartOptions: any;

    constructor(private quizStatsService: QuizStatsService) { }

    async ngOnInit() {
        await this.loadWeeklyQuizStats();
    }

    onQuizChange() {
        if (this.selectedQuizId) {
            this.loadLocationStats(this.selectedQuizId);
        }
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

            // Populate quiz options for dropdown
            this.quizOptions = this.weeklyStats.map(stat => ({
                label: `Quiz #${stat.quizId} (${stat.completedCount} completions)`,
                value: stat.quizId
            }));

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

    async loadLocationStats(quizId: string) {
        this.loadingLocationStats = true;
        try {
            this.locationStats = await this.quizStatsService.getQuizLocationStats(quizId);
            if (this.locationStats && this.locationStats.totalResults > 0) {
                this.initLocationCharts();
            }
        } catch (error) {
            console.error('Error loading location stats:', error);
        } finally {
            this.loadingLocationStats = false;
        }
    }

    private async initLocationCharts() {
        if (!this.locationStats) return;

        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const borderColor = documentStyle.getPropertyValue('--surface-border');

        // Wait for view to initialize
        setTimeout(async () => {
            await this.initWorldMap();
        }, 100);

        // City Distribution Chart (Top 10)
        const topCities = this.locationStats.cities.slice(0, 10);
        this.cityChartData = {
            labels: topCities.map(c => c.name),
            datasets: [{
                label: 'Completions by City',
                data: topCities.map(c => c.count),
                backgroundColor: '#42A5F5',
                borderColor: borderColor,
                borderWidth: 1
            }]
        };

        this.cityChartOptions = {
            maintainAspectRatio: false,
            responsive: true,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context: any) => `${context.parsed.x} completions`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor, beginAtZero: true },
                    grid: { color: borderColor }
                },
                y: {
                    ticks: { color: textColor },
                    grid: { color: borderColor }
                }
            }
        };

        // Performance by Location Chart (Top 8 countries)
        const topPerformance = this.locationStats.countries.slice(0, 8);
        this.performanceChartData = {
            labels: topPerformance.map(c => c.name),
            datasets: [
                {
                    label: 'Average Score',
                    data: topPerformance.map(c => c.averageScore.toFixed(2)),
                    backgroundColor: '#66BB6A',
                    borderColor: '#66BB6A',
                    borderWidth: 2,
                    yAxisID: 'y',
                },
                {
                    label: 'Avg Time (seconds)',
                    data: topPerformance.map(c => c.averageTime.toFixed(0)),
                    backgroundColor: '#FFA726',
                    borderColor: '#FFA726',
                    borderWidth: 2,
                    yAxisID: 'y1',
                }
            ]
        };

        this.performanceChartOptions = {
            maintainAspectRatio: false,
            responsive: true,
            interaction: {
                mode: 'index' as const,
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: textColor }
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor },
                    grid: { color: borderColor }
                },
                y: {
                    type: 'linear' as const,
                    display: true,
                    position: 'left' as const,
                    title: {
                        display: true,
                        text: 'Average Score',
                        color: textColor
                    },
                    ticks: { color: textColor, beginAtZero: true },
                    grid: { color: borderColor }
                },
                y1: {
                    type: 'linear' as const,
                    display: true,
                    position: 'right' as const,
                    title: {
                        display: true,
                        text: 'Avg Time (seconds)',
                        color: textColor
                    },
                    ticks: { color: textColor, beginAtZero: true },
                    grid: { drawOnChartArea: false }
                }
            }
        };
    }

    private async initWorldMap() {
        if (!this.worldMapCanvas || !this.locationStats) return;

        // Destroy existing chart
        if (this.worldMapChart) {
            this.worldMapChart.destroy();
        }

        try {
            // Fetch world topology data
            const response = await fetch('https://unpkg.com/world-atlas@2/countries-110m.json');
            const worldData = await response.json();

            // Import topojson-client for feature extraction
            const topojson = await import('topojson-client');
            const countries: any = topojson.feature(worldData, worldData.objects.countries);

            // Create a map of country names to submission counts
            const countryMap = new Map(
                this.locationStats.countries.map(c => [c.name.toLowerCase(), c.count])
            );

            // Match features to our data
            const chartData = countries.features.map((feature: any) => {
                const countryName = feature.properties.name?.toLowerCase() || '';
                const count = countryMap.get(countryName) || 0;
                return {
                    feature: feature,
                    value: count
                };
            });

            const maxCount = Math.max(...this.locationStats.countries.map(c => c.count), 1);

            const ctx = this.worldMapCanvas.nativeElement.getContext('2d');
            if (!ctx) return;

            // Get neon green color from CSS or use default
            const neonGreen = getComputedStyle(document.documentElement).getPropertyValue('--p-primary-500') || '#00ff87';

            this.worldMapChart = new Chart(ctx, {
                type: 'choropleth',
                data: {
                    labels: countries.features.map((f: any) => f.properties.name),
                    datasets: [{
                        label: 'Quiz Completions',
                        outline: countries.features,
                        data: chartData,
                        backgroundColor: (context: any) => {
                            const value = context.raw?.value || 0;
                            // Binary coloring: neon green if has submissions, gray if not
                            return value > 0 ? neonGreen : 'rgba(200, 200, 200, 0.3)';
                        },
                        borderColor: '#666',
                        borderWidth: 0.5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context: any) => {
                                    const value = context.raw?.value || 0;
                                    return value > 0 ? `${value} completions` : 'No submissions';
                                }
                            }
                        }
                    },
                    scales: {
                        projection: {
                            axis: 'x',
                            projection: 'equalEarth'
                        }
                    }
                } as any
            } as any);
        } catch (error) {
            console.error('Error initializing world map:', error);
        }
    }

}
