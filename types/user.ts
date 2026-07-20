export type UserRole = "guest" | "user" | "admin";

export type PackType = "text" | "illustrated";

export interface StoryPack {
  storiesRemaining: number;
  purchases: number;
}

export interface UserProfile {
  uid: string;

  displayName: string;

  email: string;

  role: UserRole;

  packs: {
    text: StoryPack;
    illustrated: StoryPack;
  };

  createdAt: string;

  lastLogin: string | null;

  lastStoryCreatedAt: string | null;
}