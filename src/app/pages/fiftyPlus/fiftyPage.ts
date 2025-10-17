// fiftyPage.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { QuizCollectionComponent } from '../common/quizCollection/quizCollection';

@Component({
  selector: 'app-fifty-page',
  standalone: true,
  imports: [QuizCollectionComponent],
  template: `
    <app-quiz-collection [title]="title" [quizType]="quizType"></app-quiz-collection>
  `
})
export class FiftyPageComponent implements OnInit {
  quizType!: 'archives' | 'exclusives' | 'collaborations' | 'questions';
  title!: string;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const typeNum = this.route.snapshot.data['type'];
    this.title = this.route.snapshot.data['title'];

    const typeMap: Record<number, 'archives' | 'exclusives' | 'collaborations' | 'questions'> = {
      1: 'archives',
      2: 'exclusives',
      3: 'collaborations',
      4: 'questions'
    };

    this.quizType = typeMap[typeNum] ?? 'archives';
  }
}
