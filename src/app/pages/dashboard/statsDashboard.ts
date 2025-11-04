import { Component } from '@angular/core';

import { CommonModule } from '@angular/common';
import { QuizStatsSummaryComponent } from "./components/quizstatssummary";


@Component({
    selector: 'app-stat-dashboard',
    standalone: true,
    imports: [CommonModule, QuizStatsSummaryComponent],
    template: `
          <app-quiz-stats-summary class="contents" />
    `
})
export class StatsDashboard {
    
}