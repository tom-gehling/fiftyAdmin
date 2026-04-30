import { QuizTheme } from './quiz.model';

export interface Collaborator {
    id?: string;
    name: string;
    slug: string;
    theme: QuizTheme;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: string;
    updatedBy?: string;
}

export const DEFAULT_COLLABORATOR_THEME: QuizTheme = {
    fontColor: '#fbe2df',
    backgroundColor: '#677c73',
    tertiaryColor: '#4cfbab'
};
