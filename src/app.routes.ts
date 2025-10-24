import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';
import { AuthGuard } from '@/shared/guards/authGuard';
import { AdminGuard } from '@/shared/guards/adminGuard';

// Shared Dashboard
import { Dashboard } from './app/pages/dashboard/dashboard';

// Admin-only pages
import { QuizTableComponent } from '@/pages/admin/quiz/quizTable';
import { QuizDetailComponent } from '@/pages/admin/quiz/quizDetail';

// Fifty+ pages
import { FiftyPageComponent } from '@/pages/fiftyPlus/fiftyPage';
import { QuizTagsComponent } from '@/pages/admin/quizTags/quizTags';

export const appRoutes: Routes = [
  // Public area
  { path: '', redirectTo: '/members', pathMatch: 'full' },
  { path: 'landing', component: Landing },
  { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },

  // Protected area
  {
    path: '',
    component: AppLayout,
    canActivate: [AuthGuard],
    children: [
      //[x]: landing page should be auth page
      
      { path: '', redirectTo: '/members', pathMatch: 'full' },
      { path: 'members', component: Dashboard },

      // Fifty+ pages
      // Fifty+ pages
      { path: 'members/archives', component: FiftyPageComponent, data: { type: 1, title: 'Archives' } },
      { path: 'members/archives/:quizid', component: FiftyPageComponent, data: { type: 1, title: 'Archives' } },

      { path: 'members/exclusives', component: FiftyPageComponent, data: { type: 2, title: 'Exclusives' } },
      { path: 'members/exclusives/:quizid', component: FiftyPageComponent, data: { type: 2, title: 'Exclusives' } },

      { path: 'members/collabs', component: FiftyPageComponent, data: { type: 3, title: 'Collaborations' } },
      { path: 'members/collabs/:quizid', component: FiftyPageComponent, data: { type: 3, title: 'Collaborations' } },

      { path: 'members/questionQuizzes', component: FiftyPageComponent, data: { type: 4, title: 'Question Quizzes' } },
      { path: 'members/questionQuizzes/:quizid', component: FiftyPageComponent, data: { type: 4, title: 'Question Quizzes' } },


      // Admin-only pages
      {
        path: 'members/admin',
        canActivate: [AdminGuard],
        children: [
          { path: 'quizzes', component: QuizTableComponent },
          { path: 'quizzes/:id', component: QuizDetailComponent },
          { path: 'quizTags', component: QuizTagsComponent },
        ]
      }
    ]
  },

  // Not found
  { path: 'notfound', component: Notfound },
  { path: '**', redirectTo: '/notfound' }
];

