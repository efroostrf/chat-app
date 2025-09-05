export interface GithubUser {
  id: string;
  login: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface GithubUserEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}
