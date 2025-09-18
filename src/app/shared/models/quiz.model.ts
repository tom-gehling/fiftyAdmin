import { QuizTypeEnum } from "../enums/QuizTypeEnum";


// Represents a single quiz question
export interface QuizQuestion {
    id?: string;             
    questionId: number;     
    question: string;
    answer: string;
    category?: string;
    timeless?: boolean;      
}

// Represents quiz theming options
export interface QuizTheme {
    fontColor: string;
    backgroundColor: string;
    tertiaryColor: string;
}

// Represents a quiz
export interface Quiz {
    /** Firestore document ID */
    id?: string;

    /** Unique quiz identifier used on the website (e.g., weekly number, collab ID) */
    quizId: number;

    /** Title for Fifty+ or Collab quizzes (not used for weekly quizzes) */
    quizTitle?: string;

    creationTime?: Date;
    deploymentDate?: Date;
    deploymentTime?: string;  // e.g., "14:30"
    quizType?: QuizTypeEnum;        // could be enum: Weekly, Fifty+, Collab
    isPremium?: boolean;
    isActive?: boolean;

    questions: QuizQuestion[];
    theme?: QuizTheme;

    notesAbove?: string;
    notesBelow?: string;
    imageUrl?: string;
}
