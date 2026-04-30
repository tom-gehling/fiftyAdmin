import { QuizTypeEnum } from '@/shared/enums/QuizTypeEnum';
import { QuizTypeKey } from '@/shared/models/userStats.model';

export interface QuizTypeStyle {
    accent: string;
    glow: string;
    chip: string;
    icon: string;
    badge: string;
}

export const QUIZ_TYPE_STYLES: Record<QuizTypeEnum, QuizTypeStyle> = {
    [QuizTypeEnum.Weekly]: {
        accent: '#4cfbab',
        glow: 'rgba(76, 251, 171, 0.35)',
        chip: 'rgba(76, 251, 171, 0.15)',
        icon: 'pi-calendar',
        badge: 'Weekly'
    },
    [QuizTypeEnum.FiftyPlus]: {
        accent: '#fbe2df',
        glow: 'rgba(251, 226, 223, 0.4)',
        chip: 'rgba(251, 226, 223, 0.15)',
        icon: 'pi-star-fill',
        badge: 'Fifty+'
    },
    [QuizTypeEnum.Collab]: {
        accent: '#c4a5ff',
        glow: 'rgba(196, 165, 255, 0.4)',
        chip: 'rgba(196, 165, 255, 0.15)',
        icon: 'pi-users',
        badge: 'Collab'
    },
    [QuizTypeEnum.QuestionType]: {
        accent: '#ffc857',
        glow: 'rgba(255, 200, 87, 0.4)',
        chip: 'rgba(255, 200, 87, 0.15)',
        icon: 'pi-list',
        badge: 'Question'
    }
};

export const QUIZ_TYPE_KEY_TO_ENUM: Record<QuizTypeKey, QuizTypeEnum> = {
    weekly: QuizTypeEnum.Weekly,
    fiftyPlus: QuizTypeEnum.FiftyPlus,
    collab: QuizTypeEnum.Collab,
    questionType: QuizTypeEnum.QuestionType
};

const FALLBACK_STYLE = QUIZ_TYPE_STYLES[QuizTypeEnum.Weekly];

export function getQuizTypeStyle(type: QuizTypeEnum | QuizTypeKey | number | null | undefined): QuizTypeStyle {
    if (type === null || type === undefined) return FALLBACK_STYLE;
    if (typeof type === 'string') {
        const mapped = QUIZ_TYPE_KEY_TO_ENUM[type as QuizTypeKey];
        return QUIZ_TYPE_STYLES[mapped] ?? FALLBACK_STYLE;
    }
    return QUIZ_TYPE_STYLES[type as QuizTypeEnum] ?? FALLBACK_STYLE;
}
