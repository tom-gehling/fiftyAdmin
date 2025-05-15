import { Type } from '@angular/core';
import { HomeComponent } from '../../home/home.component';
import { QuizComponent } from '../../quiz/quiz.component';
import { QuizTemplateComponent } from '../../quiz-template/quiz-template.component';

export interface AppMenuItem {
  path: string;
  label: string;
  icon: string;
  component: Type<any>;
  animation: string;
  children?: AppMenuItem[];
  shownInMenu: boolean;
}

export const MENU_ITEMS: AppMenuItem[] = [
  {
    path: 'home',
    label: 'Home',
    icon: 'home',
    component: HomeComponent,
    animation: 'HomePage',
    shownInMenu: true,
  },
  {
    path: 'quizzes',
    label: 'Quizzes',
    icon: 'quiz',
    component: QuizComponent,
    animation: 'QuizPage',
    shownInMenu: true,
  },
  {
    path: 'quizzes/:id',
    label: 'Quizzes',
    icon: 'quiz',
    component: QuizTemplateComponent,
    animation: 'QuizTemplatePage',
    shownInMenu: false,
  }
];
