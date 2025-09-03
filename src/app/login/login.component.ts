import { Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { buildForm } from '../utils/formBuilder';
import { AuthService } from '../shared/services/auth.service';
import { LoginFormModel } from '../models/auth.model';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    ReactiveFormsModule]
})
export class LoginComponent {
  loading = false;
  error: string | null = null;
  loginForm!: FormGroup;

  private defaultModel: LoginFormModel = {
    email: '',
    password: '',
    rememberMe: false,
  };

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loginForm = buildForm<LoginFormModel>(this.fb, this.defaultModel);
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;
    this.loading = true;
    this.error = null;

    const { email, password } = this.loginForm.getRawValue();

    try {
      await this.auth.loginEmailPassword(email!, password!);
      this.router.navigate(['/home']); // go to main app
    } catch (err: any) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }

  async logout() {
    await this.auth.logout();
  }
}
