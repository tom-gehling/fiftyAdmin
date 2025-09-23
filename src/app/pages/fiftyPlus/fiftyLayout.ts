import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizCollectionComponent } from '../common/quizCollection/quizCollection';


@Component({
  selector: 'app-fifty-layout',
  standalone: true,
  imports: [CommonModule, QuizCollectionComponent],
  template: `
    <app-quiz-collection [quizType]="type" [title]="title"></app-quiz-collection>
  `
})
export class FiftyLayoutComponent {
  @Input() type!: 'archives' | 'exclusives' | 'collaborations';
  @Input() title!: string;
}
