import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { QuizComponent } from './quiz/quiz.component';
import { QuizDetailComponent } from './quiz-detail/quiz-detail.component';
import { QuizTemplateComponent } from './quiz-template/quiz-template.component';
// import { SubmissionsComponent } from './submissions/submissions.component';
// import { FormsComponent } from './forms/forms.component';
// import { QuizNightQuestionsComponent } from './quizzes/quiz-night-questions/quiz-night-questions.component';
// import { VenuesComponent } from './venues/venues.component';
// import { SponsorsComponent } from './sponsors/sponsors.component';

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
        data: { animation: 'QuizDetailPage', RenderMode: 'none' },
    },
    {
        path: 'quizzes/:id/preview',
        component: QuizTemplateComponent,
        data: { animation: 'QuizPreviewPage' },
    },
    {
        path: 'submissions',
        component: HomeComponent,
        data: { animation: 'SubmissionsPage' },
    },
    {
        path: 'forms',
        component: HomeComponent,
        data: { animation: 'FormsPage' },
    },
    {
        path: 'quiz-night-questions',
        component: HomeComponent,
        data: { animation: 'QuizNightQuestionsPage' },
    },
    {
        path: 'venues',
        component: HomeComponent,
        data: { animation: 'VenuesPage' },
    },
    {
        path: 'sponsors',
        component: HomeComponent,
        data: { animation: 'SponsorsPage' },
    },
];
