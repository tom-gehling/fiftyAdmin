import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserTimePatterns } from '@/shared/models/userStats.model';

@Component({
    standalone: true,
    selector: 'app-stats-completion-times',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card p-4 sm:p-6 fiftyBorder h-full overflow-hidden" style="background: rgb(40, 40, 40); border-radius: 1rem;">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-2xl font-semibold m-0">Time on the clock</h3>
                <i class="pi pi-stopwatch" style="color: var(--fifty-neon-green);"></i>
            </div>

            <div class="grid grid-cols-1 gap-3">
                <div class="min-w-0 rounded-xl p-4 overflow-hidden" style="background: rgba(76, 251, 171, 0.10); border: 1px solid rgba(76, 251, 171, 0.30);">
                    <div class="text-xs uppercase tracking-wide text-gray-400 truncate">Fastest</div>
                    <div class="text-3xl sm:text-4xl font-bold mt-1 leading-none tabular-nums truncate" style="color: var(--fifty-neon-green);">{{ formatHHMMSS(patterns.fastestSeconds) }}</div>
                    <div class="text-xs text-gray-400 mt-2 break-words">{{ fastestCopy() }}</div>
                </div>

                <div class="min-w-0 rounded-xl p-4 overflow-hidden" style="background: rgba(196, 165, 255, 0.10); border: 1px solid rgba(196, 165, 255, 0.30);">
                    <div class="text-xs uppercase tracking-wide text-gray-400 truncate">Average</div>
                    <div class="text-3xl sm:text-4xl font-bold mt-1 leading-none tabular-nums truncate" style="color: #c4a5ff;">{{ formatHHMMSS(patterns.averageSeconds) }}</div>
                    <div class="text-xs text-gray-400 mt-2 break-words">Your typical pace.</div>
                </div>

                <div class="min-w-0 rounded-xl p-4 overflow-hidden" style="background: rgba(251, 226, 223, 0.08); border: 1px solid rgba(251, 226, 223, 0.30);">
                    <div class="text-xs uppercase tracking-wide text-gray-400 truncate">Longest</div>
                    <div class="text-3xl sm:text-4xl font-bold mt-1 leading-none tabular-nums truncate" style="color: var(--fifty-pink);">{{ formatHHMMSS(patterns.slowestSeconds) }}</div>
                    <div class="text-xs text-gray-400 mt-2 break-words">{{ slowestCopy() }}</div>
                </div>
            </div>
        </div>
    `
})
export class CompletionTimesWidget {
    @Input({ required: true }) patterns!: UserTimePatterns;

    formatHHMMSS(s: number | null): string {
        if (s == null) return '—';
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const r = s % 60;
        return `${pad(h)}:${pad(m)}:${pad(r)}`;
    }

    fastestCopy(): string {
        const s = this.patterns?.fastestSeconds;
        if (s == null) return '';
        if (s < 300) return 'Speed-runner energy.';
        if (s < 900) return 'A confident pace.';
        return 'Tidy and to the point.';
    }

    slowestCopy(): string {
        const s = this.patterns?.slowestSeconds;
        if (s == null) return '';
        if (s > 2400) return "You really sat with this one.";
        if (s > 1500) return 'Took your time.';
        return 'Considered it carefully.';
    }
}

function pad(n: number): string {
    return n.toString().padStart(2, '0');
}
