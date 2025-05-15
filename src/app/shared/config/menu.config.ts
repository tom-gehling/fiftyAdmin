import { Type } from '@angular/core';
import { HomeComponent } from '../../home/home.component';
import { QuizComponent } from '../../quiz/quiz.component';
import { QuizListComponent } from '../../quiz-list/quiz-list.component';

export interface AppMenuItem {
  path: string;
  label: string;
  icon: string;
  component: Type<any>;
  animation: string;
  children?: AppMenuItem[];
}

export const MENU_ITEMS: AppMenuItem[] = [
  {
    path: 'home',
    label: 'Home',
    icon: 'home',
    component: HomeComponent,
    animation: 'HomePage'
  },
  {
    path: 'quiz',
    label: 'Quiz',
    icon: 'quiz',
    component: QuizComponent,
    animation: 'QuizPage'
  },
  {
    path: 'quiz-list',
    label: 'Quiz List',
    icon: 'list',
    component: QuizListComponent,
    animation: 'QuizListPage'
  }
];
