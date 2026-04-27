import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { Subscription } from 'rxjs';
import { LayoutService } from '../../../../layout/service/layout.service';
import { UserHistoryPoint } from '@/shared/models/userStats.model';

@Component({
    standalone: true,
    selector: 'app-stats-trajectory-chart',
    imports: [CommonModule, ChartModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [
        `
            p-chart,
            :host ::ng-deep p-chart,
            :host ::ng-deep p-chart > div,
            :host ::ng-deep p-chart canvas {
                display: block !important;
                width: 100% !important;
                height: 100% !important;
            }
        `
    ],
    template: `
    @if (history.length) {
        <div class="card p-4 sm:p-6 fiftyBorder overflow-hidden" style="background: rgb(40, 40, 40); border-radius: 1rem;">
            <div class="flex items-center justify-between mb-1 gap-2 flex-wrap">
                <h3 class="text-2xl font-semibold m-0">Your Score History</h3>
            </div>
            <p class="text-base text-gray-400 mb-3 mt-1">{{ subtitle }}</p>

                <div class="relative w-full" style="height: 220px;">
                    <p-chart type="line" [data]="chartData" [options]="chartOptions" styleClass="w-full h-full"></p-chart>
                </div>
                <div class="text-center text-gray-400 py-10">No history yet — your first quiz starts the line.</div>
        </div>
    }
    `
})
export class TrajectoryChartWidget implements OnInit, OnDestroy {
    @Input({ required: true }) history: UserHistoryPoint[] = [];
    @Input() subtitle = 'Your score on each weekly quiz, against the member average.';

    chartData: any;
    chartOptions: any;

    private layoutService = inject(LayoutService);
    private sub = new Subscription();

    ngOnInit() {
        this.sub.add(this.layoutService.configUpdate$.subscribe(() => this.initChart()));
        this.initChart();
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }

    private initChart() {
        const labels = this.history.map((h) => `#${h.quizId}`);
        const userData = this.history.map((h) => h.score);
        const avgData = this.history.map((h) => +h.quizAvgScore.toFixed(1));
        const pbStars = this.history.map((h) => (h.wasPersonalBestAtTime ? h.score : null));

        this.chartData = {
            labels,
            datasets: [
                {
                    label: 'Members avg',
                    data: avgData,
                    borderColor: 'rgba(251, 226, 223, 0.45)',
                    backgroundColor: 'rgba(251, 226, 223, 0.45)',
                    tension: 0.35,
                    fill: false,
                    borderDash: [6, 6],
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    order: 2
                },
                {
                    label: 'Your score',
                    data: userData,
                    borderColor: '#4cfbab',
                    backgroundColor: '#4cfbab',
                    tension: 0.3,
                    fill: false,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    order: 1
                },
                {
                    label: 'Personal best',
                    data: pbStars,
                    borderColor: 'transparent',
                    backgroundColor: '#fbe2df',
                    pointStyle: 'star',
                    pointRadius: 9,
                    pointHoverRadius: 11,
                    showLine: false,
                    order: 0
                }
            ]
        };

        this.chartOptions = {
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#cccccc', usePointStyle: true, boxWidth: 8 }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx: any) => {
                            if (ctx.dataset.label === 'Personal best') return ctx.parsed.y == null ? '' : `★ Personal best: ${ctx.parsed.y}/50`;
                            return `${ctx.dataset.label}: ${ctx.parsed.y}/50`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: false },
                    ticks: { color: '#999999', maxRotation: 0, autoSkipPadding: 12 },
                    grid: { color: 'transparent', borderColor: 'transparent' }
                },
                y: {
                    min: 0,
                    max: 50,
                    title: { display: true, text: 'Score', color: '#999999' },
                    ticks: { color: '#999999', stepSize: 10 },
                    grid: { color: 'rgba(255,255,255,0.06)', borderColor: 'transparent' }
                }
            }
        };
    }
}
