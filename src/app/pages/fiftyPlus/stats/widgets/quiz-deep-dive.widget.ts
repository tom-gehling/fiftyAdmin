import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { Subscription } from 'rxjs';
import { LayoutService } from '../../../../layout/service/layout.service';
import { QuizDeepDive } from '@/shared/models/userStats.model';

const CORRECT = '#4cfbab';
const WRONG = '#fbe2df';

@Component({
    standalone: true,
    selector: 'app-stats-quiz-deep-dive',
    imports: [CommonModule, FormsModule, ChartModule, SelectModule],
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
        <div class="card p-4 sm:p-6 fiftyBorder overflow-hidden" style="background: radial-gradient(circle at top left, rgba(76, 251, 171, 0.08), transparent 60%), rgb(28, 28, 28); border-radius: 1.25rem;">
            <div class="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
                <div class="min-w-0 flex-1">
                    <h3 class="text-3xl font-semibold m-0 break-words">Quiz deep-dive</h3>
                    <p class="text-base text-gray-400 mt-1 break-words">Each question's difficulty, with how you fared.</p>
                </div>
                <p-select
                    [options]="selectOptions()"
                    [(ngModel)]="selectedQuizId"
                    (onChange)="onQuizChange($event.value)"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Pick a quiz"
                    class="w-full sm:w-72 max-w-full"
                    appendTo="body"
                ></p-select>
            </div>

            <ng-container *ngIf="selected() as q; else noData">
                <div class="grid grid-cols-2 gap-3 mb-5">
                    <div class="min-w-0 rounded-xl p-3 overflow-hidden" style="background: rgba(76, 251, 171, 0.10); border: 1px solid rgba(76, 251, 171, 0.30);">
                        <div class="text-xs uppercase tracking-wide text-gray-400 truncate">Your score</div>
                        <div class="text-3xl font-bold mt-1 leading-none" style="color: var(--fifty-neon-green);">{{ q.userScore }}<span class="text-base text-gray-500">/{{ q.total }}</span></div>
                    </div>
                    <div class="min-w-0 rounded-xl p-3 overflow-hidden" style="background: rgba(196, 165, 255, 0.10); border: 1px solid rgba(196, 165, 255, 0.30);">
                        <div class="text-xs uppercase tracking-wide text-gray-400 truncate">Members avg</div>
                        <div class="text-3xl font-bold mt-1 leading-none" style="color: #c4a5ff;">{{ q.avgScore | number: '1.0-1' }}</div>
                    </div>
                </div>

                <div class="relative w-full h-[280px] sm:h-[560px]">
                    <p-chart type="bar" [data]="chartData" [options]="chartOptions" styleClass="w-full h-full"></p-chart>
                </div>

                <div class="flex items-center justify-center gap-6 mt-4 flex-wrap text-sm">
                    <div class="flex items-center gap-2">
                        <span class="inline-block w-3 h-3 rounded-sm" style="background: #4cfbab;"></span>
                        <span class="text-gray-300">You got it right</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="inline-block w-3 h-3 rounded-sm" style="background: #fbe2df;"></span>
                        <span class="text-gray-300">You missed it</span>
                    </div>
                </div>

                <p class="text-base text-gray-300 text-center mt-4 break-words">{{ insight() }}</p>
            </ng-container>

            <ng-template #noData>
                <div class="text-center text-gray-400 py-10">No completed quizzes to dig into yet.</div>
            </ng-template>
        </div>
    `
})
export class QuizDeepDiveWidget implements OnInit, OnDestroy {
    private _quizzes = signal<QuizDeepDive[]>([]);
    @Input({ required: true }) set quizzes(v: QuizDeepDive[]) {
        this._quizzes.set(v ?? []);
        if (!this.selectedQuizId && v?.length) {
            this.selectedQuizId = v[0].quizId;
        }
        this.rebuildChart();
    }

    selectedQuizId: number | null = null;

    selectOptions = computed(() => this._quizzes().map((q) => ({ label: `${q.quizLabel} · ${formatDate(q.completedAt)}`, value: q.quizId })));

    selected = computed<QuizDeepDive | null>(() => {
        const list = this._quizzes();
        if (!list.length) return null;
        return list.find((q) => q.quizId === this.selectedQuizId) ?? list[0];
    });

    hardestNailed = computed<number | null>(() => {
        const q = this.selected();
        if (!q) return null;
        const correct = q.questions.filter((x) => x.userCorrect);
        if (!correct.length) return null;
        const min = correct.reduce((m, x) => (x.globalCorrectRate < m ? x.globalCorrectRate : m), correct[0].globalCorrectRate);
        return Math.round(min);
    });

    insight = computed<string>(() => {
        const q = this.selected();
        if (!q) return '';
        const hardWins = q.questions.filter((x) => x.userCorrect && x.globalCorrectRate < 30).length;
        const easyMisses = q.questions.filter((x) => !x.userCorrect && x.globalCorrectRate > 80).length;
        if (hardWins >= 3) return `You cracked ${hardWins} brutally hard ones on this quiz. Stone-cold work.`;
        if (hardWins >= 1) return `One of yours was a question fewer than ${this.hardestNailed()}% of people got. Take that with you.`;
        if (easyMisses >= 3) return 'A few easy ones got away on this one. They will not, next week.';
        return q.userScore >= q.avgScore ? 'Above the average. The receipts speak for themselves.' : 'Bit of a tough one — your loyalty stat still ticked up, though.';
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

    onQuizChange(value: number) {
        this.selectedQuizId = value;
        this.rebuildChart();
    }

    private rebuildChart() {
        const q = this.selected();
        if (!q) return;

        const labels = q.questions.map((x) => `${x.questionNumber}`);
        const data = q.questions.map((x) => +x.globalCorrectRate.toFixed(1));
        const bg = q.questions.map((x) => (x.userCorrect ? CORRECT : WRONG));
        const border = q.questions.map((x) => (x.userCorrect ? CORRECT : WRONG));

        this.chartData = {
            labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Global correct %',
                    data,
                    backgroundColor: bg,
                    borderColor: border,
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.85,
                    categoryPercentage: 0.92
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
                        title: (ctxs: any[]) => `Question ${ctxs[0].label}`,
                        label: (ctx: any) => {
                            const question = q.questions[ctx.dataIndex];
                            const verdict = question.userCorrect ? '✓ You got it' : '✗ You missed it';
                            return [`${ctx.parsed.y}% of players got this right`, verdict];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Question', color: '#999999' },
                    ticks: { color: '#999999', autoSkipPadding: 8, maxRotation: 0 },
                    grid: { color: 'transparent', borderColor: 'transparent' }
                },
                y: {
                    min: 0,
                    max: 100,
                    title: { display: true, text: 'Players who got it right (%)', color: '#999999' },
                    ticks: { color: '#999999', stepSize: 20 },
                    grid: { color: 'rgba(255,255,255,0.06)', borderColor: 'transparent' }
                }
            }
        };
    }
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}
