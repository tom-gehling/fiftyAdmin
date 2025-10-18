import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { QuizCollectionComponent } from '../common/quizCollection/quizCollection';

@Component({
  selector: 'app-fifty-page',
  standalone: true,
  imports: [QuizCollectionComponent],
  template: `
    <app-quiz-collection [title]="title" [quizType]="quizType" [selectedQuizId]="selectedQuizId"></app-quiz-collection>
  `
})
export class FiftyPageComponent implements OnInit {
  quizType!: 'archives' | 'exclusives' | 'collaborations' | 'questions';
  title!: string;
  selectedQuizId?: string;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const typeMap: Record<number, 'archives' | 'exclusives' | 'collaborations' | 'questions'> = {
      1: 'archives',
      2: 'exclusives',
      3: 'collaborations',
      4: 'questions'
    };

    // Read static route data
    const typeNum = this.route.snapshot.data['type'];
    this.title = this.route.snapshot.data['title'];
    this.quizType = typeMap[typeNum] ?? 'archives';

    // Read optional quiz ID from route params
    this.route.paramMap.subscribe(params => {
      this.selectedQuizId = params.get('id') ?? undefined;
    });
  }
}
