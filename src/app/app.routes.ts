import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { QuizComponent } from './quiz/quiz.component';
import { QuizDetailComponent } from './quiz-detail/quiz-detail.component';
import { QuizTemplateComponent } from './quiz-template/quiz-template.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    component: HomeComponent,
    data: { animation: 'HomePage' },
  },
  {
    path: 'quizzes',
    component: QuizComponent,
    data: { animation: 'QuizPage' },
  },
  {
    path: 'quizzes/:id',
    component: QuizDetailComponent,
    data: { animation: 'QuizDetailPage' },
  },
  {
    path: 'quizzes/:id/preview',
    component: QuizTemplateComponent,
    data: { animation: 'QuizPreviewPage' }
  }
];
