import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { PublicLayout } from './app/layout/component/public-layout.component';

// Public pages
import { Landing } from './app/pages/public/landing';
import { HomePage } from '@/pages/public/home';
import { WeeklyQuizPage } from '@/pages/public/quiz';
import { FindAVenuePage } from '@/pages/public/findavenue';
import { FiftyShopPage } from '@/pages/public/fiftyshop';
import { ContactUsPage } from '@/pages/public/contactus';
import { JoinPage } from '@/pages/public/join/join';
import { JoinSuccessPage } from '@/pages/public/join/join-success';

// Auth pages
import { Login } from '@/pages/auth/login';

// User pages
import { ProfilePage } from '@/pages/profile/profile';

// Protected pages
import { Dashboard } from './app/pages/dashboard/dashboard';
import { FiftyPageComponent } from '@/pages/fiftyPlus/fiftyPage';
import { UserStatsComponent } from '@/pages/fiftyPlus/stats/userStats.component';

// Admin pages
import { TotalStats } from '@/pages/dashboard/totalStats';
import { WeeklyStats } from '@/pages/dashboard/weeklyStats';
import { QuizTableComponent } from '@/pages/admin/quiz/quizTable';
import { QuizDetailComponent } from '@/pages/admin/quiz/quizDetail';
import { QuizTagsComponent } from '@/pages/admin/quizTags/quizTags';
import { VenuesComponent } from '@/pages/admin/venues/venues';
import { SubmissionFormTableComponent } from '@/pages/admin/submissionForms/submissionFormTable';
import { SubmissionFormDetailComponent } from '@/pages/admin/submissionForms/submissionFormDetail';
import { UserTableComponent } from '@/pages/admin/users/userTable';
import { ContactFormTableComponent } from '@/pages/admin/contactForms/contactFormTable';

// Guards
import { AuthGuard } from '@/shared/guards/authGuard';
import { AdminGuard } from '@/shared/guards/adminGuard';

// Not found
import { Notfound } from './app/pages/notfound/notfound';

export const appRoutes: Routes = [
    // ------------------------------
    // 🏠 HOME — standalone (has own custom navbar, no layout wrapper)
    // ------------------------------
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: HomePage },

    // ------------------------------
    // 🌐 PUBLIC ROUTES — with shared topbar
    // ------------------------------
    {
        path: '',
        component: PublicLayout,
        children: [
            { path: 'weekly-quiz', component: WeeklyQuizPage, data: { topbarColor: 'green' } },
            { path: 'find-a-venue', component: FindAVenuePage, data: { topbarColor: 'green' } },
            { path: 'fiftyshop', component: FiftyShopPage, data: { topbarColor: 'green' } },
            { path: 'contact-us', component: ContactUsPage, data: { topbarColor: 'green' } },
            { path: 'join', component: JoinPage, data: { topbarColor: 'black' } },
            { path: 'join/success', component: JoinSuccessPage, data: { topbarColor: 'black' } },
            { path: 'profile', component: ProfilePage, canActivate: [AuthGuard], data: { topbarColor: 'black' } },
            { path: 'profile/:userId', component: ProfilePage, canActivate: [AuthGuard], data: { topbarColor: 'black' } }
        ]
    },

    // Auth fallback (for password reset links, direct URL access)
    { path: 'login', component: Login },
    { path: 'signup', component: Landing },

    // Checkout
    { path: 'checkout', component: Landing, canActivate: [AuthGuard] },
    { path: 'checkout/cart', component: Landing },

    // ------------------------------
    // 🔒 FIFTY+ AREA — AppLayout (topbar + sidebar)
    //    No AuthGuard on content routes — anyone can view.
    //    Lock overlay in components gates member-only interaction.
    // ------------------------------
    {
        path: '',
        component: AppLayout,
        children: [
            { path: 'fiftyPlus', component: Dashboard, data: { topbarColor: 'black' } },

            { path: 'fiftyPlus/archives', component: FiftyPageComponent, data: { type: 1, title: 'Archives', topbarColor: 'black' } },
            { path: 'fiftyPlus/archives/:quizid', component: FiftyPageComponent, data: { type: 1, topbarColor: 'black' } },

            { path: 'fiftyPlus/exclusives', component: FiftyPageComponent, data: { type: 2, title: 'Exclusives', topbarColor: 'black' } },
            { path: 'fiftyPlus/exclusives/:quizid', component: FiftyPageComponent, data: { type: 2, topbarColor: 'black' } },

            { path: 'fiftyPlus/collabs', component: FiftyPageComponent, data: { type: 3, title: 'Collaborations', topbarColor: 'black' } },
            { path: 'fiftyPlus/collabs/:quizid', component: FiftyPageComponent, data: { type: 3, topbarColor: 'black' } },

            { path: 'fiftyPlus/questionQuizzes', component: FiftyPageComponent, data: { type: 4, title: 'Question Quizzes', topbarColor: 'black' } },
            { path: 'fiftyPlus/questionQuizzes/:quizid', component: FiftyPageComponent, data: { type: 4, topbarColor: 'black' } },

            { path: 'fiftyPlus/stats', component: UserStatsComponent, canActivate: [AuthGuard], data: { topbarColor: 'black' } },

            // ------------------------------
            // 🛠 ADMIN ROUTES
            // ------------------------------
            {
                path: 'fiftyPlus/admin',
                canActivate: [AdminGuard],
                data: { topbarColor: 'black' },
                children: [
                    {
                        path: 'stats',
                        children: [
                            { path: 'total', component: TotalStats },
                            { path: 'weekly', component: WeeklyStats },
                            { path: '', redirectTo: 'total', pathMatch: 'full' }
                        ]
                    },
                    { path: 'quizzes', component: QuizTableComponent },
                    { path: 'quizzes/:id', component: QuizDetailComponent },
                    { path: 'quizTags', component: QuizTagsComponent },
                    { path: 'venues', component: VenuesComponent },
                    { path: 'submissionForms', component: SubmissionFormTableComponent },
                    { path: 'submissionForms/:id', component: SubmissionFormDetailComponent },
                    { path: 'users', component: UserTableComponent },
                    { path: 'contactForms', component: ContactFormTableComponent }
                ]
            }
        ]
    },

    // ------------------------------
    // ❌ NOT FOUND
    // ------------------------------
    { path: 'notfound', component: Notfound },
    { path: '**', redirectTo: '/notfound' }
];
