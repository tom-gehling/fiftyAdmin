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

// Member-only pages
// import { Exclusives } from './app/pages/fiftyPlus/exclusives/exclusives';
// import { Archives } from './app/pages/fiftyPlus/archives/archives';
// import { QuestionQuizzes } from './app/pages/fiftyPlus/questionQuizzes/questionQuizzes';

export const appRoutes: Routes = [
    // Public area
    { path: '', redirectTo: '/landing', pathMatch: 'full' },
    { path: 'landing', component: Landing },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },

    // Protected area
    {
        path: '',
        component: AppLayout,
        children: [
            {
                path: 'members',
                canActivate: [AuthGuard],
                children: [
                    { path: '', component: Dashboard }, // Shared dashboard for members
                    
                    // Member-specific pages
                    // { path: 'exclusives', component: Exclusives },
                    // { path: 'archives', component: Archives },
                    // { path: 'questionQuizzes', component: QuestionQuizzes },

                    // Admin-only pages nested under members/admin
                    {
                        path: 'admin',
                        canActivate: [AdminGuard],
                        children: [
                            { path: 'quizzes', component: QuizTableComponent },
                            { path: 'quizzes/:id', component: QuizDetailComponent },
                        ]
                    }
                ]
            }
        ]
    },

    // Not found
    { path: 'notfound', component: Notfound },
    { path: '**', redirectTo: '/notfound' }
];
