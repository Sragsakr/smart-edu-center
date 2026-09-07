import "server-only";

export type CurrentUserIdentity = {
  id: string;
  email: string;
};

export interface CurrentUserProvider {
  getCurrentUser(): Promise<CurrentUserIdentity | null>;
}
