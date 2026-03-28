import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizStatsSummaryComponent } from './components/quizstatssummary';

@Component({
    selector: 'app-fiftyplus-stats',
    standalone: true,
    imports: [CommonModule, QuizStatsSummaryComponent],
    template: `
        <div class="p-4">
            <h1 class="text-4xl font-bold text-surface-900 dark:text-surface-0 mb-6">Fifty+ Stats</h1>
            <app-quiz-stats-summary class="contents" mode="fiftyplus" />
        </div>
    `
})
export class FiftyPlusStats {

}
