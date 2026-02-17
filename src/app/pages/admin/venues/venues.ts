import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';

import { VenueService } from '@/shared/services/venue.service';
import { StorageService } from '@/shared/services/storage.service';
import { GoogleMapsService } from '@/shared/services/google-maps.service';
import { NotifyService } from '@/shared/services/notify.service';
import { Venue, VenueSchedule } from '@/shared/models/venue.model';

@Component({
  selector: 'app-venues',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    CheckboxModule,
    FloatLabelModule,
    ProgressSpinnerModule,
    CardModule,
    SelectModule,
    TextareaModule,
    InputNumberModule
  ],
  template: `
    <!-- Loading Spinner -->
    <div *ngIf="saving" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div class="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
    </div>

    <p-card class="flex flex-col flex-1 p-4">
      <!-- Header Actions -->
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Venue Management</h2>
        <button pButton type="button" label="Add Venue" icon="pi pi-plus" (click)="openNewVenueDialog()"></button>
      </div>

      <!-- Search -->
      <div class="mb-4">
        <span class="p-input-icon-left w-full">
          <i class="pi pi-search"></i>
          <input pInputText type="text" [(ngModel)]="searchTerm" (input)="onSearch()" placeholder="Search venues..." class="w-full" />
        </span>
      </div>

      <!-- Venues Table -->
      <p-table
        [value]="filteredVenues"
        [paginator]="true"
        [rows]="10"
        [rowsPerPageOptions]="[5, 10, 20]"
        [globalFilterFields]="['venueName', 'location.city', 'location.address']"
      >
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="venueName">Venue Name <p-sortIcon field="venueName"></p-sortIcon></th>
            <th class="hidden md:table-cell">City</th>
            <th class="hidden lg:table-cell">Address</th>
            <th class="hidden sm:table-cell">Quiz Days</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-venue>
          <tr>
            <td>{{ venue.venueName }}</td>
            <td class="hidden md:table-cell">{{ venue.location.city }}</td>
            <td class="hidden lg:table-cell">{{ venue.location.address }}</td>
            <td class="hidden sm:table-cell">{{ formatQuizDays(venue) }}</td>
            <td>
              <i [class]="venue.isActive ? 'pi pi-check text-green-500' : 'pi pi-times text-red-500'"></i>
            </td>
            <td>
              <div class="flex gap-2">
                <button pButton type="button" icon="pi pi-pencil" class="p-button-text p-button-sm" (click)="editVenue(venue)"></button>
                <button pButton type="button" icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger" (click)="deleteVenue(venue)"></button>
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6" class="text-center">No venues found</td>
          </tr>
        </ng-template>
      </p-table>

      <!-- Venue Dialog -->
      <p-dialog
        [(visible)]="venueDialog"
        [modal]="true"
        [style]="{ width: '50rem', maxWidth: '95vw' }"
        [baseZIndex]="10000"
        [contentStyle]="{ 'max-height': '70vh', 'overflow': 'auto' }"
      >
        <ng-template #header>
          <span class="font-bold">{{ isEditing ? 'Edit Venue' : 'New Venue' }}</span>
        </ng-template>

        <form [formGroup]="venueForm" class="p-fluid flex flex-col gap-4 pt-2">
          <!-- Venue Name & Active -->
          <div class="flex gap-4 items-start">
            <p-floatlabel class="flex-1" variant="on">
              <input pInputText id="venueName" formControlName="venueName" autocomplete="off" class="w-full" />
              <label for="venueName">Venue Name *</label>
            </p-floatlabel>
            <div class="flex items-center gap-2 pt-3">
              <p-checkbox id="isActive" formControlName="isActive" binary="true"></p-checkbox>
              <label for="isActive" class="font-semibold">Active</label>
            </div>
          </div>

          <!-- Address (with Autocomplete) -->
          <p-floatlabel variant="on">
            <input
              #addressInput
              pInputText
              id="address"
              formControlName="address"
              autocomplete="off"
              class="w-full"
              placeholder="Start typing an address..."
            />
            <label for="address">Address *</label>
          </p-floatlabel>

          <!-- City, State & Country (auto-filled from geocoding) -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <p-floatlabel variant="on">
              <input pInputText id="city" formControlName="city" class="w-full" />
              <label for="city">City</label>
            </p-floatlabel>
            <p-floatlabel variant="on">
              <input pInputText id="state" formControlName="state" class="w-full" />
              <label for="state">State</label>
            </p-floatlabel>
            <p-floatlabel variant="on">
              <input pInputText id="country" formControlName="country" class="w-full" />
              <label for="country">Country</label>
            </p-floatlabel>
          </div>

          <!-- Contact Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <p-floatlabel variant="on">
              <input pInputText id="websiteUrl" formControlName="websiteUrl" class="w-full" />
              <label for="websiteUrl">Website URL</label>
            </p-floatlabel>
            <p-floatlabel variant="on">
              <input pInputText id="phoneNumber" formControlName="phoneNumber" class="w-full" />
              <label for="phoneNumber">Phone Number</label>
            </p-floatlabel>
          </div>

          <!-- Notes -->
          <p-floatlabel variant="on">
            <textarea pTextarea id="description" formControlName="description" rows="3" class="w-full"></textarea>
            <label for="description">Notes</label>
          </p-floatlabel>

          <!-- Venue Image -->
          <div>
            <label class="font-semibold mb-2 block">Venue Image</label>
            <div class="flex items-center gap-4">
              <div *ngIf="imagePreview" class="relative">
                <img [src]="imagePreview" alt="Venue image" class="w-32 h-32 object-cover rounded border" />
                <button pButton type="button" icon="pi pi-times" class="p-button-rounded p-button-danger p-button-sm absolute -top-2 -right-2" (click)="removeImage()"></button>
              </div>
              <div *ngIf="!imagePreview" class="w-32 h-32 border border-dashed rounded flex items-center justify-center text-gray-400 cursor-pointer" (click)="imageInput.click()">
                <i class="pi pi-image text-3xl"></i>
              </div>
              <div class="flex flex-col gap-2">
                <button pButton type="button" [label]="imagePreview ? 'Change Image' : 'Upload Image'" icon="pi pi-upload" class="p-button-sm p-button-outlined" (click)="imageInput.click()"></button>
                <input #imageInput type="file" accept="image/*" class="hidden" (change)="onImageSelected($event)" />
              </div>
            </div>
          </div>

          <!-- Quiz Schedules -->
          <div formArrayName="quizSchedules">
            <div class="flex justify-between items-center mb-2">
              <label class="font-semibold">Quiz Schedules</label>
              <button pButton type="button" label="Add Schedule" icon="pi pi-plus" class="p-button-sm" (click)="addSchedule()"></button>
            </div>

            <div *ngFor="let schedule of quizSchedules.controls; let i = index" [formGroupName]="i" class="border rounded p-4 mb-3">
              <div class="flex justify-between items-center mb-3">
                <span class="font-semibold">Schedule {{ i + 1 }}</span>
                <button pButton type="button" icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger" (click)="removeSchedule(i)"></button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Schedule Type -->
                <p-floatlabel variant="on">
                  <p-select
                    id="scheduleType{{ i }}"
                    formControlName="type"
                    [options]="scheduleTypes"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                    (onChange)="onScheduleTypeChange(i)"
                  ></p-select>
                  <label for="scheduleType{{ i }}">Schedule Type *</label>
                </p-floatlabel>

                <!-- Day of Week -->
                <p-floatlabel variant="on" *ngIf="schedule.get('type')?.value !== 'custom'">
                  <p-select
                    id="dayOfWeek{{ i }}"
                    formControlName="dayOfWeek"
                    [options]="daysOfWeek"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                  ></p-select>
                  <label for="dayOfWeek{{ i }}">Day of Week *</label>
                </p-floatlabel>

                <!-- Week of Month (for monthly) -->
                <p-floatlabel variant="on" *ngIf="schedule.get('type')?.value === 'monthly'">
                  <p-select
                    id="weekOfMonth{{ i }}"
                    formControlName="weekOfMonth"
                    [options]="weeksOfMonth"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                  ></p-select>
                  <label for="weekOfMonth{{ i }}">Week of Month *</label>
                </p-floatlabel>

                <!-- Start & End Time -->
                <p-floatlabel variant="on">
                  <input pInputText id="startTime{{ i }}" formControlName="startTime" type="time" class="w-full" />
                  <label for="startTime{{ i }}">Start Time</label>
                </p-floatlabel>

                <p-floatlabel variant="on">
                  <input pInputText id="endTime{{ i }}" formControlName="endTime" type="time" class="w-full" />
                  <label for="endTime{{ i }}">End Time</label>
                </p-floatlabel>

                <!-- Active Checkbox -->
                <div class="flex items-center gap-2">
                  <p-checkbox id="scheduleActive{{ i }}" formControlName="isActive" binary="true"></p-checkbox>
                  <label for="scheduleActive{{ i }}">Active</label>
                </div>
              </div>

              <!-- Notes -->
              <p-floatlabel variant="on" class="mt-3">
                <textarea pTextarea id="scheduleNotes{{ i }}" formControlName="notes" rows="2" class="w-full"></textarea>
                <label for="scheduleNotes{{ i }}">Notes</label>
              </p-floatlabel>
            </div>

            <div *ngIf="quizSchedules.length === 0" class="text-gray-500 text-center p-4 border border-dashed rounded">
              No quiz schedules added. Click "Add Schedule" to add one.
            </div>
          </div>
        </form>

        <ng-template #footer>
          <p-button label="Cancel" [text]="true" severity="secondary" (click)="closeDialog()" [disabled]="saving" />
          <p-button label="Save" [outlined]="true" severity="secondary" (click)="saveVenue()" [disabled]="saving || venueForm.invalid" />
        </ng-template>
      </p-dialog>
    </p-card>
  `,
  styles: [`
    @media (max-width: 640px) {
      ::ng-deep .p-dialog {
        width: 95vw !important;
      }
    }
  `]
})
export class VenuesComponent implements OnInit, AfterViewInit {
  @ViewChild('addressInput') addressInput!: ElementRef<HTMLInputElement>;
  @ViewChild('imageInput') imageInput!: ElementRef<HTMLInputElement>;

