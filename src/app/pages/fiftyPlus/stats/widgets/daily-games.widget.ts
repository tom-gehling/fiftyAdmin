import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailyGameStat, DailyGamesSummary } from '@/shared/models/userStats.model';

@Component({
    standalone: true,
    selector: 'app-stats-daily-games',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card p-4 sm:p-6 fiftyBorder overflow-hidden" style="background: linear-gradient(135deg, rgba(196, 165, 255, 0.10), rgba(40,40,40,1) 60%); border-radius: 1.25rem;">
            <div class="flex items-baseline justify-between mb-1 gap-2 flex-wrap">
                <h3 class="text-3xl font-semibold m-0">Daily games</h3>
                <span class="text-sm" style="color: #c4a5ff;">A puzzle a day, every day</span>
            </div>

            <ng-container *ngIf="dailyGames; else comingSoon">
                <p class="text-base text-gray-300 mb-4 break-words">{{ summary() }}</p>

                <div class="grid grid-cols-3 gap-3 mb-5">
                    <div class="min-w-0 text-center p-3 rounded-xl overflow-hidden" style="background: rgba(196, 165, 255, 0.10); border: 1px solid rgba(196, 165, 255, 0.25);">
                        <div class="text-4xl font-bold leading-none" style="color: #c4a5ff;">{{ dailyGames.totalDaysPlayed }}</div>
                        <div class="text-xs uppercase tracking-wide text-gray-400 mt-1 truncate">Days played</div>
                    </div>
                    <div class="min-w-0 text-center p-3 rounded-xl overflow-hidden" style="background: rgba(76, 251, 171, 0.10); border: 1px solid rgba(76, 251, 171, 0.25);">
                        <div class="text-4xl font-bold leading-none" style="color: var(--fifty-neon-green);">{{ dailyGames.totalSolves }}</div>
                        <div class="text-xs uppercase tracking-wide text-gray-400 mt-1 truncate">Solved</div>
                    </div>
                    <div class="min-w-0 text-center p-3 rounded-xl overflow-hidden" style="background: rgba(255, 200, 87, 0.10); border: 1px solid rgba(255, 200, 87, 0.25);">
                        <div class="text-4xl font-bold flex items-center justify-center gap-1 leading-none" style="color: #ffc857;">
                            <i class="pi pi-bolt text-xl"></i>{{ dailyGames.activeStreak }}
                        </div>
                        <div class="text-xs uppercase tracking-wide text-gray-400 mt-1 truncate">Streak</div>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div *ngFor="let g of dailyGames.games" class="min-w-0 overflow-hidden rounded-xl p-3 transition-transform hover:-translate-y-0.5" [style.background]="g.daysPlayed > 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)'" [style.border]="g.daysPlayed > 0 ? '1px solid rgba(196, 165, 255, 0.20)' : '1px dashed rgba(255,255,255,0.10)'">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="inline-flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0" style="background: rgba(196, 165, 255, 0.15);">
                                <i class="pi text-base" [class]="g.icon" style="color: #c4a5ff;"></i>
                            </span>
                            <div class="text-base font-semibold flex-1 min-w-0 truncate">{{ g.label }}</div>
                            <div *ngIf="g.currentStreak > 0" class="text-sm flex items-center gap-1 flex-shrink-0" style="color: #ffc857;">
                                <i class="pi pi-bolt text-xs"></i>{{ g.currentStreak }}
                            </div>
                        </div>

                        <ng-container *ngIf="g.daysPlayed > 0; else gameEmpty">
                            <div class="grid grid-cols-3 gap-2 text-center pt-2 border-t" style="border-color: rgba(255,255,255,0.06);">
                                <div class="min-w-0">
                                    <div class="text-base font-semibold truncate">{{ g.daysSolved }}/{{ g.daysPlayed }}</div>
                                    <div class="text-xs text-gray-400 truncate">Solved</div>
                                </div>
                                <div class="min-w-0">
                                    <div class="text-base font-semibold truncate">{{ formatTime(g.bestTimeSeconds) }}</div>
                                    <div class="text-xs text-gray-400 truncate">Best</div>
                                </div>
                                <div class="min-w-0">
                                    <div class="text-base font-semibold truncate">{{ g.successRate | number: '1.0-0' }}%</div>
                                    <div class="text-xs text-gray-400 truncate">Rate</div>
                                </div>
                            </div>
                        </ng-container>

                        <ng-template #gameEmpty>
                            <div class="text-sm text-gray-500 italic pt-1 break-words">Untouched — your blank canvas.</div>
                        </ng-template>
                    </div>
                </div>
            </ng-container>

            <ng-template #comingSoon>
                <div class="flex flex-col items-center justify-center text-center py-10">
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style="background: rgba(196, 165, 255, 0.15);">
                        <i class="pi pi-clock text-4xl" style="color: #c4a5ff;"></i>
                    </div>
                    <div class="text-2xl font-semibold mb-1">Daily games stats — coming soon</div>
                    <p class="text-base text-gray-400 max-w-md">Make Ten, Movie Emoji, Rush Hour, Chain, Country Jumble and Tile Run will all show up here once Daily Games lands.</p>
                </div>
            </ng-template>
        </div>
    `
})
export class DailyGamesWidget {
    @Input() dailyGames: DailyGamesSummary | null = null;

    summary(): string {
        if (!this.dailyGames) return '';
        const { totalDaysPlayed, totalSolves, activeStreak } = this.dailyGames;
        if (activeStreak >= 7) return `${activeStreak} days on the trot. The brain gym is open.`;
        if (totalSolves >= 100) return `${totalSolves} puzzles cracked across ${totalDaysPlayed} days. Sharp.`;
        if (totalSolves >= 10) return `${totalSolves} solves so far. Keep showing up.`;
        return 'Just getting started — every solve counts.';
    }

    formatTime(s: number | null): string {
        if (s == null) return '—';
        if (s < 60) return `${s}s`;
        const m = Math.floor(s / 60);
        const r = s % 60;
        return `${m}m ${r.toString().padStart(2, '0')}s`;
    }

    trackByGame(_: number, g: DailyGameStat): string {
        return g.game;
    }
}
