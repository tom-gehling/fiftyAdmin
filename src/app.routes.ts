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

export const appRoutes: Routes = [
    // Public area
    { path: '', redirectTo: '/landing', pathMatch: 'full' },
    { path: 'landing', component: Landing },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },

    // Protected area
    {
        path: '',
        component: AppLayout,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: Dashboard }, // shared dashboard

            // Fifty+ section (all members and admins)
            {
                path: 'members/archives',
                component: FiftyPageComponent,
                data: { type: 'archive', title: 'Archives' }
            },
            {
                path: 'members/exclusives',
                component: FiftyPageComponent,
                data: { type: 'exclusive', title: 'Exclusives' }
            },
            {
                path: 'members/collabs',
                component: FiftyPageComponent,
                data: { type: 'collaboration', title: 'Collaborations' }
            },
            {
                path: 'members/questionQuizzes',
                component: FiftyPageComponent,
                data: { type: 'question', title: 'Question Quizzes' }
            },

            // Admin-only pages
            {
                path: 'members/admin',
                canActivate: [AdminGuard],
                children: [
                    { path: 'quizzes', component: QuizTableComponent },
                    { path: 'quizzes/:id', component: QuizDetailComponent },
                    // future admin pages like "quiz tags" can go here
                ]
            }
        ]
    },

    // Not found
    { path: 'notfound', component: Notfound },
    { path: '**', redirectTo: '/notfound' }
];
