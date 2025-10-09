import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { CardModule } from 'primeng/card';
import { QuizzesService } from '@/shared/services/quizzes.service';
import { Quiz } from '@/shared/models/quiz.model';
import { QuizTemplateComponent } from '../quizTemplate/quizTemplate.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-quiz-collection',
  standalone: true,
  imports: [CommonModule, ButtonModule, DrawerModule, CardModule, QuizTemplateComponent],
  template: `
    <!-- [ ]: create quiz collection layout: expand button, drawer nav bar on left with all quizzes from collect, on click load a normal quiz -->
    <!-- [ ]: add locking to quizzes if not access - allow them to open quiz but only see to question 3?? -->

    <!-- <p-card class="quiz-collection-card flex flex-col h-full">
      <p-button icon="pi pi-bars" (onClick)="drawerVisible = true" class="menu-button"></p-button>

      <p-drawer [(visible)]="drawerVisible" position="left" [style]="{width: '300px'}">
        <h3>{{ title }}</h3>
        <ul class="quiz-list">
          <li 
            *ngFor="let quiz of quizHeaders" 
            [class.active]="quiz.id === selectedQuiz?.id"
            (click)="loadQuiz(quiz.id); drawerVisible = false"
          >
            {{ quiz.quizTitle || 'Quiz ' + quiz.quizId }}
          </li>
        </ul>
      </p-drawer>

      <div class="quiz-display">
        <ng-container *ngIf="selectedQuiz; else selectMessage">
          <app-quiz-template [quiz]="selectedQuiz"></app-quiz-template>
        </ng-container>
        <ng-template #selectMessage>
          <p>Select a quiz from the drawer.</p>
        </ng-template>
      </div>
    </p-card> -->
    <app-quiz-template />
  `,
  styles: [`
    .quiz-collection-card {
      margin: 20px;
      padding: 10px;
      position: relative;
    }

    .menu-button {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 11000;
    }

    .quiz-list {
      list-style: none;
      padding: 0;
    }

    .quiz-list li {
      padding: 10px;
      margin-bottom: 5px;
      cursor: pointer;
      border-radius: 4px;
      transition: 0.3s;
    }

    .quiz-list li.active,
    .quiz-list li:hover {
      background-color: #4cfbab;
      color: #000;
    }

    .quiz-display {
      padding: 20px;
      margin-left: 0;
    }
  `]
})
export class QuizCollectionComponent implements OnInit {
  @Input() title: string = 'Quizzes';
  @Input() quizType: 'archives' | 'exclusives' | 'collaborations' = 'archives';

  drawerVisible = false;
  quizHeaders: { quizId: number, id?: string, quizTitle?: string }[] = [];
  selectedQuiz?: Quiz;

  constructor(private quizzesService: QuizzesService) {}

  ngOnInit() {
    // let fetchHeaders$: Observable<{ quizId: number, id?: string, quizTitle?: string }[]>;

    // switch (this.quizType) {
    //   case 'archives':
    //     fetchHeaders$ = this.quizzesService.getArchiveQuizzes(true);
    //     break;
    //   case 'exclusives':
    //     fetchHeaders$ = this.quizzesService.getExclusives(true);
    //     break;
    //   case 'collaborations':
    //     fetchHeaders$ = this.quizzesService.getCollaborations(true);
    //     break;
    // }

    // fetchHeaders$.subscribe(headers => {
    //   this.quizHeaders = headers;
    //   if (headers.length) this.loadQuiz(headers[0].id);
    // });
  }

  loadQuiz(id?: string) {
    if (!id) return;
    this.quizzesService.getQuizById(id).subscribe(quiz => {
      this.selectedQuiz = quiz;
    });
  }
}
