import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { QuizStatsService, QuizLocationStats } from '@/shared/services/quiz-stats.service';
import { Quiz } from '@/shared/models/quiz.model';
import { Firestore, collection, collectionData, query, where } from '@angular/fire/firestore';
import { firstValueFrom, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { QuizResultsService } from '@/shared/services/quiz-result.service';

import { Chart, registerables, type TooltipItem } from 'chart.js';
import { ChoroplethController, BubbleMapController, GeoFeature, ColorScale, ProjectionScale, SizeScale } from 'chartjs-chart-geo';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';

Chart.register(...registerables, ChoroplethController, BubbleMapController, GeoFeature, ColorScale, ProjectionScale, SizeScale);

declare const google: any;

interface WeeklyQuizStat {
    quizId: string;
    completedCount: number;
    averageScore: number;
}

@Component({
    standalone: true,
    selector: 'app-quiz-stats-summary',
    imports: [CommonModule, FormsModule, ChartModule, SelectModule, ProgressBarModule, DatePickerModule, TooltipModule],
    template: `
        <!-- WEEKLY QUIZ PERFORMANCE (cross-quiz overview) -->
        <div class="card mb-4 p-4 fiftyBorder w-full">
            <div class="flex justify-between items-center mb-2">
                <span class="block text-surface-0 font-medium text-xl">Weekly Quiz Performance</span>
            </div>

            <ng-container *ngIf="loadingWeeklyOverview; else overviewChart">
                <div class="flex justify-center items-center h-72">
                    <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
                </div>
            </ng-container>

            <ng-template #overviewChart>
                <ng-container *ngIf="weeklyStats.length > 0; else noOverview">
                    <p-chart type="bar" [data]="weeklyChartData" [options]="weeklyChartOptions" class="w-full h-96"></p-chart>
                </ng-container>
                <ng-template #noOverview>
                    <div class="text-center text-gray-500 dark:text-gray-400 flex items-center justify-center h-72">No weekly quiz data available.</div>
                </ng-template>
            </ng-template>
        </div>

        <div class="mb-2 flex items-center">
            <!-- Left spacer -->
            <div class="flex-1 flex justify-start hidden md:flex">
                <p-select [(ngModel)]="selectedQuizId" [options]="quizIds" optionLabel="label" optionValue="value" (onChange)="refreshStats()" placeholder="Select Quiz" class="w-60"></p-select>
            </div>
            <div class="flex-1 flex justify-start sm: flex md:hidden"></div>

            <!-- Title -->
            <h1 class="text-4xl md:text-6xl font-bold text-surface-900 dark:text-surface-0 text-center mt-1 flex-none">
                {{ getQuizName() }}
            </h1>

            <!-- Refresh button -->
            <div class="flex-1 flex justify-end">
                <button class="flex items-center justify-center hover:opacity-80 transition-opacity" (click)="refreshStats()" [disabled]="refreshing" title="Refresh Stats" style="color: var(--fifty-neon-green)">
                    <i class="pi text-xl" style="font-size: 1.5rem;" [ngClass]="refreshing ? 'pi-spin pi-spinner' : 'pi-refresh'"></i>
                </button>
            </div>
        </div>

        <!-- MOBILE SELECT DROPPED BELOW (centered) -->
        <div class="flex justify-center mt-2 md:hidden">
            <p-select [(ngModel)]="selectedQuizId" [options]="quizIds" optionLabel="label" optionValue="value" (onChange)="refreshStats()" placeholder="Select Quiz" class="w-60 m-5"></p-select>
        </div>

        <!-- SPINNER TEMPLATE -->
        <ng-template #loadingSpinner>
            <div class="flex justify-center items-center h-full">
                <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
            </div>
        </ng-template>

        <!-- TOP STATS GRID -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <!-- Completed Quiz -->
            <div class="card h-full flex flex-col justify-between p-2 fiftyBorder items-center text-center">
                <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
                    <span class="block text-surface-0 font-medium">Completed Quiz</span>
                    <div class="text-surface-900 dark:text-surface-0 font-semibold text-3xl">
                        {{ stats.completedCount + stats.inProgressCount }}
                    </div>
                </ng-container>
            </div>

            <!-- Currently Quizzing (live) -->
            <div class="card h-full flex flex-col justify-between p-2 fiftyBorder items-center text-center">
                <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
                    <span class="block text-surface-0 font-medium">Currently Quizzing</span>
                    <div class="font-semibold text-3xl">{{ liveViewerCount }}</div>
                </ng-container>
            </div>

            <!-- Avg Completion Time -->
            <div class="card h-full flex flex-col justify-between p-2 fiftyBorder items-center text-center">
                <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
                    <span class="block text-surface-0 font-medium">Avg Completion Time</span>
                    <div class="font-semibold text-2xl">{{ averageTimeHHMMSS }}</div>
                </ng-container>
            </div>

            <!-- Quizzes Abandoned -->
            <div class="card h-full flex flex-col justify-between p-2 fiftyBorder items-center text-center">
                <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
                    <span class="block text-surface-0 font-medium">Quizzes Abandoned</span>
                    <div class="text-red-400 font-semibold text-3xl">{{ stats.abandonedCount }}</div>
                </ng-container>
            </div>

            <!-- Average Score -->
            <div class="card h-full flex flex-col justify-between p-2 fiftyBorder items-center text-center col-span-2 md:col-span-1">
                <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
                    <span class="block text-surface-0 font-medium">Average Score</span>
                    <div class="text-surface-900 dark:text-surface-0 font-semibold text-3xl">
                        {{ stats.averageScore | number: '1.1-2' }}
                    </div>
                </ng-container>
            </div>
        </div>

        <!-- HOURLY SUBMISSIONS CHART -->
        <div class="card mb-4 p-4 fiftyBorder w-full">
            <div class="flex justify-between items-center mb-2">
                <span class="block text-surface-0 font-medium text-xl">Hourly Submissions</span>
                <p-datepicker [(ngModel)]="selectedDateRange" (onSelect)="onDateRangeChange()" selectionMode="range" dateFormat="dd/mm/yy" showIcon="true" placeholder="Select date range" class="w-auto"> </p-datepicker>
                <!-- <p-select 
      [(ngModel)]="selectedHourRange" 
      [options]="hourRangeOptions" 
      optionLabel="label" 
      optionValue="value" 
      (onChange)="onHourRangeChange()"
      class="w-40 md:w-auto"
    ></p-select> -->
            </div>
            <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
                <p-chart type="bar" [data]="hourlyChartData" [options]="hourlyChartOptions" class="w-full h-72 md:h-96"></p-chart>
            </ng-container>
        </div>

        <!-- SCORE DISTRIBUTION CHART -->
        <div class="card mb-4 p-4 fiftyBorder w-full">
            <div class="flex justify-between items-center mb-2">
                <span class="block text-surface-0 font-medium text-xl">Score Distribution</span>
            </div>
            <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
                <p-chart type="bar" [data]="scoreDistChartData" [options]="scoreDistChartOptions" class="w-full h-72 md:h-96"></p-chart>
            </ng-container>
        </div>

        <!-- QUESTION PERFORMANCE CHART -->
        <div class="card mb-4 p-4 fiftyBorder w-full">
            <div class="flex justify-between items-center mb-2">
                <span class="block text-surface-0 font-medium text-xl">Question Performance</span>
            </div>

            <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
                <p-chart type="line" [data]="questionChartData" [options]="questionChartOptions" class="w-full h-72 md:h-96"></p-chart>
            </ng-container>
        </div>

        <!-- EASIEST HARDEST QUESTIONS -->
        <div class="card mb-4 p-4 fiftyBorder w-full">
            <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
                <div *ngIf="easiestQuestions.length">
                    <div class="font-semibold text-green-400 mb-3">Easiest Questions</div>
                    <ul class="list-none p-0 m-0">
                        <li *ngFor="let q of easiestQuestions" class="flex flex-row md:items-center justify-between mb-4">
                            <div class="text-sm w-49/100 truncate cursor-pointer" [innerHTML]="getQuestionHtml(q)" [pTooltip]="getQuestionText(q)" tooltipPosition="top" tooltipEvent="focus" tooltipStyleClass="question-tooltip" tabindex="0"></div>
                            <div class="mt-2 mt-0 flex items-center w-49/100">
                                <p-progressBar [value]="q.correctRate * 100" styleClass="flex-1 p-progressbar-danger" [showValue]="false" [style]="{ height: '8px' }"></p-progressBar>
                                <span class="text-green-400 ml-3 font-medium">{{ q.correctRate * 100 | number: '1.0-0' }}%</span>
                            </div>
                        </li>
                    </ul>
                </div>

                <div class="flex justify-center">
                    <hr class="w-10/10 border-t" />
                </div>

                <div *ngIf="hardestQuestions.length">
                    <div class="font-semibold text-red-400 mb-3">Hardest Questions</div>
                    <ul class="list-none p-0 m-0">
                        <li *ngFor="let q of hardestQuestions" class="flex flex-row md:items-center justify-between mb-4">
                            <div class="text-sm w-49/100 truncate cursor-pointer" [innerHTML]="getQuestionHtml(q)" [pTooltip]="getQuestionText(q)" tooltipPosition="top" tooltipEvent="focus" tooltipStyleClass="question-tooltip" tabindex="0"></div>
                            <div class="mt-2 mt-0 flex items-center w-49/100">
                                <p-progressBar [value]="q.correctRate * 100" styleClass="flex-1 p-progressbar-danger" [showValue]="false" [style]="{ height: '8px' }"></p-progressBar>
                                <span class="text-red-400 ml-3 font-medium">{{ q.correctRate * 100 | number: '1.0-0' }}%</span>
                            </div>
                        </li>
                    </ul>
                </div>
            </ng-container>
        </div>

        <!-- AVERAGE THINKING TIME GRAPH -->
        <div class="card mb-4 p-4 fiftyBorder w-full">
            <div class="flex justify-between items-center mb-2">
                <span class="block text-surface-0 font-medium text-xl"> Average Thinking Time </span>
            </div>

            <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
                <p-chart type="line" [data]="thinkingTimeChartData" [options]="thinkingTimeChartOptions" class="w-full h-72 md:h-96"></p-chart>
            </ng-container>
        </div>

        <!-- LOCATION CHARTS -->
        <!-- <div class="flex flex-col md:flex-row gap-4 mb-4"> -->
        <!-- Submissions by City -->
        <!-- <div class="flex-1 flex flex-col card p-4 fiftyBorder min-h-[22rem]">
    <span class="block text-surface-0 font-medium mb-2 text-xl">Submissions by City</span>
    <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
      <div class="flex-grow flex items-center justify-center">
        <p-chart
          type="pie"
          [data]="locationChartData"
          [options]="locationChartOptions"
          class="w-full h-full"
        ></p-chart>
      </div>
    </ng-container>
  </div> -->

        <!-- Submissions by Country -->
        <!-- <div class="flex-1 flex flex-col card p-4 fiftyBorder min-h-[22rem]">
    <span class="block text-surface-0 font-medium mb-2 text-xl">Submissions by Country</span>
    <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
      <div id="geo_chart" class="flex-grow w-full h-full"></div>
    </ng-container>
  </div>
</div> -->

        <!-- LOCATION ANALYTICS -->
        <div class="card mb-4 p-4 fiftyBorder w-full">
            <div class="mb-4">
                <span class="block text-surface-0 font-medium text-xl mb-1">Location Analytics</span>
                <span class="block text-surface-400 text-sm">Geographic breakdown for {{ getQuizName() || 'the selected quiz' }}</span>
            </div>

            <ng-container *ngIf="loadingLocationStats">
                <div class="flex justify-center items-center h-72">
                    <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
                </div>
            </ng-container>

            <ng-container *ngIf="!loadingLocationStats && selectedQuizId && locationStats">
                <ng-container *ngIf="locationStats.totalResults > 0; else noLocationData">
                    <div class="mb-3 text-surface-600 dark:text-surface-400">
                        <p class="text-sm">
                            Total results analyzed: <strong>{{ locationStats.totalResults }}</strong>
                        </p>
                        <p class="text-sm">
                            Countries: <strong>{{ locationStats.countries.length }}</strong> | Cities: <strong>{{ locationStats.cities.length }}</strong>
                        </p>
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
                        <p-chart type="bar" [data]="cityChartData" [options]="cityChartOptions" class="w-full h-80"></p-chart>
                    </div>

                    <!-- Performance by Location -->
                    <div class="mb-6">
                        <h3 class="text-lg font-medium text-surface-700 dark:text-surface-200 mb-3">Performance by Country</h3>
                        <p-chart type="bar" [data]="performanceChartData" [options]="performanceChartOptions" class="w-full h-80"></p-chart>
                    </div>

                    <!-- Map Data (Simple List) -->
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
                                    <tr *ngFor="let country of locationStats.countries.slice(0, 15); let i = index" [class.bg-surface-50]="i % 2 === 0" [class.dark:bg-surface-800]="i % 2 === 0">
                                        <td class="px-4 py-2">{{ country.name }}</td>
                                        <td class="px-4 py-2 text-right">{{ country.count }}</td>
                                        <td class="px-4 py-2 text-right">{{ country.averageScore.toFixed(2) }}</td>
                                        <td class="px-4 py-2 text-right">{{ country.averageTime.toFixed(0) }}s</td>
                                        <td class="px-4 py-2 text-center text-xs text-surface-500">
                                            <span *ngIf="country.latitude && country.longitude"> {{ country.latitude.toFixed(2) }}, {{ country.longitude.toFixed(2) }} </span>
                                            <span *ngIf="!country.latitude || !country.longitude">-</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </ng-container>

                <ng-template #noLocationData>
                    <div class="text-center text-gray-500 dark:text-gray-400 flex items-center justify-center h-72">No location data available for Quiz #{{ selectedQuizId }}.</div>
                </ng-template>
            </ng-container>

            <ng-container *ngIf="!loadingLocationStats && !selectedQuizId">
                <div class="text-center text-gray-500 dark:text-gray-400 flex items-center justify-center h-48">Select a quiz above to view location analytics.</div>
            </ng-container>
        </div>
    `
})
export class QuizStatsSummaryComponent implements OnInit, OnDestroy {
    @ViewChild('worldMapCanvas', { static: false }) worldMapCanvas!: ElementRef<HTMLCanvasElement>;

    currentQuiz?: Quiz;
    selectedQuizId?: string;
    stats: any;
    loading = true;
    averageTimeHHMMSS = '';
    refreshing = false;

    // Cross-quiz overview
    weeklyStats: WeeklyQuizStat[] = [];
    loadingWeeklyOverview = true;
    weeklyChartData: any;
    weeklyChartOptions: any;

    // Location analytics
    locationStats: QuizLocationStats | null = null;
    loadingLocationStats = false;
    worldMapChart: Chart | null = null;
    cityChartData: any;
    cityChartOptions: any;
    performanceChartData: any;
    performanceChartOptions: any;

    liveViewerCount = 0;
    private liveSub?: Subscription;
    private liveRefreshTimer?: ReturnType<typeof setInterval>;
    private firestore = inject(Firestore);

    questionChartData: any;
    questionChartOptions: any;
    hourlyChartData: any;
    hourlyChartOptions: any;
    locationChartData: any;
    locationChartOptions: any;

    documentStyle: any;
    textColor: any;
    borderColor: any;
    textMutedColor: any;
    bgSurface: any;
    fiftyNeonGreen: any;
    quizIds: { label: string; value: string }[] = [];
    selectedDateRange: Date[] = [new Date(), new Date()]; // default to today

    thinkingTimeChartData: any;
    thinkingTimeChartOptions: any;
    scoreDistChartData: any;
    scoreDistChartOptions: any;

    hardestQuestions: { number: number; question: string; correctRate: number }[] = [];
    easiestQuestions: { number: number; question: string; correctRate: number }[] = [];

    hourRangeOptions = [
        { label: 'Last 1 Day', value: 1 },
        { label: 'Last 3 Days', value: 3 },
        { label: 'Last 5 Days', value: 5 },
        { label: 'Last Week', value: 7 }
    ];
    selectedHourRange = 3;

    private googleChartsPromise: Promise<void> | null = null;

    constructor(
        private quizzesService: QuizzesService,
        private quizStatsService: QuizStatsService,
        private quizResultsService: QuizResultsService,
        private sanitizer: DomSanitizer
    ) {}

    async ngOnInit() {
        this.loading = true;

        this.documentStyle = getComputedStyle(document.documentElement);
        this.textColor = this.documentStyle.getPropertyValue('--text-color');
        this.borderColor = this.documentStyle.getPropertyValue('--surface-border');
        this.textMutedColor = this.documentStyle.getPropertyValue('--text-color-secondary');
        this.bgSurface = this.documentStyle.getPropertyValue('--p-surface-800');
        this.fiftyNeonGreen = this.documentStyle.getPropertyValue('--fifty-neon-green');

        // 1. Get active quiz
        this.currentQuiz = await firstValueFrom(this.quizzesService.getActiveQuiz());
        const activeQuizId = this.currentQuiz?.quizId.toString();

        // 2. Get all quiz IDs from quizAggregates
        const docIds = await this.quizStatsService.getAllQuizAggregateIds();
        this.quizIds = docIds.map((id) => ({ label: 'Quiz ' + id, value: id }));

        // 3. Default selected quiz
        this.selectedQuizId = activeQuizId || this.quizIds[0]?.value;

        await Promise.all([this.loadStats(this.selectedQuizId), this.loadGoogleCharts()]);
        this.subscribeToLiveViewers(this.selectedQuizId);

        setTimeout(() => this.drawGeoChart(), 800);
        this.loading = false;

        // Cross-quiz overview + per-quiz location analytics run independently of the
        // primary stats spinner so the page is interactive while they finish.
        this.loadWeeklyOverview();
        if (this.selectedQuizId) this.loadLocationStats(this.selectedQuizId);
    }

    ngOnDestroy() {
        this.liveSub?.unsubscribe();
        if (this.liveRefreshTimer) clearInterval(this.liveRefreshTimer);
        this.worldMapChart?.destroy();
    }

    /**
     * Subscribe to in-progress quizResults for this quiz and derive a live viewer count.
     * A viewer counts as "live" when status=in_progress, closedAt is null, and
     * lastActivityAt is within the last 3 minutes (heartbeat is every 2 min so this gives
     * one missed tick of slack before we drop them). Re-evaluates every 30s so viewers
     * with no writes still age out without needing a new snapshot.
     */
    private subscribeToLiveViewers(quizId?: string) {
        this.liveSub?.unsubscribe();
        if (this.liveRefreshTimer) clearInterval(this.liveRefreshTimer);
        this.liveViewerCount = 0;
        if (!quizId) return;

        const q = query(collection(this.firestore, 'quizResults'), where('quizId', '==', quizId), where('status', '==', 'in_progress'));
        let latest: any[] = [];
        const recompute = () => {
            const cutoff = Date.now() - 3 * 60 * 1000;
            this.liveViewerCount = latest.filter((r) => {
                if (r.closedAt) return false;
                const last = r.lastActivityAt?.toDate ? r.lastActivityAt.toDate().getTime() : r.lastActivityAt instanceof Date ? r.lastActivityAt.getTime() : 0;
                return last >= cutoff;
            }).length;
        };

        this.liveSub = (collectionData(q, { idField: 'resultId' }) as any).subscribe((rows: any[]) => {
            latest = rows || [];
            recompute();
        });
        this.liveRefreshTimer = setInterval(recompute, 30 * 1000);
    }

    getQuizName() {
        let quiz = this.quizIds.filter((x) => x.value == this.selectedQuizId);
        return quiz[0]?.label;
    }

    private loadGoogleCharts(): Promise<void> {
        if (this.googleChartsPromise) return this.googleChartsPromise;
        this.googleChartsPromise = new Promise((resolve) => {
            google.charts.load('current', { packages: ['geochart'] });
            google.charts.setOnLoadCallback(() => resolve());
        });
        return this.googleChartsPromise;
    }

    private async loadStats(quizId?: string) {
        if (!quizId) return;
        const [stats] = await Promise.all([this.quizStatsService.getQuizAggregatesFirestore(quizId), this.buildScoreDistribution(quizId)]);
        this.stats = stats;
        if (!this.stats) return;

        this.averageTimeHHMMSS = this.formatSecondsToHHMMSS(this.stats.averageTime || 0);

        setTimeout(() => {
            // Question Accuracy Chart
            this.questionChartData = {
                labels: this.stats.questionAccuracy.map((_: any, i: number) => `Q${i + 1}`),
                datasets: [
                    {
                        label: 'Correct Rate (%)',
                        data: this.stats.questionAccuracy.map((q: any) => q.correctRate * 100),
                        borderColor: this.documentStyle.getPropertyValue('--p-primary-300'),
                        tension: 0.35,
                        pointRadius: 3,
                        pointBackgroundColor: this.documentStyle.getPropertyValue('--p-primary-300'),
                        fill: true
                    }
                ]
            };

            this.questionChartOptions = {
                maintainAspectRatio: false,
                aspectRatio: 0.8,
                plugins: {
                    legend: { labels: { color: this.textColor } },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: {
                        ticks: { color: this.textMutedColor },
                        grid: { color: 'transparent', borderColor: 'transparent' }
                    },
                    y: {
                        max: 100,
                        beginAtZero: true,
                        title: { display: true, text: 'Percentage', color: this.textMutedColor },
                        ticks: { color: this.textMutedColor },
                        grid: { color: this.borderColor, borderColor: 'transparent', drawTicks: false }
                    }
                }
            };

            if (this.stats.completedCount > 0) {
                const questionMap = new Map((this.currentQuiz?.questions || []).map((q) => [q.questionId, q.question]));

                // Map hardest questions with question text
                this.hardestQuestions = this.stats.hardestQuestions.map((h: { questionId: number | string; correctRate: number }) => ({
                    number: Number(h.questionId),
                    question: questionMap.get(Number(h.questionId)) || `Q${h.questionId}`,
                    correctRate: h.correctRate
                }));

                this.easiestQuestions = this.stats.easiestQuestions.map((e: { questionId: number | string; correctRate: number }) => ({
                    number: Number(e.questionId),
                    question: questionMap.get(Number(e.questionId)) || `Q${e.questionId}`,
                    correctRate: e.correctRate
                }));
            } else {
                this.hardestQuestions = [];
                this.easiestQuestions = [];
            }

            // Generate initial hourly chart based on selectedHourRange
            this.generateHourlyChartForRange(new Date(), new Date());

            // THINKING TIME GRAPH

            const thinkingTimes = this.stats.avgTimeBetweenByQuestion || [];

            // Map labels and values from objects
            const questionLabels = thinkingTimes.map((x: { questionId: string; avgDiffSec: number }) => `Q${x.questionId}`);
            const avgTimes = thinkingTimes.map((x: { questionId: string; avgDiffSec: number }) => x.avgDiffSec);

            this.thinkingTimeChartData = {
                labels: questionLabels,
                datasets: [
                    {
                        label: 'Seconds',
                        data: avgTimes,
                        borderColor: this.documentStyle.getPropertyValue('--p-primary-300'),
                        pointBackgroundColor: this.documentStyle.getPropertyValue('--p-primary-300'),
                        tension: 0.35,
                        fill: true
                    }
                ]
            };

            this.thinkingTimeChartOptions = {
                maintainAspectRatio: false,
                aspectRatio: 0.8,
                plugins: {
                    legend: { labels: { color: this.textColor } },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Question', color: this.textMutedColor },
                        ticks: { color: this.textMutedColor },
                        grid: { color: 'transparent', borderColor: 'transparent' }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Seconds', color: this.textMutedColor },
                        ticks: { color: this.textMutedColor },
                        grid: { color: this.borderColor, borderColor: 'transparent', drawTicks: false }
                    }
                }
            };

            // City Pie Chart
            const cities = Object.keys(this.stats.locationCounts || {});
            const cityCounts = cities.map((c) => this.stats.locationCounts[c]);
            this.locationChartData = {
                labels: cities,
                datasets: [{ data: cityCounts, backgroundColor: ['#4ade80', '#f87171', '#60a5fa', '#fbbf24', '#a78bfa', '#facc15'] }]
            };
            this.locationChartOptions = { responsive: true, plugins: { legend: { position: 'bottom' } } };
        }, 300);
    }

    private async buildScoreDistribution(quizId: string) {
        const results = await firstValueFrom(this.quizResultsService.getQuizResults(quizId));
        const completed = results.filter((r) => r.status === 'completed' && r.score != null);

        const counts = new Array(51).fill(0);
        for (const r of completed) {
            const score = Math.min(Math.max(r.score!, 0), 50);
            counts[score]++;
        }

        this.scoreDistChartData = {
            labels: Array.from({ length: 51 }, (_, i) => String(i)),
            datasets: [
                {
                    label: 'Users',
                    data: counts,
                    backgroundColor: this.fiftyNeonGreen,
                    borderRadius: 4,
                    borderSkipped: false
                }
            ]
        };

        this.scoreDistChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 0.8,
            plugins: {
                legend: { labels: { color: this.textColor } },
                tooltip: {
                    callbacks: {
                        label: (tooltipItem: TooltipItem<'bar'>) => `Sessions: ${tooltipItem.formattedValue}`
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Score', color: this.textMutedColor },
                    ticks: { color: this.textMutedColor },
                    grid: { color: 'transparent', borderColor: 'transparent' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Number of Sessions', color: this.textMutedColor },
                    ticks: { color: this.textMutedColor, stepSize: 1 },
                    grid: { color: this.borderColor, borderColor: 'transparent', drawTicks: false }
                }
            }
        };
    }

    private generateHourlyChartForRange(startDate: Date, endDate: Date) {
        if (!this.stats?.hourlyCounts) return;

        const hourlyLabels: string[] = [];
        const hourlyCounts: number[] = [];

        const current = new Date(startDate);
        while (current <= endDate) {
            for (let hour = 0; hour < 24; hour++) {
                const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')} ${String(hour).padStart(2, '0')}`;
                hourlyLabels.push(`${String(current.getDate()).padStart(2, '0')}/${String(current.getMonth() + 1).padStart(2, '0')} ${hour}:00`);
                hourlyCounts.push(this.stats.hourlyCounts[key] ?? 0);
            }
            current.setDate(current.getDate() + 1);
        }

        this.hourlyChartData = {
            labels: hourlyLabels,
            datasets: [
                {
                    label: 'Submissions',
                    data: hourlyCounts,
                    backgroundColor: this.fiftyNeonGreen,
                    borderRadius: 4,
                    borderSkipped: false
                }
            ]
        };

        this.hourlyChartOptions = {
            responsive: true,
            plugins: {
                legend: { labels: { color: this.textColor } },
                tooltip: {
                    callbacks: {
                        label: (tooltipItem: TooltipItem<'bar'>) => `Submissions: ${tooltipItem.formattedValue}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Count', color: this.textMutedColor },
                    ticks: { color: this.textMutedColor },
                    grid: { color: this.borderColor, borderColor: 'transparent', drawTicks: false }
                },
                x: {
                    title: { display: true, text: 'Date/Hour', color: this.textMutedColor },
                    ticks: { color: this.textMutedColor },
                    grid: { color: 'transparent', borderColor: 'transparent' }
                }
            },
            maintainAspectRatio: false,
            aspectRatio: 0.8
        };
    }

    // onHourRangeChange() {
    //   if (!this.stats) return;
    //   this.generateHourlyChart(this.selectedHourRange);
    // }

    onDateRangeChange() {
        if (!this.stats || !this.selectedDateRange || this.selectedDateRange.length !== 2) return;

        const [startDate, endDate] = this.selectedDateRange;
        this.generateHourlyChartForRange(startDate, endDate);
    }

    private drawGeoChart() {
        if (!this.stats?.locationCounts) return;
        const container = document.getElementById('geo_chart');
        if (!container) return;

        const countryCounts: Record<string, number> = {};
        for (const key of Object.keys(this.stats.locationCounts)) {
            const [country] = key.split(' - ');
            countryCounts[country] = (countryCounts[country] || 0) + this.stats.locationCounts[key];
        }

        const dataArray: (string | number)[][] = [['Country', 'Submissions']];
        for (const [country, count] of Object.entries(countryCounts)) {
            dataArray.push([String(country), Number(count)]);
        }

        const data = google.visualization.arrayToDataTable(dataArray);
        const options = { displayMode: 'regions', colorAxis: { colors: ['#cce5ff', this.fiftyNeonGreen] }, backgroundColor: this.bgSurface, legend: 'none', tooltip: { isHtml: true } };
        const chart = new google.visualization.GeoChart(container);
        chart.draw(data, options);
    }

    private formatSecondsToHHMMSS(seconds: number): string {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }

    getQuestionText(q: any): string {
        const stripped = q.question.replace(/<[^>]+>/g, '');
        return `${q.number}. ${stripped}`;
    }

    getQuestionHtml(q: any): SafeHtml {
        let question = q.question;

        // Strip HTML tags at the start
        question = question.replace(/^(\s*<[^>]+>)+/, '');
        // Strip HTML tags at the end
        question = question.replace(/(<[^>]+>\s*)+$/, '');

        const combined = `${q.number}. ${question}`;
        return this.sanitizer.bypassSecurityTrustHtml(combined);
    }

    refreshStats() {
        if (!this.selectedQuizId) return;
        this.refreshing = true;

        this.subscribeToLiveViewers(this.selectedQuizId);
        this.loadStats(this.selectedQuizId).finally(() => {
            this.refreshing = false;
        });
        this.loadLocationStats(this.selectedQuizId);
    }

    private async loadWeeklyOverview() {
        this.loadingWeeklyOverview = true;
        try {
            const sortedIds = (await this.quizStatsService.getAllQuizAggregateIds())
                .map((id) => parseInt(id, 10))
                .filter((id) => !isNaN(id))
                .sort((a, b) => b - a);

            const results = await Promise.all(
                sortedIds.map(async (quizId) => {
                    const aggregate = await this.quizStatsService.getQuizAggregatesFirestore(String(quizId));
                    if (!aggregate) return null;
                    const completedCount = aggregate.completedCount || 0;
                    const totalScore = aggregate.totalScore || 0;
                    return {
                        quizId: String(quizId),
                        completedCount,
                        averageScore: completedCount > 0 ? totalScore / completedCount : 0
                    } as WeeklyQuizStat;
                })
            );

            this.weeklyStats = results.filter((s): s is WeeklyQuizStat => s !== null && s.completedCount > 0).slice(0, 20);
            this.initWeeklyOverviewChart();
        } catch (error) {
            console.error('Error loading weekly overview:', error);
        } finally {
            this.loadingWeeklyOverview = false;
        }
    }

    private initWeeklyOverviewChart() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const borderColor = documentStyle.getPropertyValue('--surface-border');
        const primaryColor = documentStyle.getPropertyValue('--p-primary-500');

        const sortedStats = [...this.weeklyStats].sort((a, b) => parseInt(a.quizId) - parseInt(b.quizId));
        const labels = sortedStats.map((stat) => `Quiz #${stat.quizId}`);

        this.weeklyChartData = {
            labels,
            datasets: [
                {
                    label: 'Completed Sessions',
                    data: sortedStats.map((s) => s.completedCount),
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Average Score',
                    data: sortedStats.map((s) => s.averageScore),
                    type: 'line',
                    borderColor: '#fbe2df',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#fbe2df',
                    yAxisID: 'y1',
                    tension: 0.3
                }
            ]
        };

        this.weeklyChartOptions = {
            maintainAspectRatio: false,
            responsive: true,
            interaction: { mode: 'index' as const, intersect: false },
            plugins: {
                legend: { display: true, labels: { color: textColor } },
                tooltip: {
                    callbacks: {
                        label: (context: any) => (context.datasetIndex === 0 ? `Completed Sessions: ${context.parsed.y}` : `Average Score: ${context.parsed.y.toFixed(2)}`)
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Weekly Quiz', color: textColor },
                    ticks: { color: textColor },
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

    private initLocationCharts() {
        if (!this.locationStats) return;

        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const borderColor = documentStyle.getPropertyValue('--surface-border');

        // World map needs the canvas to be in the DOM after the *ngIf flips.
        setTimeout(() => this.initWorldMap(), 100);

        const topCities = this.locationStats.cities.slice(0, 10);
        this.cityChartData = {
            labels: topCities.map((c) => c.name),
            datasets: [
                {
                    label: 'Completions by City',
                    data: topCities.map((c) => c.count),
                    backgroundColor: '#4cfbab',
                    borderColor: '#4cfbab',
                    borderWidth: 1
                }
            ]
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
                x: { ticks: { color: textColor, beginAtZero: true }, grid: { color: borderColor } },
                y: { ticks: { color: textColor }, grid: { color: borderColor } }
            }
        };

        const topPerformance = this.locationStats.countries.slice(0, 8);
        this.performanceChartData = {
            labels: topPerformance.map((c) => c.name),
            datasets: [
                {
                    label: 'Average Score',
                    data: topPerformance.map((c) => c.averageScore.toFixed(2)),
                    backgroundColor: '#4cfbab',
                    borderColor: '#4cfbab',
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Avg Time (seconds)',
                    data: topPerformance.map((c) => c.averageTime.toFixed(0)),
                    backgroundColor: '#fbe2df',
                    borderColor: '#fbe2df',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        };

        this.performanceChartOptions = {
            maintainAspectRatio: false,
            responsive: true,
            interaction: { mode: 'index' as const, intersect: false },
            plugins: {
                legend: { display: true, labels: { color: textColor } }
            },
            scales: {
                x: { ticks: { color: textColor }, grid: { color: borderColor } },
                y: {
                    type: 'linear' as const,
                    display: true,
                    position: 'left' as const,
                    title: { display: true, text: 'Average Score', color: textColor },
                    ticks: { color: textColor, beginAtZero: true },
                    grid: { color: borderColor }
                },
                y1: {
                    type: 'linear' as const,
                    display: true,
                    position: 'right' as const,
                    title: { display: true, text: 'Avg Time (seconds)', color: textColor },
                    ticks: { color: textColor, beginAtZero: true },
                    grid: { drawOnChartArea: false }
                }
            }
        };
    }

    private async initWorldMap() {
        if (!this.worldMapCanvas || !this.locationStats) return;

        if (this.worldMapChart) {
            this.worldMapChart.destroy();
        }

        try {
            const response = await fetch('https://unpkg.com/world-atlas@2/countries-110m.json');
            const worldData = await response.json();

            const topojson = await import('topojson-client');
            const countries: any = topojson.feature(worldData, worldData.objects.countries);

            const countryMap = new Map(this.locationStats.countries.map((c) => [c.name.toLowerCase(), c.count]));

            const chartData = countries.features.map((feature: any) => {
                const countryName = feature.properties.name?.toLowerCase() || '';
                return { feature, value: countryMap.get(countryName) || 0 };
            });

            const ctx = this.worldMapCanvas.nativeElement.getContext('2d');
            if (!ctx) return;

            const neonGreen = getComputedStyle(document.documentElement).getPropertyValue('--p-primary-500') || '#00ff87';

            this.worldMapChart = new Chart(ctx, {
                type: 'choropleth',
                data: {
                    labels: countries.features.map((f: any) => f.properties.name),
                    datasets: [
                        {
                            label: 'Quiz Completions',
                            outline: countries.features,
                            data: chartData,
                            backgroundColor: (context: any) => {
                                const value = context.raw?.value || 0;
                                return value > 0 ? neonGreen : 'rgba(200, 200, 200, 0.3)';
                            },
                            borderColor: '#666',
                            borderWidth: 0.5
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
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
                        projection: { axis: 'x', projection: 'equalEarth' }
                    }
                } as any
            } as any);
        } catch (error) {
            console.error('Error initializing world map:', error);
        }
    }
}
