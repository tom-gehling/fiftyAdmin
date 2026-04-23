import { GameType } from '@/shared/models/puzzle.model';

export interface GameTheme {
    color: string;
    colorSoft: string;
    label: string;
}

export const GAME_THEME: Record<GameType, GameTheme> = {
    makeTen: { color: '#f59e0b', colorSoft: '#f59e0b20', label: 'Make 10' },
    chainGame: { color: '#6366f1', colorSoft: '#6366f120', label: 'Word Chain' },
    countryJumble: { color: '#10b981', colorSoft: '#10b98120', label: 'Country Jumble' },
    movieEmoji: { color: '#ef4444', colorSoft: '#ef444420', label: 'Movie Emoji' },
    rushHour: { color: '#8b5cf6', colorSoft: '#8b5cf620', label: 'Puzzle Slide' },
    tileRun: { color: '#3b82f6', colorSoft: '#3b82f620', label: 'Tile Run' }
};

export function getGameTheme(type: GameType | undefined): GameTheme {
    if (!type) return { color: 'var(--primary-color)', colorSoft: 'var(--primary-color)', label: '' };
    return GAME_THEME[type] ?? { color: 'var(--primary-color)', colorSoft: 'var(--primary-color)', label: '' };
}
