export interface TagInvite {
    inviteId?: string; // Firestore doc id, format `{resultId}_{invitedUid}`
    resultId: string;
    quizId: string;
    invitedUid: string;
    invitedDisplayName: string;
    inviterUid: string;
    inviterDisplayName: string;
    score: number;
    total: number;
    invitedAt: Date;
}
