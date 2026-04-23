export type GameType = 'makeTen' | 'chainGame' | 'movieEmoji' | 'rushHour' | 'countryJumble' | 'tileRun';

export interface RushHourBlock {
    id: string;
    row: number;
    col: number;
    length: number;
    direction: 'h' | 'v';
    isTarget: boolean;
}

export interface Puzzle {
    id?: string;
    gameType: 'movieEmoji' | 'rushHour';
    dateKey: string;
    isActive: boolean;
    createdAt: Date;
    createdBy: string;

    // movieEmoji
    emojis?: string[];
    answer?: string;
    alternateAnswers?: string[];

    // rushHour
    gridSize?: number;
    blocks?: RushHourBlock[];
    targetBlockId?: string;
    exitSide?: 'right' | 'left' | 'top' | 'bottom';
    minMoves?: number;
}
