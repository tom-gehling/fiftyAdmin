import { QuizQuestion } from '@/shared/models/quiz.model';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-question',
  imports: [CommonModule],
  styleUrls: ['question.component.css'],
  templateUrl: 'question.component.html'
})
export class QuestionComponent {
  @Input() question!: QuizQuestion;
  @Input() index!: number;
  @Output() answered = new EventEmitter<{ correct: boolean; timestamp: Date }>();

  revealed = false;
  correct = false;
  incorrect = false;

  toggleReveal() {
    this.revealed = !this.revealed;
  }

  markCorrect() {
    this.correct = true;
    this.answered.emit({ correct: true, timestamp: new Date() });
  }

  markIncorrect() {
    this.incorrect = true;
    this.answered.emit({ correct: false, timestamp: new Date() });
  }
}
