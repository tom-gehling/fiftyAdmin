import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';

// Public pages
import { Landing } from './app/pages/public/landing';
// import { HomePage } from './app/pages/public/home';
// import { QuizPage } from './app/pages/public/quiz';
// import { FindVenuePage } from './app/pages/public/findVenue';
// import { FiftyShopPage } from './app/pages/public/fiftyshop';
// import { ContactPage } from './app/pages/public/contact';
// import { LoginPage } from './app/pages/auth/login';
// import { SignupPage } from './app/pages/auth/signup';

// User pages
// import { ProfilePage } from './app/pages/profile/profile';
// import { CheckoutPage } from './app/pages/checkout/checkout';
// import { CartPage } from './app/pages/checkout/cart';

// Protected pages
import { Dashboard } from './app/pages/dashboard/dashboard';
import { FiftyPageComponent } from '@/pages/fiftyPlus/fiftyPage';

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
import { ProfilePage } from '@/pages/profile/profile';

// Guards
import { AuthGuard } from '@/shared/guards/authGuard';
import { AdminGuard } from '@/shared/guards/adminGuard';

// Not found
import { Notfound } from './app/pages/notfound/notfound';
import { HomePage } from '@/pages/public/home';
import { WeeklyQuizPage } from '@/pages/public/quiz';
import { FindAVenuePage } from '@/pages/public/findavenue';
import { FiftyShopPage } from '@/pages/public/fiftyshop';
import { ContactUsPage } from '@/pages/public/contactus';
import { Login } from '@/pages/auth/login';

export const appRoutes: Routes = [

  // ------------------------------
  // 🌐 PUBLIC ROUTES
  // ------------------------------
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomePage },
  { path: 'weekly-quiz', component: WeeklyQuizPage },
  { path: 'find-a-venue', component: FindAVenuePage },
  { path: 'fiftyshop', component: FiftyShopPage },
  { path: 'contact-us', component: ContactUsPage },

  { path: 'login', component: Login },
  { path: 'signup', component: Landing },

  // User profile
  { path: 'profile/:userId', component: ProfilePage, canActivate: [AuthGuard] },

  // Checkout
  { path: 'checkout', component: Landing, canActivate: [AuthGuard] },
  { path: 'checkout/cart', component: Landing },

  // ------------------------------
  // 🔒 PROTECTED AREA (formerly "members")
  // now → /fiftyPlus
  // ------------------------------
  {
    path: '',
    component: AppLayout,
    canActivate: [AuthGuard],
    children: [
      { path: 'fiftyPlus', component: Dashboard },
      { path: 'fiftyPlus/profile', component: ProfilePage },

      { path: 'fiftyPlus/archives', component: FiftyPageComponent, data: { type: 1, title: 'Archives' } },
      { path: 'fiftyPlus/archives/:quizid', component: FiftyPageComponent, data: { type: 1 } },

      { path: 'fiftyPlus/exclusives', component: FiftyPageComponent, data: { type: 2, title: 'Exclusives' } },
      { path: 'fiftyPlus/exclusives/:quizid', component: FiftyPageComponent, data: { type: 2 } },

      { path: 'fiftyPlus/collabs', component: FiftyPageComponent, data: { type: 3, title: 'Collaborations' } },
      { path: 'fiftyPlus/collabs/:quizid', component: FiftyPageComponent, data: { type: 3 } },

      { path: 'fiftyPlus/questionQuizzes', component: FiftyPageComponent, data: { type: 4, title: 'Question Quizzes' } },
      { path: 'fiftyPlus/questionQuizzes/:quizid', component: FiftyPageComponent, data: { type: 4 } },

      // ------------------------------
      // 🛠 ADMIN ROUTES
      // ------------------------------
      {
        path: 'fiftyPlus/admin',
        canActivate: [AdminGuard],
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
