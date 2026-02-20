import { Component } from '@angular/core';

import { CommonModule } from '@angular/common';
import { QuizStatsSummaryComponent } from "./components/quizstatssummary";
import { WeeklyQuizStatsComponent } from "./components/weeklyquizstats";


@Component({
    selector: 'app-stat-dashboard',
    standalone: true,
    imports: [CommonModule, QuizStatsSummaryComponent, WeeklyQuizStatsComponent],
    template: `
          <app-weekly-quiz-stats />
          <app-quiz-stats-summary class="contents" />
    `
})
export class StatsDashboard {
    
}