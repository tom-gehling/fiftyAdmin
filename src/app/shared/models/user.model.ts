export interface AppUser {
  uid?: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  createdAt: Date;
  isAdmin?: boolean;
  isMember: boolean;
  isAnon: boolean;
  followers: string[];
  following: string[];
  loginCount: number;

  // Extra fields for placeholders / external integration
  externalQuizId?: string; // links the user to external quiz system
  lastLoginAt?: Date;      // track last login
  updatedAt?: Date;        // last profile update
}

// Subcollection interfaces remain the same
export interface UserFollowing {
  followedUid: string;
  followedAt: Date;
}

export interface UserFollower {
  followerUid: string;
  followedAt: Date;
}
