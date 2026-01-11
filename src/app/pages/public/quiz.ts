import { Component, OnInit, Optional } from '@angular/core';
import { QuizDisplayComponent } from "../common/quiz-display/quiz-display";
import { QuizzesService } from '@/shared/services/quizzes.service';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { Quiz } from '@/shared/models/quiz.model';

@Component({
  selector: 'app-weekly-quiz',
  standalone: true,
  imports: [CommonModule, QuizDisplayComponent],
  template: `<div>
    <div>


    <app-quiz-display 
      *ngIf="quiz"
      [quiz]="quiz"
      [locked]="false"
      [previewMode]="true"

    />
  `
})
export class WeeklyQuizPage implements OnInit {
  quiz?: Quiz;

  constructor(private quizzesService: QuizzesService, @Optional() public config: DynamicDialogConfig) {}

  async ngOnInit() {
    this.quiz = await firstValueFrom(this.quizzesService.getActiveQuiz());
    console.log(this.quiz )
  }
}
