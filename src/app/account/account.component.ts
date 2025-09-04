import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule, Location } from '@angular/common';
import { AuthService } from '../shared/services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
})
export class AccountComponent implements OnInit {
  accountForm!: FormGroup;
  displayName: string = '';


  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.auth.user$.subscribe((user) => {
      if (user) {
        this.accountForm = this.fb.group({
          email: [{ value: user.email, disabled: true }]
        });
        this.displayName = user.displayName || '';
      }
    });
  }

  async saveChanges() {
    if (!this.accountForm) return;

    const { displayName } = this.accountForm.getRawValue();

    if (displayName) {
      await this.auth.updateDisplayName(displayName);
    }

    this.location.back(); // go back after saving
  }

  async saveDisplayName() {
    if (!this.displayName) return;
    await this.auth.updateDisplayName(this.displayName);
    alert('Display name updated!');
    this.location.back();
  }

  goBack() {
    this.location.back();
  }
}
