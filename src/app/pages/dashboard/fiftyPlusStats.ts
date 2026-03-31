import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FiftyPlusQuizStatsComponent } from './components/fiftyPlusQuizStats';

@Component({
    selector: 'app-fifty-plus-stats',
    standalone: true,
    imports: [CommonModule, FiftyPlusQuizStatsComponent],
    template: `
        <div class="p-4">
            <h1 class="text-4xl font-bold text-surface-900 dark:text-surface-0 mb-6">Fifty+ Stats</h1>
            <app-fifty-plus-quiz-stats />
        </div>
    `
})
export class FiftyPlusStats {

}
