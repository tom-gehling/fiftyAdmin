export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  createdAt: Date;
  isAdmin?: boolean;
  isMember: boolean;
  isAnon: boolean;
  followers: string[];
  following: string[];
  loginCount: number;
}

// Subcollection: following
export interface UserFollowing {
  followedUid: string;
  followedAt: Date;
}

// Subcollection: followers (optional if you want reverse lookup)
export interface UserFollower {
  followerUid: string;
  followedAt: Date;
}