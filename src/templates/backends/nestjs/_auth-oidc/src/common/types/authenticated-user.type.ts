export interface AuthenticatedUser {
  sub: string;
  email: string;
  name: string;
  groups: string[];
  iat?: number;
  exp?: number;
}
