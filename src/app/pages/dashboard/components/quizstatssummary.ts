import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { QuizStatsService } from '@/shared/services/quiz-stats.service';
import { Quiz } from '@/shared/models/quiz.model';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';

import type { TooltipItem } from 'chart.js';

declare const google: any;

@Component({
  standalone: true,
  selector: 'app-quiz-stats-summary',
  imports: [CommonModule, FormsModule, ChartModule, SelectModule, ProgressBarModule],
  template: `
  <div class="mb-2 flex items-center">
  <!-- Left spacer -->
  <div class="flex-1"></div>

  <!-- Title centered -->
  <h1 class="text-4xl md:text-6xl font-bold text-surface-900 dark:text-surface-0 text-center mt-1">
    {{currentQuiz?.quizTitle}}
  </h1>

  <!-- Refresh button at the end -->
  <div class="flex-1 flex justify-end">
    <button
      class="flex items-center justify-center hover:opacity-80 transition-opacity"
      (click)="refreshStats()"
      [disabled]="refreshing"
      title="Refresh Stats"
      style="color: var(--fifty-neon-green)"
    >
      <i
        class="pi text-xl"
        style="font-size: 1.5rem;"
        [ngClass]="refreshing ? 'pi-spin pi-spinner' : 'pi-refresh'"
      ></i>
    </button>
  </div>
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

  <!-- Currently Quizzing -->
  <div class="card h-full flex flex-col justify-between p-2 fiftyBorder items-center text-center">
    <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
      <span class="block text-surface-0 font-medium">Currently Quizzing</span>
      <div class="font-semibold text-3xl">{{ stats.inProgressCount }}</div>
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
        {{ stats.averageScore | number:'1.1-2' }}
      </div>
    </ng-container>
  </div>

</div>


<!-- HOURLY SUBMISSIONS CHART -->
<div class="card mb-4 p-4 fiftyBorder w-full">
  <div class="flex justify-between items-center mb-2">
    <span class="block text-surface-0 font-medium text-xl">Hourly Submissions</span>
    <p-select 
      [(ngModel)]="selectedHourRange" 
      [options]="hourRangeOptions" 
      optionLabel="label" 
      optionValue="value" 
      (onChange)="onHourRangeChange()"
      class="w-40 md:w-auto"
    ></p-select>
  </div>
  <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
    <p-chart 
      type="bar"
      [data]="hourlyChartData" 
      [options]="hourlyChartOptions" 
      class="w-full h-72 md:h-96"
    ></p-chart>
  </ng-container>
</div>

<!-- QUESTION PERFORMANCE CHART -->
<div class="card mb-4 p-4 fiftyBorder w-full">
  <div class="flex justify-between items-center mb-2">
    <span class="block text-surface-0 font-medium text-xl">Question Performance</span>
  </div>

  <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
    <p-chart
      type="line"
      [data]="questionChartData"
      [options]="questionChartOptions"
      class="w-full h-72 md:h-96"
    ></p-chart>
  </ng-container>
</div>



<!-- EASIEST HARDEST QUESTIONS -->
<div class="card mb-4 p-4 fiftyBorder w-full">
  <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
    <div *ngIf="easiestQuestions.length">
      <div class="font-semibold text-green-400 mb-3">Easiest Questions</div>
      <ul class="list-none p-0 m-0">
        <li *ngFor="let q of easiestQuestions" class="flex flex-row md:items-center justify-between mb-4">
          <div class="text-sm w-49/100 truncate" [innerHTML]="getQuestionHtml(q)"></div>
          <div class="mt-2 mt-0 flex items-center w-49/100">
            <p-progressBar [value]="q.correctRate * 100" styleClass="flex-1 p-progressbar-danger" [showValue]="false" [style]="{ height: '8px' }"></p-progressBar>
            <span class="text-green-400 ml-3 font-medium">{{ (q.correctRate * 100) | number:'1.0-0' }}%</span>
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
          <div class="text-sm w-49/100 truncate" [innerHTML]="getQuestionHtml(q)"></div>
          <div class="mt-2 mt-0 flex items-center w-49/100">
            <p-progressBar [value]="q.correctRate * 100" styleClass="flex-1 p-progressbar-danger" [showValue]="false" [style]="{ height: '8px' }"></p-progressBar>
            <span class="text-red-400 ml-3 font-medium">{{ (q.correctRate * 100) | number:'1.0-0' }}%</span>
          </div>
        </li>
      </ul>
    </div>
  </ng-container>
</div>

<!-- LOCATION CHARTS -->
<div class="flex flex-col md:flex-row gap-4 mb-4">
  <!-- Submissions by City -->
  <div class="flex-1 flex flex-col card p-4 fiftyBorder min-h-[22rem]">
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
  </div>

  <!-- Submissions by Country -->
  <div class="flex-1 flex flex-col card p-4 fiftyBorder min-h-[22rem]">
    <span class="block text-surface-0 font-medium mb-2 text-xl">Submissions by Country</span>
    <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
      <div id="geo_chart" class="flex-grow w-full h-full"></div>
    </ng-container>
  </div>
</div>






  `
})
export class QuizStatsSummaryComponent implements OnInit {
  currentQuiz?: Quiz;
  selectedQuizId?: string;
  stats: any;
  loading = true;
  averageTimeHHMMSS = '';
  refreshing = false;

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

