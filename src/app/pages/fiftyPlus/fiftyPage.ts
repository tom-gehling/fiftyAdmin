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
    this.title = this.route.snapshot.data['title'] || this.getDefaultTitle(typeNum);
    this.quizType = typeMap[typeNum] ?? 'archives';

    // Get initial quiz ID from route snapshot (synchronous)
    this.selectedQuizId = this.route.snapshot.paramMap.get('quizid') ?? undefined;

    // Listen to route param changes reactively (for when URL changes while on same page)
    this.route.paramMap.subscribe(params => {
      const quizId = params.get('quizid');
      this.selectedQuizId = quizId ?? undefined;
    });
  }

  private getDefaultTitle(typeNum: number): string {
    const titles: Record<number, string> = {
      1: 'Archives',
      2: 'Exclusives',
      3: 'Collaborations',
      4: 'Question Quizzes'
    };
    return titles[typeNum] || 'Quizzes';
  }
}
