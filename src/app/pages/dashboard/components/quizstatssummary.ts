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
import { DatePickerModule } from 'primeng/datepicker';

declare const google: any;

@Component({
  standalone: true,
  selector: 'app-quiz-stats-summary',
  imports: [CommonModule, FormsModule, ChartModule, SelectModule, ProgressBarModule, DatePickerModule],
  template: `
  <div class="mb-2 flex items-center">
  <!-- Left spacer -->

  <div class="flex-1 flex justify-start">
   <p-select 
  [(ngModel)]="selectedQuizId" 
  [options]="quizIds" 
  optionLabel="label" 
  optionValue="value"
  (onChange)="refreshStats()"
  placeholder="Select Quiz"
  class="w-60 md:w-auto"
></p-select>
  </div>
  <!-- Title centered -->
  <h1 class="text-4xl md:text-6xl font-bold text-surface-900 dark:text-surface-0 text-center mt-1">
    {{getQuizName()}}
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
    <p-datepicker
  [(ngModel)]="selectedDateRange"
  (onSelect)="onDateRangeChange()"
  selectionMode="range"
  dateFormat="dd/mm/yy"
  showIcon="true"
  placeholder="Select date range"
  class="w-auto">
</p-datepicker>
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

<!-- AVERAGE THINKING TIME GRAPH -->
<div class="card mb-4 p-4 fiftyBorder w-full">
  <div class="flex justify-between items-center mb-2">
    <span class="block text-surface-0 font-medium text-xl">
      Average Thinking Time
    </span>
  </div>

  <ng-container *ngIf="!loading && !refreshing; else loadingSpinner">
    <p-chart
      type="line"
      [data]="thinkingTimeChartData"
      [options]="thinkingTimeChartOptions"
      class="w-full h-72 md:h-96"
    ></p-chart>
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
  quizIds: { label: string; value: string }[] = [];
  selectedDateRange: Date[] = [new Date(), new Date()]; // default to today

  thinkingTimeChartData: any;
  thinkingTimeChartOptions: any;

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
  this.quizIds = docIds.map(id => ({ label: 'Quiz ' + id, value: id }));

  // 3. Default selected quiz
  this.selectedQuizId = activeQuizId || this.quizIds[0]?.value;

  await Promise.all([
    this.loadStats(this.selectedQuizId),
    this.loadGoogleCharts()
  ]);

  setTimeout(() => this.drawGeoChart(), 800);
  this.loading = false;
}

  getQuizName(){
    let quiz = this.quizIds.filter(x => x.value == this.selectedQuizId)
    return quiz[0]?.label
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
    this.stats = await this.quizStatsService.getQuizAggregatesFirestore(quizId);
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
      this.generateHourlyChartForRange(new Date(), new Date());

     // THINKING TIME GRAPH
console.log(this.stats);

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
      const cityCounts = cities.map(c => this.stats.locationCounts[c]);
      this.locationChartData = {
        labels: cities,
        datasets: [{ data: cityCounts, backgroundColor: ['#4ade80','#f87171','#60a5fa','#fbbf24','#a78bfa','#facc15'] }]
      };
      this.locationChartOptions = { responsive: true, plugins: { legend: { position: 'bottom' } } };
    }, 300);
  }

  private generateHourlyChartForRange(startDate: Date, endDate: Date) {
  if (!this.stats?.hourlyCounts) return;

  const hourlyLabels: string[] = [];
  const hourlyCounts: number[] = [];

  const current = new Date(startDate);
  while (current <= endDate) {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2,'0')}-${String(current.getDate()).padStart(2,'0')} ${String(hour).padStart(2,'0')}`;
      hourlyLabels.push(`${String(current.getDate()).padStart(2,'0')}/${String(current.getMonth() + 1).padStart(2,'0')} ${hour}:00`);
      hourlyCounts.push(this.stats.hourlyCounts[key] ?? 0);
    }
    current.setDate(current.getDate() + 1);
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

    this.loadStats(this.selectedQuizId).finally(() => {
      this.refreshing = false;
    });
  }
}