  hardestQuestions: { number: number; question: string; correctRate: number }[] = [];
  easiestQuestions: { number: number; question: string; correctRate: number }[] = [];

  hourRangeOptions = [
    { label: 'Last 1 Day', value: 1 },
    { label: 'Last 3 Days', value: 3 },
    { label: 'Last 5 Days', value: 5 },
    { label: 'Last 7 Days', value: 7 }
  ];
  selectedHourRange = 3;

  private googleChartsPromise: Promise<void> | null = null;

  constructor(
    private quizzesService: QuizzesService,
    private quizStatsService: QuizStatsService,
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

    // Load quiz + stats
    this.currentQuiz = await firstValueFrom(this.quizzesService.getActiveQuiz());
    this.selectedQuizId = this.currentQuiz?.quizId.toString();
    console.log(this.currentQuiz);

    await Promise.all([
      this.loadStats(this.selectedQuizId),
      this.loadGoogleCharts()
    ]);

    setTimeout(() => this.drawGeoChart(), 800);

    this.loading = false;
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
    this.stats = await this.quizStatsService.getQuizAggregates(quizId);
    if (!this.stats) return;

    this.averageTimeHHMMSS = this.formatSecondsToHHMMSS(this.stats.averageTime || 0);

    setTimeout(() => {
      // Question Accuracy Chart
      this.questionChartData = {
  labels: this.stats.questionAccuracy.map((_: any, i: number) => `Q${i + 1}`),
  datasets: [{
    label: 'Correct Rate (%)',
    data: this.stats.questionAccuracy.map((q: any) => q.correctRate * 100),
    borderColor: this.documentStyle.getPropertyValue('--p-primary-300'),
    tension: 0.35,
    pointRadius: 3,
    pointBackgroundColor: this.documentStyle.getPropertyValue('--p-primary-300'),
    fill: true
  }]
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
        const questionMap = new Map(
          (this.currentQuiz?.questions || []).map(q => [q.questionId, q.question])
        );

      // Map hardest questions with question text
        this.hardestQuestions = this.stats.hardestQuestions.map(
          (h: { questionId: number | string; correctRate: number }) => ({
            number: Number(h.questionId),
            question: questionMap.get(Number(h.questionId)) || `Q${h.questionId}`,
            correctRate: h.correctRate
          })
        );

        this.easiestQuestions = this.stats.easiestQuestions.map(
          (e: { questionId: number | string; correctRate: number }) => ({
            number: Number(e.questionId),
            question: questionMap.get(Number(e.questionId)) || `Q${e.questionId}`,
            correctRate: e.correctRate
          })
        );
      } else {
        this.hardestQuestions = [];
        this.easiestQuestions = [];
      }

      // Generate initial hourly chart based on selectedHourRange
      this.generateHourlyChart(this.selectedHourRange);

      // City Pie Chart
      const cities = Object.keys(this.stats.locationCounts || {});
      const cityCounts = cities.map(c => this.stats.locationCounts[c]);
      this.locationChartData = {
        labels: cities,
        datasets: [{ data: cityCounts, backgroundColor: ['#4ade80','#f87171','#60a5fa','#fbbf24','#a78bfa','#facc15'] }]
      };
      this.locationChartOptions = { responsive: true, plugins: { legend: { position: 'bottom' } } };
    }, 300);
  }