  venues: Venue[] = [];
  filteredVenues: Venue[] = [];
  selectedVenue: Venue | null = null;
  venueDialog = false;
  isEditing = false;
  saving = false;
  searchTerm = '';

  venueForm!: FormGroup;
  autocomplete?: google.maps.places.Autocomplete;
  imagePreview: string | null = null;
  selectedImageFile?: File;

  scheduleTypes = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Biweekly', value: 'biweekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Custom Dates', value: 'custom' }
  ];

  daysOfWeek = [
    { label: 'Sunday', value: 0 },
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 }
  ];

  weeksOfMonth = [
    { label: 'First', value: 1 },
    { label: 'Second', value: 2 },
    { label: 'Third', value: 3 },
    { label: 'Fourth', value: 4 }
  ];

  constructor(
    private venueService: VenueService,
    private storageService: StorageService,
    private googleMapsService: GoogleMapsService,
    private notify: NotifyService,
    private fb: FormBuilder
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    this.loadVenues();
  }

  ngAfterViewInit(): void {
    // Autocomplete will be initialized when dialog opens
  }

  createForm(): void {
    this.venueForm = this.fb.group({
      venueName: ['', Validators.required],
      address: ['', Validators.required],
      city: [''],
      state: [''],
      country: [''],
      latitude: [null, Validators.required],
      longitude: [null, Validators.required],
      websiteUrl: [''],
      phoneNumber: [''],
      description: [''],
      isActive: [true],
      quizSchedules: this.fb.array([])
    });
  }

  get quizSchedules(): FormArray {
    return this.venueForm.get('quizSchedules') as FormArray;
  }

  createScheduleFormGroup(schedule?: VenueSchedule): FormGroup {
    return this.fb.group({
      type: [schedule?.type || 'weekly', Validators.required],
      dayOfWeek: [schedule?.dayOfWeek ?? null],
      weekOfMonth: [schedule?.weekOfMonth ?? null],
      customDates: [schedule?.customDates || []],
      startTime: [schedule?.startTime || '19:00'],
      endTime: [schedule?.endTime || '21:00'],
      isActive: [schedule?.isActive ?? true],
      notes: [schedule?.notes || '']
    });
  }

  addSchedule(): void {
    this.quizSchedules.push(this.createScheduleFormGroup());
  }

  removeSchedule(index: number): void {
    this.quizSchedules.removeAt(index);
  }

  onScheduleTypeChange(index: number): void {
    const schedule = this.quizSchedules.at(index);
    const type = schedule.get('type')?.value;

    // Reset conditional fields based on type
    if (type === 'custom') {
      schedule.get('dayOfWeek')?.setValue(null);
      schedule.get('weekOfMonth')?.setValue(null);
    } else if (type === 'monthly') {
      if (schedule.get('weekOfMonth')?.value === null) {
        schedule.get('weekOfMonth')?.setValue(1);
      }
    } else {
      schedule.get('weekOfMonth')?.setValue(null);
    }
  }

  loadVenues(): void {
    this.venueService.getAllVenues().subscribe(venues => {
      this.venues = venues.filter(v => !v.deletedAt);
      this.filteredVenues = this.venues;
    });
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredVenues = this.venues;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredVenues = this.venues.filter(v =>
      v.venueName.toLowerCase().includes(term) ||
      v.location.city.toLowerCase().includes(term) ||
      v.location.address.toLowerCase().includes(term)
    );
  }

  formatQuizDays(venue: Venue): string {
    if (!venue.quizSchedules || venue.quizSchedules.length === 0) return '-';

    return venue.quizSchedules
      .filter(s => s.isActive)
      .map(s => this.googleMapsService.formatSchedule(s))
      .join(', ');
  }

  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = () => this.imagePreview = reader.result as string;
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.imagePreview = null;
    this.selectedImageFile = undefined;
    if (this.imageInput) {
      this.imageInput.nativeElement.value = '';
    }
  }

  openNewVenueDialog(): void {
    this.selectedVenue = null;
    this.isEditing = false;
    this.venueForm.reset({ isActive: true });
    this.quizSchedules.clear();
    this.imagePreview = null;
    this.selectedImageFile = undefined;
    this.venueDialog = true;

    // Initialize autocomplete after dialog opens
    setTimeout(() => this.initializeAutocomplete(), 100);
  }

  editVenue(venue: Venue): void {
    this.selectedVenue = venue;
    this.isEditing = true;

    this.venueForm.patchValue({
      venueName: venue.venueName,
      address: venue.location.address,
      city: venue.location.city,
      state: venue.location.state,
      country: venue.location.country,
      latitude: venue.location.latitude,
      longitude: venue.location.longitude,
      websiteUrl: venue.websiteUrl,
      phoneNumber: venue.phoneNumber,
      description: venue.description,
      isActive: venue.isActive
    });

    this.imagePreview = venue.imageUrl || null;
    this.selectedImageFile = undefined;

    // Populate schedules
    this.quizSchedules.clear();
    venue.quizSchedules.forEach(schedule => {
      this.quizSchedules.push(this.createScheduleFormGroup(schedule));
    });

    this.venueDialog = true;

    // Initialize autocomplete after dialog opens
    setTimeout(() => this.initializeAutocomplete(), 100);
  }

  async initializeAutocomplete(): Promise<void> {
    if (!this.addressInput) return;

    // Load Google Maps script first
    try {
      await this.googleMapsService.loadGoogleMaps();
    } catch (error) {
      console.error('Failed to load Google Maps:', error);
      this.notify.error('Failed to load Google Maps. Check your API key.');
      return;
    }

    this.autocomplete = this.googleMapsService.initAutocomplete(this.addressInput.nativeElement);

    this.autocomplete.addListener('place_changed', () => {
      const place = this.autocomplete!.getPlace();
      if (place.geometry) {
        this.populateLocationFromPlace(place);
      }
    });
  }

  populateLocationFromPlace(place: google.maps.places.PlaceResult): void {
    try {
      const location = this.googleMapsService.parsePlace(place);

      this.venueForm.patchValue({
        address: location.address,
        city: location.city,
        state: location.state,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude
      });

      this.notify.success('Address geocoded successfully');
    } catch (error) {
      this.notify.error('Failed to parse address');
      console.error(error);
    }
  }

  async saveVenue(): Promise<void> {
    if (this.venueForm.invalid) {
      this.notify.error('Please fill in all required fields');
      return;
    }

    this.saving = true;
    try {
      const formValue = this.venueForm.value;

      let imageUrl = this.isEditing ? (this.selectedVenue?.imageUrl || '') : '';
      if (this.selectedImageFile) {
        const venueId = this.selectedVenue?.id || Date.now().toString();
        imageUrl = await this.storageService.uploadVenueImage(this.selectedImageFile, venueId);
      } else if (!this.imagePreview) {
        imageUrl = '';
      }

      const venueData: Partial<Venue> = {
        venueName: formValue.venueName,
        location: {
          address: formValue.address,
          city: formValue.city,
          state: formValue.state,
          country: formValue.country,
          latitude: formValue.latitude,
          longitude: formValue.longitude
        },
        websiteUrl: formValue.websiteUrl,
        phoneNumber: formValue.phoneNumber,
        description: formValue.description,
        imageUrl,
        isActive: formValue.isActive,
        quizSchedules: formValue.quizSchedules
      };

      if (this.isEditing && this.selectedVenue?.id) {
        await this.venueService.updateVenue(this.selectedVenue.id, venueData);
        this.notify.success('Venue updated successfully');
      } else {
        await this.venueService.createVenue(venueData);
        this.notify.success('Venue created successfully');
      }

      this.venueDialog = false;
      this.loadVenues();
    } catch (error) {
      this.notify.error('Failed to save venue');
      console.error(error);
    } finally {
      this.saving = false;
    }
  }

  async deleteVenue(venue: Venue): Promise<void> {
    if (!venue.id) return;

    if (confirm(`Are you sure you want to delete "${venue.venueName}"?`)) {
      this.saving = true;
      try {
        await this.venueService.deleteVenue(venue.id);
        this.notify.success('Venue deleted successfully');
        this.loadVenues();
      } catch (error) {
        this.notify.error('Failed to delete venue');
        console.error(error);
      } finally {
        this.saving = false;
      }
    }
  }

  closeDialog(): void {
    this.venueDialog = false;
  }
}
