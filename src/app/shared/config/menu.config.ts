import { Type } from '@angular/core';
import { HomeComponent } from '../../home/home.component';
import { QuizComponent } from '../../quiz/quiz.component';
import { QuizTemplateComponent } from '../../quiz-template/quiz-template.component';
import { QuizDetailComponent } from '../../quiz-detail/quiz-detail.component';

export interface AppMenuItem {
  path: string;
  label: string;
  icon: string;
  shownInMenu: boolean;
}

export const MENU_ITEMS: AppMenuItem[] = [
   {
    path: 'home',
    label: 'Home',
    icon: 'home',
    shownInMenu: true,
  },
  {
    path: 'quizzes',
    label: 'Quizzes',
    icon: 'quiz',
    shownInMenu: true,
  },
];
