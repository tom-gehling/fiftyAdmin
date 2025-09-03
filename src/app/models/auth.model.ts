export interface LoginFormModel {
  email: string;        // required
  password: string;     // required
  displayName?: string; // optional
  rememberMe?: boolean; // optional
}
