export type AccountView = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  canAccessControl: boolean;
  csrf: string;
};
