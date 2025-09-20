import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { Quiz } from '@/shared/models/quiz.model';
import { QuizTemplateComponent } from '../common/quiz';

@Component({
  selector: 'app-fifty-layout',
  standalone: true,
  imports: [CommonModule, ButtonModule, QuizTemplateComponent],
  template: `
    <div class="flex h-screen bg-gray-50">
      <!-- Sidebar -->
      <div class="w-64 bg-gray-900 text-white p-4 overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">{{ title }}</h2>
        <ul class="space-y-2">
          <li *ngFor="let quiz of quizHeaders">
            <button
              class="w-full text-left px-3 py-2 rounded hover:bg-gray-700"
              (click)="loadQuiz(quiz.quizId)"
            >
              {{ quiz.quizTitle || 'Quiz ' + quiz.quizId }}
            </button>
          </li>
        </ul>
      </div>

      <!-- Main Content -->
      <div class="flex-1 p-6 overflow-y-auto">
        <ng-container *ngIf="selectedQuiz; else selectMessage">
          <app-quiz-template [quiz]="selectedQuiz"></app-quiz-template>
        </ng-container>
        <ng-template #selectMessage>
          <p class="text-gray-500">Select a quiz from the sidebar.</p>
        </ng-template>
      </div>
    </div>
  `
})
export class FiftyLayoutComponent implements OnInit {
  @Input() type!: 'archive' | 'exclusive' | 'collaboration' | 'question';
  @Input() title!: string;

  quizHeaders: { quizId: number; quizTitle?: string }[] = [];
  selectedQuiz?: Quiz;

  constructor(private quizzesService: QuizzesService) {}

  ngOnInit(): void {
    // Fetch headers only (lightweight)
    switch (this.type) {
      case 'archive':
        this.quizzesService.getArchiveQuizzes(true).subscribe(h => this.quizHeaders = h);
        break;
      case 'exclusive':
        this.quizzesService.getExclusives(true).subscribe(h => this.quizHeaders = h);
        break;
      case 'collaboration':
      case 'question':
        this.quizzesService.getCollaborations(true).subscribe(h => this.quizHeaders = h);
        break;
    }
  }

  loadQuiz(quizId: number) {
    // Load the full quiz by id
    this.quizzesService.getAllQuizzes().subscribe(all => {
      this.selectedQuiz = all.find(q => q.quizId === quizId);
    });
  }
}
