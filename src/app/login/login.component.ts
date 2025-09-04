import { Component, Input } from '@angular/core';
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
    ReactiveFormsModule
  ]
})
export class LoginComponent {
  @Input() accountEditMode:boolean = false;

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
    if (this.accountEditMode) {
      this.loginForm.addControl('displayName', this.fb.control(''));
      this.loginForm.removeControl('rememberMe');
    }
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;
    this.loading = true;
    this.error = null;
    try{
      if (this.accountEditMode) {
        const { displayName, password } = this.loginForm.getRawValue();
        if (displayName) {
          await this.auth.updateDisplayName(displayName);
        }
      } else {
        const { email, password, rememberMe } = this.loginForm.getRawValue();
        await this.auth.loginEmailPassword(email!, password!, rememberMe);
        this.router.navigate(['/home']);
      }
    }

    


    catch (err: any) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }

  async logout() {
    await this.auth.logout();
  }
}
