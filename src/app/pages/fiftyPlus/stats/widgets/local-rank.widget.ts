import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserLocalRank } from '@/shared/models/userStats.model';

@Component({
    standalone: true,
    selector: 'app-stats-local-rank',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <ng-container *ngIf="shouldRender()">
            <div class="card p-4 sm:p-6 fiftyBorder h-full overflow-hidden" style="background: rgb(40, 40, 40); border-radius: 1rem;">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-2xl font-semibold m-0">In your patch</h3>
                    <i class="pi pi-map-marker" style="color: var(--fifty-neon-green);"></i>
                </div>

                <p class="text-base text-gray-300 mb-4 break-words">{{ headline() }}</p>

                <div class="grid grid-cols-2 gap-3">
                    <div class="min-w-0 p-3 rounded-lg overflow-hidden" style="background: rgba(76, 251, 171, 0.08);">
                        <div class="text-sm uppercase tracking-wide text-gray-400 truncate">{{ rank().city }}</div>
                        <div class="text-4xl font-bold mt-1 leading-none" style="color: var(--fifty-neon-green);">#{{ rank().cityRank | number }}</div>
                        <div class="text-sm text-gray-400 mt-1 truncate">of {{ rank().cityTotalPlayers | number }} players</div>
                    </div>
                    <div class="min-w-0 p-3 rounded-lg overflow-hidden" style="background: rgba(76, 251, 171, 0.04);">
                        <div class="text-sm uppercase tracking-wide text-gray-400 truncate">{{ rank().country }}</div>
                        <div class="text-4xl font-bold mt-1 leading-none">#{{ rank().countryRank | number }}</div>
                        <div class="text-sm text-gray-400 mt-1 truncate">of {{ rank().countryTotalPlayers | number }} players</div>
                    </div>
                </div>
            </div>
        </ng-container>
    `
})
export class LocalRankWidget {
    private _rank = signal<UserLocalRank | null>(null);
    @Input({ required: true }) set localRank(v: UserLocalRank) {
        this._rank.set(v);
    }

    rank = computed<UserLocalRank>(() => this._rank() ?? ({ city: null, cityRank: null, cityTotalPlayers: null, cityAvgScore: null, country: null, countryRank: null, countryTotalPlayers: null } as UserLocalRank));

    shouldRender = computed(() => {
        const r = this.rank();
        if (!r.city || r.cityRank == null || !r.cityTotalPlayers) return false;
        // Only render if user is in top 50% of their city — keeps it flattering.
        return r.cityRank / r.cityTotalPlayers <= 0.5;
    });

    headline = computed(() => {
        const r = this.rank();
        if (!r.cityRank || !r.cityTotalPlayers || !r.city) return '';
        const pct = Math.round((1 - r.cityRank / r.cityTotalPlayers) * 100);
        return `Top ${100 - pct}% in ${r.city} over the last 12 weeks.`;
    });
}
