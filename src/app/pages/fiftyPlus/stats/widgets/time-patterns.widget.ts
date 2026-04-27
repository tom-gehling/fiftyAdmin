import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserTimePatterns } from '@/shared/models/userStats.model';

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EMPTY: UserTimePatterns = {
    mostCommonHour: 0,
    mostCommonDow: 0,
    hourBuckets: new Array(24).fill(0),
    dowBuckets: new Array(7).fill(0),
    fastestSeconds: null,
    slowestSeconds: null,
    averageSeconds: null
};

@Component({
    standalone: true,
    selector: 'app-stats-time-patterns',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card p-4 sm:p-6 fiftyBorder h-full overflow-hidden" style="background: rgb(40, 40, 40); border-radius: 1rem;">
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-2xl font-semibold m-0">When you quiz</h3>
                <i class="pi pi-clock" style="color: var(--fifty-neon-green);"></i>
            </div>

            <p class="text-base text-gray-300 mb-4 break-words">{{ headline() }}</p>

            <div class="mb-4">
                <div class="text-sm uppercase tracking-wide text-gray-400 mb-2">Hour of day</div>
                <div class="grid grid-cols-12 gap-1">
                    <div *ngFor="let v of view().hourBuckets; let h = index" class="aspect-square rounded" [style.background]="hourCellColor(v)" [title]="hourLabel(h) + ': ' + v + ' quizzes'"></div>
                </div>
                <div class="flex justify-between text-xs text-gray-500 mt-1">
                    <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
                </div>
            </div>

            <div>
                <div class="text-sm uppercase tracking-wide text-gray-400 mb-2">Day of week</div>
                <div class="grid grid-cols-7 gap-2">
                    <div *ngFor="let v of view().dowBuckets; let d = index" class="text-center">
                        <div class="rounded-md py-2" [style.background]="dowCellColor(v)">
                            <div class="text-xl font-semibold">{{ v }}</div>
                        </div>
                        <div class="text-xs text-gray-500 mt-1">{{ dowLabel(d) }}</div>
                    </div>
                </div>
            </div>

        </div>
    `
})
export class TimePatternsWidget {
    private _patterns = signal<UserTimePatterns>(EMPTY);
    @Input({ required: true }) set patterns(v: UserTimePatterns) {
        this._patterns.set(v ?? EMPTY);
    }

    view = computed(() => this._patterns());

    private maxHour = computed(() => Math.max(1, ...this._patterns().hourBuckets));
    private maxDow = computed(() => Math.max(1, ...this._patterns().dowBuckets));

    headline = computed(() => {
        const p = this._patterns();
        const dow = DOW_LABELS[p.mostCommonDow] ?? 'Sun';
        const hour = this.hourLabel(p.mostCommonHour);
        return `${dow} at ${hour} is your moment.`;
    });

    hourCellColor(v: number): string {
        const max = this.maxHour();
        const intensity = max ? v / max : 0;
        if (!intensity) return 'rgba(255,255,255,0.04)';
        return `rgba(76, 251, 171, ${0.18 + intensity * 0.62})`;
    }

    dowCellColor(v: number): string {
        const max = this.maxDow();
        const intensity = max ? v / max : 0;
        if (!intensity) return 'rgba(255,255,255,0.04)';
        return `rgba(76, 251, 171, ${0.14 + intensity * 0.56})`;
    }

    hourLabel(h: number): string {
        if (h === 0) return '12am';
        if (h === 12) return '12pm';
        return h < 12 ? `${h}am` : `${h - 12}pm`;
    }

    dowLabel(d: number): string {
        return DOW_LABELS[d] ?? '';
    }
}
