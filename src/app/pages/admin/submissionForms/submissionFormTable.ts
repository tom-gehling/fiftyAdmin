import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';

import { SubmissionForm } from '@/shared/models/submissionForm.model';
import { SubmissionFormService } from '@/shared/services/submission-form.service';
import { AuthService } from '@/shared/services/auth.service';
import { NotifyService } from '@/shared/services/notify.service';

@Component({
  selector: 'app-submission-form-table',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TagModule
  ],
  template: `
    <p-card>
      <!-- Header and Filters -->
      <div class="flex flex-col sm:flex-row justify-between items-start md:items-center mb-4 gap-2">
        <h2>Submission Forms</h2>

        <div class="flex flex-col sm:flex-row gap-2 flex-1 w-full md:ml-4">
          <!-- Search -->
          <input
            pInputText
            type="text"
            placeholder="Search forms..."
            class="flex-1 min-w-0"
            [(ngModel)]="searchText"
            (input)="filterForms()"
          />

          <!-- Create form button -->
          <button
            pButton
            label="Create Form"
            icon="pi pi-plus"
            class="p-button-primary"
            *ngIf="canWrite()"
            (click)="createForm()"
          ></button>
        </div>
      </div>

      <!-- Form List -->
      <div *ngIf="!loading && filteredForms.length > 0; else loadingOrEmpty">
        <div
          *ngFor="let form of filteredForms"
          style="display: flex !important; flex-direction:row; border: 1px solid var(--fifty-neon-green); gap: 20px;"
          class="p-card mb-2 flex flex-row items-center justify-between cursor-pointer transition-colors"
          [ngClass]="{
            'bg-surface-50 dark:bg-surface-700': selectedForm?.id === form?.id,
            'hover:bg-surface-100 dark:hover:bg-surface-600': selectedForm?.id !== form?.id
          }"
          (click)="highlightRow(form)"
          (dblclick)="openForm(form)"
        >
          <!-- Left: name + description -->
          <div class="flex flex-1 items-center gap-4 p-3">
            <div class="flex flex-col justify-center">
              <div class="font-semibold text-lg text-surface-900 dark:text-surface-100">
                {{ form.name }}
              </div>
              <div class="text-sm text-gray-500" *ngIf="form.description">
                {{ form.description }}
              </div>
              <div class="text-xs text-gray-400 mt-1">
                {{ form.fields?.length || 0 }} fields
              </div>
            </div>
          </div>

          <!-- Right: status flags + buttons -->
          <div class="flex flex-col justify-between items-end p-3">
            <div class="flex flex-col items-end gap-2">
              <div class="flex items-center gap-2 text-sm text-gray-500">
                <span
                  *ngIf="form.isDefault"
                  style="background-color: var(--fifty-pink)"
                  class="px-2 py-0.5 text-xs font-semibold text-black rounded-full"
                >
                  Default
                </span>
                <span
                  *ngIf="form.isActive"
                  class="px-2 py-0.5 text-xs font-semibold text-white bg-green-500 rounded-full"
                >
                  Active
                </span>
                <span
                  *ngIf="!form.isActive"
                  class="px-2 py-0.5 text-xs font-semibold text-white bg-gray-400 rounded-full"
                >
                  Inactive
                </span>
              </div>
            </div>

            <div class="flex gap-2 mt-2">
              <button
                pButton
                icon="pi pi-star"
                class="p-button-text p-button-sm"
                *ngIf="canWrite() && !form.isDefault && form.isActive"
                pTooltip="Set as Default"
                (click)="setAsDefault(form); $event.stopPropagation()"
              ></button>
              <button
                pButton
                icon="pi pi-pencil"
                class="p-button-text p-button-sm"
                *ngIf="canWrite()"
                (click)="editForm(form); $event.stopPropagation()"
              ></button>
              <button
                pButton
                icon="pi pi-trash"
                class="p-button-text p-button-sm p-button-danger"
                *ngIf="canWrite() && !form.isDefault"
                (click)="deleteForm(form); $event.stopPropagation()"
              ></button>
            </div>
          </div>
        </div>
      </div>

      <ng-template #loadingOrEmpty>
        <div class="text-center text-gray-500 py-4" *ngIf="loading">Loading forms...</div>
        <div class="text-center text-gray-500 py-4" *ngIf="!loading && !filteredForms.length">
          No submission forms found.
          <button
            pButton
            label="Create Default Form"
            class="p-button-link"
            *ngIf="canWrite()"
            (click)="createDefaultForm()"
          ></button>
        </div>
      </ng-template>
    </p-card>
  `
})
export class SubmissionFormTableComponent implements OnInit {
  forms: SubmissionForm[] = [];
  filteredForms: SubmissionForm[] = [];
  searchText = '';
  loading = false;
  selectedForm: SubmissionForm | null = null;

  constructor(
    private formService: SubmissionFormService,
    private authService: AuthService,
    private router: Router,
    private notify: NotifyService
  ) {}

  ngOnInit(): void {
    this.loadForms();
  }

  loadForms(): void {
    this.loading = true;
    this.formService.getAllForms().subscribe(forms => {
      this.forms = forms;
      this.filterForms();
      this.loading = false;
    });
  }

  filterForms(): void {
    if (!this.searchText.trim()) {
      this.filteredForms = [...this.forms];
    } else {
      const term = this.searchText.toLowerCase();
      this.filteredForms = this.forms.filter(
        f =>
          f.name.toLowerCase().includes(term) ||
          f.description?.toLowerCase().includes(term)
      );
    }
  }

  canWrite(): boolean {
    return !!this.authService.user$.value;
  }

  createForm(): void {
    if (this.canWrite()) {
      this.router.navigate(['/fiftyPlus/admin/submissionForms', '0']);
    }
  }

  editForm(form: SubmissionForm): void {
    this.router.navigate(['/fiftyPlus/admin/submissionForms', form.id]);
  }

  highlightRow(form: SubmissionForm): void {
    this.selectedForm = form;
  }

  openForm(form: SubmissionForm): void {
    this.router.navigate(['/fiftyPlus/admin/submissionForms', form.id]);
  }

  async deleteForm(form: SubmissionForm): Promise<void> {
    if (!form.id) return;
    if (confirm('Are you sure you want to deactivate this form?')) {
      try {
        await this.formService.deleteForm(form.id);
        this.notify.success('Form deactivated successfully');
      } catch (err) {
        console.error(err);
        this.notify.error('Error deactivating form');
      }
    }
  }

  async setAsDefault(form: SubmissionForm): Promise<void> {
    if (!form.id) return;
    try {
      await this.formService.setAsDefault(form.id);
      this.notify.success('Form set as default');
    } catch (err) {
      console.error(err);
      this.notify.error('Error setting default form');
    }
  }

  async createDefaultForm(): Promise<void> {
    try {
      const formId = await this.formService.createDefaultSubmissionForm();
      this.notify.success('Default form created');
      this.router.navigate(['/fiftyPlus/admin/submissionForms', formId]);
    } catch (err) {
      console.error(err);
      this.notify.error('Error creating default form');
    }
  }
}
