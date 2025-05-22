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
    children?: AppMenuItem[]; // add this line
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
        children: [
            {
                path: 'quizzes',
                label: 'Quizzes',
                icon: 'quiz', // choose icon as needed
                shownInMenu: true,
            },
            {
                path: 'submissions',
                label: 'Submissions',
                icon: 'upload', // choose icon as needed
                shownInMenu: true,
            },
            {
                path: 'forms',
                label: 'Forms',
                icon: 'description',
                shownInMenu: true,
            },
            {
                path: 'quiz-night-questions',
                label: 'Quiz Night Questions',
                icon: 'question_answer',
                shownInMenu: true,
            },
        ],
    },
    {
        path: 'venues',
        label: 'Venues',
        icon: 'location_on',
        shownInMenu: true,
    },
    {
        path: 'sponsors',
        label: 'Sponsors',
        icon: 'star',
        shownInMenu: true,
    },
];
