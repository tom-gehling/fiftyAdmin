export interface LoginFormModel {
  email: string;        // required
  password: string;     // required
  displayName?: string;     // required
  rememberMe?: boolean; // optional
}
