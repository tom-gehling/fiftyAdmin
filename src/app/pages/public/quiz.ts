import { Component, OnInit, Optional } from '@angular/core';
import { QuizDisplayComponent } from "../common/quiz-display/quiz-display";
import { QuizzesService } from '@/shared/services/quizzes.service';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { Quiz } from '@/shared/models/quiz.model';
import { PublicTopbarComponent } from './components/public-topbar';

@Component({
  selector: 'app-weekly-quiz',
  standalone: true,
  imports: [CommonModule, QuizDisplayComponent, PublicTopbarComponent],
  template: `
    <app-public-topbar />
    <div class="page-content">
      <app-quiz-display
        *ngIf="quiz"
        [quiz]="quiz"
        [locked]="false"
        [previewMode]="true"
      />
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--fifty-green);
      color: var(--fifty-pink);
    }
    .page-content {
      padding-top: 4.5rem;
    }
  `]
})
export class WeeklyQuizPage implements OnInit {
  quiz?: Quiz;

  constructor(private quizzesService: QuizzesService, @Optional() public config: DynamicDialogConfig) {}

  async ngOnInit() {
    this.quiz = await firstValueFrom(this.quizzesService.getActiveQuiz());
    console.log(this.quiz )
  }
}
