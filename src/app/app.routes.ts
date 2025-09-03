import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { QuizComponent } from './quiz/quiz.component';
import { QuizDetailComponent } from './quiz-detail/quiz-detail.component';
import { QuizTemplateComponent } from './common/quiz-template/quiz-template.component';
import { ExtractComponent } from './extract/extract.component';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './shared/guards/authGuard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent, data: { animation: 'HomePage' } },
      { path: 'quizzes', component: QuizComponent, data: { animation: 'QuizPage' } },
      { path: 'quizzes/:id', component: QuizDetailComponent, data: { animation: 'QuizDetailPage', RenderMode: 'none' } },
      { path: 'quizzes/:id/preview', component: QuizTemplateComponent, data: { animation: 'QuizPreviewPage' } },
      { path: 'extract', component: ExtractComponent, data: { animation: 'ExtractsPage' } },
    ],
  },
];

