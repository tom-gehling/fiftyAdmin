import { Routes } from '@angular/router';
import { Crud } from './crud/crud';
import { Empty } from './empty/empty';
import { Notfound } from './notfound/notfound';
import { QuizTableComponent } from './admin/quiz/quizTable';
import { QuizDetailComponent } from './admin/quiz/quizDetail';

export default [
    { path: 'crud', component: Crud },
    { path: 'empty', component: Empty },
    { path: 'quizzes', component: QuizTableComponent },
    { path: 'quizzes/:id', component: QuizDetailComponent },
    { path: 'notfound', component: Notfound },
    { path: '**', redirectTo: 'notfound' }
] as Routes;
