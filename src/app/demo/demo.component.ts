import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { QuizTemplateComponent } from '../common/quiz-template/quiz-template.component';
import { QuizzesService } from '../shared/services/quizzes.service';
import { Quiz } from '../models/quiz.model';

@Component({
  selector: 'demo',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatListModule,
    MatCardModule,
    MatProgressSpinnerModule,
    QuizTemplateComponent,
    MatListModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './demo.component.html',
  styleUrls: ['./demo.component.css'],
})
export class DemoComponent implements OnInit {
  quizzes: Quiz[] = [];
  weeklyQuizzes: Quiz[] = [];
  loading = true;
  selectedQuiz: Quiz | null | undefined = null;

  constructor(private quizzesService: QuizzesService) {}

  ngOnInit(): void {
    this.quizzesService.getAllQuizzes().subscribe({
      next: (quizzes) => {
        this.quizzes = quizzes;
        this.weeklyQuizzes = quizzes.filter((q) => q.quizType === 0);

        if (this.weeklyQuizzes.length > 0) {
          this.selectedQuiz = this.weeklyQuizzes[0]; // default first
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching quizzes', err);
        this.loading = false;
      },
    });
  }

  selectQuiz(header: any) {
    this.loading = true;
    this.selectedQuiz = null;
    this.quizzesService.getQuizById(header.quizId).subscribe(fullQuiz => {
      this.selectedQuiz = fullQuiz;
      this.loading = false;
    });
  }
}
