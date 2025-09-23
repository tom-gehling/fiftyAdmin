import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { QuestionComponent } from './question';
import { Quiz } from '@/shared/models/quiz.model';

@Component({
  selector: 'app-quiz-template',
  standalone: true,
  imports: [CommonModule, QuestionComponent, CardModule],
  template: `
    <p-card>
      <div class="w-[90%] mx-auto p-6 bg-white rounded-2xl shadow-lg">
        <!-- Header -->
        <h2 class="text-2xl font-bold mb-4">
          {{ quiz?.quizTitle || 'Quiz ' + quiz?.quizId }}
        </h2>

        <!-- Questions -->
        <div class="flex flex-col gap-4 mb-6">
          <question
            *ngFor="let question of quiz?.questions"
            [num]="question.questionId"
            [title]="question.question"
            [answer]="question.answer"
            (answered)="handleAnswer($event)"
          >
          </question>
        </div>

        <!-- Score -->
        <div class="text-right font-semibold text-lg">
          Score: {{ score }} / {{ totalQuestions }}
        </div>
      </div>
    </p-card>
  `
})
export class QuizTemplateComponent {
  @Input() quiz?: Quiz;

  score = 0;
  totalQuestions = 0;
  answers: { [id: number]: boolean } = {};

  handleAnswer({ id, current }: { id: number; current: boolean }) {
    const prev = this.answers[id];

    if (prev === current) return;

    if (prev === true) this.score--;
    if (current === true) this.score++;

    if (prev === undefined) this.totalQuestions++;

    this.answers[id] = current;
  }
}
