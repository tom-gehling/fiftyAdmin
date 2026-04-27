import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { Subscription } from 'rxjs';
import { LayoutService } from '../../../../layout/service/layout.service';
import { UserCategoryStat } from '@/shared/models/userStats.model';

const PALETTE = ['#4cfbab', '#fbe2df', '#c4a5ff', '#ffc857', '#7dd3fc', '#fda4af', '#86efac', '#fcd34d'];

@Component({
    standalone: true,
    selector: 'app-stats-category-strengths',
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
        <div class="card p-4 sm:p-6 fiftyBorder h-full overflow-hidden" style="background: radial-gradient(circle at top right, rgba(196, 165, 255, 0.08), transparent 60%), rgb(28, 28, 28); border-radius: 1.25rem;">
            <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <h3 class="text-3xl font-semibold m-0">Your topics</h3>
                <span class="text-sm text-gray-400">vs. all members</span>
            </div>

            <div *ngIf="topStrength() as best" class="mb-4 p-4 rounded-xl flex items-center gap-3 overflow-hidden" style="background: rgba(76, 251, 171, 0.10); border: 1px solid rgba(76, 251, 171, 0.35);">
                <div class="inline-flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0" style="background: rgba(76, 251, 171, 0.2);">
                    <i class="pi pi-graduation-cap text-3xl" style="color: var(--fifty-neon-green);"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-sm uppercase tracking-wide truncate" style="color: var(--fifty-neon-green);">Your specialty</div>
                    <div class="font-semibold text-2xl break-words">{{ best.category | titlecase }}</div>
                    <div class="text-sm text-gray-300 break-words">{{ best.correctRate | number: '1.0-1' }}% correct — {{ best.correctRateVsGlobal >= 0 ? '+' : '' }}{{ best.correctRateVsGlobal | number: '1.0-1' }}pts vs everyone else.</div>
                </div>
            </div>

            <div *ngIf="ordered().length" class="relative w-full" style="height: 360px;">
                <p-chart type="radar" [data]="chartData" [options]="chartOptions" styleClass="w-full h-full"></p-chart>
            </div>

            <div class="space-y-2 mt-4">
                <div *ngFor="let cat of ordered(); let i = index" class="flex items-center gap-3">
                    <span class="inline-block w-3 h-3 rounded-full flex-shrink-0" [style.background]="colorAt(i)"></span>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between text-base">
                            <span class="font-medium truncate">{{ cat.category | titlecase }}</span>
                            <span class="text-gray-400 text-sm flex-shrink-0 ml-2">{{ cat.correct }}/{{ cat.attempts }}</span>
                        </div>
                        <div class="relative h-1.5 rounded-full overflow-hidden mt-1" style="background: rgba(255,255,255,0.06);">
                            <div class="absolute inset-y-0 left-0 rounded-full transition-all" [style.width.%]="cat.correctRate" [style.background]="colorAt(i)"></div>
                        </div>
                    </div>
                    <span class="text-base font-semibold flex-shrink-0" [style.color]="colorAt(i)">{{ cat.correctRate | number: '1.0-0' }}%</span>
                </div>
            </div>

            <div *ngIf="!_categories().length" class="text-center text-gray-400 py-6">Categories will appear once you've answered a few quizzes.</div>
        </div>
    `
})
export class CategoryStrengthsWidget implements OnInit, OnDestroy {
    _categories = signal<UserCategoryStat[]>([]);
    @Input({ required: true }) set categories(v: UserCategoryStat[]) {
        this._categories.set(v ?? []);
        this.rebuildChart();
    }

    ordered = computed(() => [...this._categories()].sort((a, b) => b.correctRate - a.correctRate));

    topStrength = computed<UserCategoryStat | null>(() => {
        const ranked = [...this._categories()].filter((c) => c.attempts >= 20).sort((a, b) => b.correctRateVsGlobal - a.correctRateVsGlobal);
        return ranked[0] ?? null;
    });

    chartData: any;
    chartOptions: any;

    private layoutService = inject(LayoutService);
    private sub = new Subscription();

    ngOnInit() {
        this.sub.add(this.layoutService.configUpdate$.subscribe(() => this.rebuildChart()));
        this.rebuildChart();
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }

    colorAt(i: number): string {
        return PALETTE[i % PALETTE.length];
    }

    private rebuildChart() {
        const cats = this.ordered();
        if (!cats.length) return;
        const accent = '#4cfbab';
        this.chartData = {
            labels: cats.map((c) => c.category),
            datasets: [
                {
                    label: 'Correct rate',
                    data: cats.map((c) => +c.correctRate.toFixed(1)),
                    backgroundColor: this.hexWithAlpha(accent, 0.22),
                    borderColor: accent,
                    borderWidth: 2,
                    pointBackgroundColor: cats.map((_, i) => this.colorAt(i)),
                    pointBorderColor: '#181818',
                    pointBorderWidth: 1.5,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    fill: true,
                    tension: 0.2
                }
            ]
        };
        this.chartOptions = {
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx: any) => `${ctx.label}: ${ctx.raw}% correct`
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    suggestedMax: 100,
                    ticks: {
                        display: true,
                        color: 'rgba(204, 204, 204, 0.55)',
                        backdropColor: 'transparent',
                        stepSize: 25,
                        font: { size: 10 }
                    },
                    grid: { color: 'rgba(255,255,255,0.08)' },
                    angleLines: { color: 'rgba(255,255,255,0.10)' },
                    pointLabels: {
                        display: true,
                        color: '#e5e5e5',
                        font: { size: 13, weight: '600' as any }
                    }
                }
            }
        };
    }

    private hexWithAlpha(hex: string, alpha: number): string {
        const m = hex.replace('#', '');
        const r = parseInt(m.substring(0, 2), 16);
        const g = parseInt(m.substring(2, 4), 16);
        const b = parseInt(m.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}
