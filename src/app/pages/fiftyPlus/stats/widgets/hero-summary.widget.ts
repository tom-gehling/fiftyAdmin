import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserStatsSummary } from '@/shared/models/userStats.model';

@Component({
    standalone: true,
    selector: 'app-stats-hero-summary',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="relative overflow-hidden rounded-3xl p-4 sm:p-6 lg:p-8" style="background: radial-gradient(circle at 0% 0%, rgba(76, 251, 171, 0.18), transparent 55%), radial-gradient(circle at 100% 100%, rgba(251, 226, 223, 0.12), transparent 55%), linear-gradient(135deg, rgb(28, 28, 28), rgb(18, 18, 18)); border: 1px solid rgba(76, 251, 171, 0.25);">
            <div class="absolute -top-20 -right-20 w-64 h-64 rounded-full" style="background: radial-gradient(circle, rgba(76, 251, 171, 0.18), transparent 70%); pointer-events: none;"></div>
            <div class="absolute -bottom-24 -left-24 w-72 h-72 rounded-full" style="background: radial-gradient(circle, rgba(251, 226, 223, 0.12), transparent 70%); pointer-events: none;"></div>

            <div class="relative">
                <div class="flex items-baseline justify-between gap-3 flex-wrap mb-1">
                    <div class="text-sm uppercase tracking-[0.25em] font-semibold" style="color: var(--fifty-neon-green);">Your quiz story</div>
                    <span class="text-sm text-gray-400">{{ summary.totalWeeksPlayed }} weeks · {{ summary.totalCompleted }} quizzes · {{ summary.totalQuestionsAnswered | number }} questions</span>
                </div>

                <h2 class="text-5xl sm:text-6xl font-bold m-0 mt-2 leading-tight break-words">
                    {{ greeting }}, <span style="background: linear-gradient(90deg, var(--fifty-neon-green), var(--fifty-pink)); -webkit-background-clip: text; background-clip: text; color: transparent;">{{ displayName }}</span>.
                </h2>
                <p class="text-xl sm:text-2xl text-gray-300 mt-2 mb-6">{{ tagline }}</p>

                <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div class="min-w-0 overflow-hidden rounded-2xl p-4 sm:p-5" style="background: rgba(76, 251, 171, 0.08); border: 1px solid rgba(76, 251, 171, 0.25);">
                        <div class="text-sm uppercase tracking-wider text-gray-400 truncate">Quizzes done</div>
                        <div class="text-6xl sm:text-7xl font-extrabold mt-1 leading-none" style="color: var(--fifty-neon-green); text-shadow: 0 0 24px rgba(76, 251, 171, 0.35);">{{ summary.totalCompleted }}</div>
                    </div>

                    <div class="min-w-0 overflow-hidden rounded-2xl p-4 sm:p-5" style="background: rgba(251, 226, 223, 0.08); border: 1px solid rgba(251, 226, 223, 0.25);">
                        <div class="text-sm uppercase tracking-wider text-gray-400 truncate">Correct rate</div>
                        <div class="text-6xl sm:text-7xl font-extrabold mt-1 leading-none" style="color: var(--fifty-pink);">{{ summary.correctRate | number: '1.0-1' }}<span class="text-4xl">%</span></div>
                    </div>

                    <div class="min-w-0 overflow-hidden rounded-2xl p-4 sm:p-5" style="background: rgba(255, 200, 87, 0.08); border: 1px solid rgba(255, 200, 87, 0.25);">
                        <div class="text-sm uppercase tracking-wider text-gray-400 flex items-center gap-1 truncate">
                            <i class="pi pi-bolt text-xs" style="color: #ffc857;"></i>Week streak
                        </div>
                        <div class="text-6xl sm:text-7xl font-extrabold mt-1 leading-none" style="color: #ffc857;">{{ summary.weeklyStreak }}</div>
                    </div>

                    <div class="min-w-0 overflow-hidden rounded-2xl p-4 sm:p-5" style="background: rgba(196, 165, 255, 0.08); border: 1px solid rgba(196, 165, 255, 0.25);">
                        <div class="text-sm uppercase tracking-wider text-gray-400 truncate">Personal best</div>
                        <div class="text-6xl sm:text-7xl font-extrabold mt-1 leading-none" style="color: #c4a5ff;">{{ summary.personalBestScore }}<span class="text-4xl text-gray-500">/50</span></div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class HeroSummaryWidget {
    @Input({ required: true }) summary!: UserStatsSummary;
    @Input() displayName: string = 'quizzer';

    greeting = pickGreeting();
    tagline = pickTagline();
}

function pickGreeting(): string {
    const greetings = ["G'day", 'Hey', 'Hiya', 'Welcome back', 'Look who it is', 'Well well well'];
    return greetings[Math.floor(Math.random() * greetings.length)];
}

function pickTagline(): string {
    const taglines = ['Here to celebrate the work, not just the wins.', 'The receipts are in. Have a look.', 'Every quiz, every week, all in one place.', "What you've been up to since you joined the Fifty."];
    return taglines[Math.floor(Math.random() * taglines.length)];
}