  private generateHourlyChart(days: number) {
  if (!this.stats?.hourlyCounts) return;

  const now = new Date();
  const hourlyLabels: string[] = [];
  const hourlyCounts: number[] = [];
  const totalHours = days * 24;

  for (let i = totalHours - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
    hourlyLabels.push(d.toISOString()); // store ISO, we'll format in ticks
    hourlyCounts.push(this.stats.hourlyCounts[
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}`
    ] ?? 0);
  }

  this.hourlyChartData = {
  labels: hourlyLabels,
  datasets: [{
    label: 'Submissions',
    data: hourlyCounts,
    backgroundColor: this.fiftyNeonGreen,
    borderRadius: 4,
    borderSkipped: false
  }]
};


  this.hourlyChartOptions = {
  responsive: true,
  plugins: {
    legend: { labels: { color: this.textColor } },
    tooltip: {
      callbacks: {
        title: (tooltipItems: TooltipItem<'bar'>[]) => {
          const index = tooltipItems[0].dataIndex;
          const label = this.hourlyChartData.labels[index];
          const d = new Date(label);
          return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${d.getHours() % 12 || 12}${d.getHours() >= 12 ? 'PM' : 'AM'}`;
        },
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
      title: { display: true, text: 'Hour', color: this.textMutedColor },
      ticks: {
        color: this.textMutedColor,
        callback: (_value: any, index: number) => {
          if (index % 2 !== 0) return '';
          const d = new Date(this.hourlyChartData.labels[index]);
          return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${d.getHours() % 12 || 12}${d.getHours() >= 12 ? 'PM' : 'AM'}`;
        }
      },
      grid: { color: 'transparent', borderColor: 'transparent' }
    }
  },
  maintainAspectRatio: false,
  aspectRatio: 0.8
};
  }

  onHourRangeChange() {
    if (!this.stats) return;
    this.generateHourlyChart(this.selectedHourRange);
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

    const dataArray: (string|number)[][] = [['Country','Submissions']];
    for (const [country,count] of Object.entries(countryCounts)) {
      dataArray.push([String(country), Number(count)]);
    }

    const data = google.visualization.arrayToDataTable(dataArray);
    const options = { displayMode:'regions', colorAxis:{colors:['#cce5ff',this.fiftyNeonGreen]}, backgroundColor:this.bgSurface, legend:'none', tooltip:{isHtml:true} };
    const chart = new google.visualization.GeoChart(container);
    chart.draw(data, options);
  }

  private formatSecondsToHHMMSS(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const pad = (n:number)=>n.toString().padStart(2,'0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }

  getQuestionHtml(q: any): SafeHtml {
    const combined = `${q.number}. ${q.question}`;
    return this.sanitizer.bypassSecurityTrustHtml(combined);
  }

  refreshStats() {
    if (!this.selectedQuizId) return;
    this.refreshing = true;

    this.loadStats(this.selectedQuizId).finally(() => {
      this.refreshing = false;
    });
  }
}