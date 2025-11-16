import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { Venue, QuizzingType } from '@/shared/models/venues.model';
import { VenueService } from '@/shared/services/venues.service';

interface SelectOption {
  label: string;
  value: any;
}

@Component({
  selector: 'app-venue-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    DatePickerModule,
    SelectButtonModule,
    SelectModule
  ],
  template: `
<p-dialog
  header="{{ isEdit ? 'Edit Venue' : 'Create Venue' }}"
  [(visible)]="visible"
  [modal]="true"
  [closable]="true"
  [style]="{ width: '90vw', height: '90vh' }"
  [contentStyle]="{ height: 'calc(90vh - 60px)', overflow: 'auto' }"
>
  <form [formGroup]="venueForm" class="flex flex-col gap-3">
    <label>Name</label>
    <input pInputText formControlName="name" />

    <label>City</label>
    <input pInputText formControlName="city" />

    <label>Address</label>
    <input pInputText formControlName="address" />

    <label>State</label>
    <input pInputText formControlName="state" />

    <label>Quizzing Type</label>
    <p-select
      [options]="quizzingOptions"
      formControlName="quizzingType"
      optionLabel="label"
      optionValue="value"
    ></p-select>

    <label>Commencing Date</label>
    <p-datepicker formControlName="commencingDate" dateFormat="yy-mm-dd"></p-datepicker>

    <label>Quiz Time</label>
    <input pInputText formControlName="quizTime" placeholder="HH:mm" />

    <label>
      <input type="checkbox" formControlName="isActive" /> Active
    </label>

    <div class="flex justify-end gap-2 mt-3">
      <button pButton label="Cancel" class="p-button-secondary" (click)="hide()"></button>
      <button
        pButton
        label="Save"
        class="p-button-primary"
        (click)="save()"
        [disabled]="venueForm.invalid"
      ></button>
    </div>
  </form>
</p-dialog>

  `
})
export class VenueModalComponent {
  private fb = inject(FormBuilder);
  private venueService = inject(VenueService);

  visible = false;
  isEdit = false;
  venueForm!: FormGroup;
  currentVenue?: Venue;

  quizzingOptions: SelectOption[] = [
    { label: 'Weekly', value: 'Weekly' },
    { label: 'Fortnightly', value: 'Fortnightly' },
    { label: 'Monthly', value: 'Monthly' },
    { label: 'Collab', value: 'Collab' },
    { label: 'One-Offs', value: 'One-Offs' },
    { label: 'Custom', value: 'Custom' }
  ];

  constructor() {
    this.venueForm = this.fb.group({
      name: [''],
      city: [''],
      address: [''],
      state: [''],
      quizzingType: [null],
      commencingDate: [null],
      quizTime: [''],
      isActive: [true]
    });
  }

  show(venue?: Venue) {
    this.visible = true;
    this.isEdit = !!venue;
    this.currentVenue = venue;

    if (venue) {
      this.venueForm.patchValue({
        ...venue
        // commencingDate: new Date(venue.commencingDate)
      });
    } else {
      this.venueForm.reset({ isActive: true });
    }
  }

  hide() {
    this.visible = false;
  }

  async save() {
    if (this.venueForm.invalid) return;

    const formValue = this.venueForm.value;
    const payload: Venue = {
      ...formValue,
      commencingDate: formValue.commencingDate.toISOString().split('T')[0]
    };

    if (this.isEdit && this.currentVenue?.id) {
      await this.venueService.updateVenue(this.currentVenue.id, payload);
    } else {
      await this.venueService.addVenue(payload);
    }

    this.hide();
  }
}
