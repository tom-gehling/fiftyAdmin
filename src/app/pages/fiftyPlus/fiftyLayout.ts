import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizCollectionComponent } from '../common/quizCollection/quizCollection';
import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';

@Component({
  selector: 'app-fifty-layout',
  standalone: true,
  imports: [CommonModule, QuizCollectionComponent],
  template: `
    <app-quiz-collection [quizType]="type" [title]="title"></app-quiz-collection>
  `
})
export class FiftyLayoutComponent {
  @Input() type!: QuizTypeEnum;
  @Input() title!: string;
}
