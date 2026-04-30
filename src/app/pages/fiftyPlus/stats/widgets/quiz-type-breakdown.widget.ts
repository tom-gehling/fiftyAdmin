import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizTypeBreakdown, QuizTypeKey } from '@/shared/models/userStats.model';
import { QuizTypeStyle, getQuizTypeStyle } from '@/shared/constants/quiz-type-styles';

@Component({
    standalone: true,
    selector: 'app-stats-quiz-type-breakdown',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card p-4 sm:p-6 fiftyBorder overflow-hidden" style="background: linear-gradient(135deg, rgba(40,40,40,1), rgba(28,28,28,1)); border-radius: 1.25rem;">
            <div class="flex items-center justify-between mb-4 gap-2 flex-wrap">
                <h3 class="text-3xl font-semibold m-0">Across every quiz</h3>
                <!-- <span class="text-sm text-gray-400">Each type, your way through it</span> -->
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div *ngFor="let row of breakdown" class="relative overflow-hidden min-w-0 rounded-xl p-4 transition-transform hover:-translate-y-1" [style.background]="cardBg(row.type)" [style.border]="border(row.type)" [style.boxShadow]="row.completed > 0 ? 'inset 0 0 32px ' + style(row.type).glow : 'none'">
                    <div class="flex items-center gap-2 mb-3 min-w-0">
                        <span class="inline-flex items-center justify-center rounded-full w-9 h-9 flex-shrink-0" [style.background]="style(row.type).chip" [style.color]="style(row.type).accent">
                            <i class="pi" [class]="style(row.type).icon"></i>
                        </span>
                        <div class="min-w-0">
                            <div class="text-xs uppercase tracking-widest font-semibold truncate" [style.color]="style(row.type).accent">{{ style(row.type).badge }}</div>
                            <div class="text-base font-medium truncate">{{ row.label }}</div>
                        </div>
                    </div>

                    <ng-container *ngIf="row.completed > 0; else empty">
                        <div class="text-6xl font-bold leading-none" [style.color]="style(row.type).accent">{{ row.completed }}</div>
                        <div class="text-sm uppercase tracking-wide text-gray-400 mt-1">Completed</div>

                        <div class="grid grid-cols-3 gap-2 mt-4 pt-3 border-t" style="border-color: rgba(255,255,255,0.08);">
                            <div class="min-w-0">
                                <div class="text-lg font-semibold truncate">{{ row.bestScore }}</div>
                                <div class="text-md uppercase text-gray-400 truncate">Best</div>
                            </div>
                            <div class="min-w-0">
                                <div class="text-lg font-semibold truncate">{{ row.averageScore | number: '1.0-1' }}</div>
                                <div class="text-md uppercase text-gray-400 truncate">Avg</div>
                            </div>
                            <div class="min-w-0">
                                <div class="text-lg font-semibold truncate">{{ row.correctRate | number: '1.0-0' }}%</div>
                                <div class="text-md uppercase text-gray-400 truncate">Correct</div>
                            </div>
                        </div>
                    </ng-container>

                    <ng-template #empty>
                        <div class="text-4xl font-bold text-gray-500 leading-none">—</div>
                        <div class="text-sm uppercase tracking-wide text-gray-500 mt-1 truncate">Not played yet</div>
                        <div class="text-sm text-gray-400 mt-3 break-words">Give this a go — you might find your sweet spot.</div>
                    </ng-template>
                </div>
            </div>
        </div>
    `
})
export class QuizTypeBreakdownWidget {
    @Input({ required: true }) breakdown: QuizTypeBreakdown[] = [];

    style(type: QuizTypeKey): QuizTypeStyle {
        return getQuizTypeStyle(type);
    }

    cardBg(type: QuizTypeKey): string {
        return `linear-gradient(160deg, ${this.style(type).chip}, rgba(20,20,20,0.95))`;
    }

    border(type: QuizTypeKey): string {
        return `1px solid ${this.style(type).chip}`;
    }
}
