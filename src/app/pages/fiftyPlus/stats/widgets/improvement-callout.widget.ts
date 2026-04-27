import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-stats-improvement-callout',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card p-5 sm:p-6 fiftyBorder flex items-center gap-4 overflow-hidden" [style.background]="bg()" style="border-radius: 1rem;">
            <i class="pi text-5xl flex-shrink-0" [class]="icon()" [style.color]="iconColor()"></i>
            <div class="flex-1 min-w-0">
                <div class="text-2xl font-semibold break-words">{{ headline() }}</div>
                <div class="text-base text-gray-300 mt-1 break-words">{{ sub() }}</div>
            </div>
        </div>
    `
})
export class ImprovementCalloutWidget {
    private _delta = signal(0);
    @Input({ required: true }) set improvement(v: number) {
        this._delta.set(v);
    }

    headline = computed(() => {
        const d = this._delta();
        if (d >= 5) return `You're up ${d.toFixed(1)} points from your first month.`;
        if (d >= 1) return `Slow burn — up ${d.toFixed(1)} points from where you started.`;
        if (d > -1) return `You've held steady from your first month.`;
        return `You're ${Math.abs(d).toFixed(1)} points off your early days. Time for a comeback arc.`;
    });

    sub = computed(() => {
        const d = this._delta();
        if (d >= 5) return 'Keep showing up. The brain is doing the work.';
        if (d >= 1) return 'Tiny gains compound. This is how it goes.';
        if (d > -1) return 'Consistency is its own win — most quizzers tap out way earlier.';
        return "We've all had a slump. Next week resets the clock.";
    });

    icon = computed(() => (this._delta() >= 1 ? 'pi-arrow-up-right' : this._delta() <= -1 ? 'pi-refresh' : 'pi-equals'));
    iconColor = computed(() => (this._delta() >= 1 ? 'var(--fifty-neon-green)' : 'var(--fifty-pink)'));
    bg = computed(() => 'rgb(40, 40, 40)');
}
