import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WeeklyQuizStatsComponent } from './components/weeklyquizstats';

@Component({
    selector: 'app-total-stats',
    standalone: true,
    imports: [CommonModule, WeeklyQuizStatsComponent],
    template: `
        <div class="p-4">
            <h1 class="text-4xl font-bold text-surface-900 dark:text-surface-0 mb-6">Total Stats</h1>
            <app-weekly-quiz-stats />
        </div>
    `
})
export class TotalStats {
    
}
