export interface QuizQuestion {
    id?: string;
    questionId: number;
    question: string;
    answer: string;
    category?: string;
    timeless?: boolean;
}

export interface QuizTheme {
    fontColor: string;
    backgroundColor: string;
    tertiaryColor: string;
}

export interface Quiz {
    // Firestore document ID (string)
    id?: string;
    quizId?: number;

    // Domain ID of the quiz (number)
    quizNumber: number;
    quizTitle?: string;
    creationTime?: Date; // optional for new docs
    deploymentDate?: Date;
    deploymentTime?: string; // e.g., "14:30"
    quizType?: number;
    isPremium?: boolean;
    isActive?: boolean;
    questions: QuizQuestion[];
    theme?: QuizTheme;
    notesAbove?: string;
    notesBelow?: string;
    imageUrl?: string;
}
