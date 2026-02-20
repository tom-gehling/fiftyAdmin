import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, FormControl, AbstractControl, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';

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
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    DialogModule,
    CheckboxModule,
    FloatLabelModule,
    ProgressSpinnerModule,
    CardModule,
    SelectModule,
    TextareaModule,
    InputNumberModule,
    DatePickerModule
  ],
  template: `
    <!-- Loading Spinner -->
    <div *ngIf="saving" class="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div class="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
    </div>

    <p-card class="flex flex-col flex-1 p-4">
      <!-- Header Actions -->
      <div class="flex flex-col sm:flex-row justify-between items-start md:items-center mb-4 gap-2">
        <h2>Venues</h2>
        <div class="flex flex-col sm:flex-row gap-2 ml-auto">
          <p-iconfield class="flex-1 min-w-0 max-w-md">
            <p-inputicon styleClass="pi pi-search" />
            <input pInputText type="text" [(ngModel)]="searchTerm" (input)="onSearch()" placeholder="Search venues..." class="w-full" />
          </p-iconfield>
          <button pButton type="button" label="Add Venue" icon="pi pi-plus" (click)="openNewVenueDialog()"></button>
        </div>
      </div>

      <!-- Venues Table -->
      <div *ngIf="filteredVenues.length > 0; else emptyVenues" class="overflow-x-auto rounded-lg">
        <table class="w-full" style="border-collapse: separate; border-spacing: 0;">
          <thead>
            <tr style="background: rgba(255,255,255,0.06);">
              <th class="text-left p-3 cursor-pointer select-none" (click)="sortBy('venueName')">
                Venue Name <i class="pi" [ngClass]="getSortIcon('venueName')"></i>
              </th>
              <th class="text-left p-3 cursor-pointer select-none hidden md:table-cell" (click)="sortBy('state')">
                State <i class="pi" [ngClass]="getSortIcon('state')"></i>
              </th>
              <th class="text-left p-3 select-none hidden sm:table-cell">Quiz Days</th>
              <th class="text-center p-3 cursor-pointer select-none" (click)="sortBy('isActive')">
                Active <i class="pi" [ngClass]="getSortIcon('isActive')"></i>
              </th>
              <th class="p-3 text-right">
                <button
                  *ngIf="isSorted"
                  pButton
                  icon="pi pi-filter-slash"
                  class="p-button-text p-button-sm"
                  (click)="clearSort()"
                  title="Clear sorting"
                ></button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              *ngFor="let venue of filteredVenues"
              class="cursor-pointer transition-colors"
              [style.background]="selectedVenue?.id === venue.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'"
              style="border-bottom: 1px solid var(--fifty-neon-green);"
              [ngClass]="{ 'hover:bg-surface-100 dark:hover:bg-surface-600': selectedVenue?.id !== venue.id }"
              (click)="highlightVenue(venue)"
            >
              <td class="p-3 font-semibold">{{ venue.venueName }}</td>
              <td class="p-3 hidden md:table-cell">{{ venue.location.state }}</td>
              <td class="p-3 hidden sm:table-cell">{{ formatQuizDays(venue) }}</td>
              <td class="p-3 text-center">
                <i [class]="venue.isActive ? 'pi pi-check text-green-500' : 'pi pi-times text-red-500'"></i>
              </td>
              <td class="p-3 text-right">
                <div class="flex gap-2 justify-end">
                  <button pButton type="button" icon="pi pi-pencil" class="p-button-text p-button-sm" (click)="editVenue(venue); $event.stopPropagation()"></button>
                  <button pButton type="button" icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger" (click)="deleteVenue(venue); $event.stopPropagation()"></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #emptyVenues>
        <div class="text-center text-gray-500 py-4">No venues found</div>
      </ng-template>

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
                  <p-datepicker
                    id="startTime{{ i }}"
                    formControlName="startTime"
                    [timeOnly]="true"
                    hourFormat="12"
                    class="w-full"
                  ></p-datepicker>
                  <label for="startTime{{ i }}">Start Time</label>
                </p-floatlabel>

                <p-floatlabel variant="on">
                  <p-datepicker
                    id="endTime{{ i }}"
                    formControlName="endTime"
                    [timeOnly]="true"
                    hourFormat="12"
                    class="w-full"
                  ></p-datepicker>
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

              <!-- Exclusion Dates -->
              <div class="mt-3">
                <div class="flex justify-between items-center mb-2">
                  <label class="font-semibold text-sm">Excluded Dates</label>
                  <button pButton type="button" label="Add Excluded Date" icon="pi pi-calendar-times" class="p-button-sm p-button-outlined" (click)="addExclusionDate(i)"></button>
                </div>
                <div formArrayName="exclusionDates">
                  <div *ngFor="let dateCtrl of getExclusionDates(i).controls; let j = index" class="flex items-center gap-2 mb-2">
                    <p-datepicker
                      [formControlName]="j"
                      placeholder="Select date to exclude"
                      dateFormat="dd/mm/yy"
                      class="flex-1"
                    ></p-datepicker>
                    <button pButton type="button" icon="pi pi-times" class="p-button-text p-button-sm p-button-danger" (click)="removeExclusionDate(i, j)"></button>
                  </div>
                  <div *ngIf="getExclusionDates(i).length === 0" class="text-gray-500 text-sm italic">
                    No exclusion dates added.
                  </div>
                </div>
              </div>
            </div>

            <div *ngIf="quizSchedules.length === 0" class="text-gray-500 text-center p-4 border border-dashed rounded">
              No quiz schedules added. Click "Add Schedule" to add one.
            </div>
          </div>
        </form>

        <ng-template #footer>
          <p-button label="Cancel" [text]="true" severity="secondary" (click)="closeDialog()" [disabled]="saving" />
          <p-button label="Save" [outlined]="true" [severity]="saving || venueForm.invalid ? 'secondary' : 'success'" (click)="saveVenue()" [disabled]="saving || venueForm.invalid" />
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
  sortKey: 'venueName' | 'state' | 'isActive' = 'venueName';
  sortAsc = true;
  isSorted = false;

  venueForm!: FormGroup;
  autocomplete?: google.maps.places.Autocomplete;
  imagePreview: string | null = null;
  selectedImageFile?: File;

  scheduleTypes = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Fortnightly', value: 'biweekly' },
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
    { label: 'Fourth', value: 4 },
    { label: 'Last', value: -1 }
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
    const exclusionDates = this.fb.array(
      (schedule?.exclusionDates || []).map(d => {
        const date = (d as any)?.toDate?.() ?? (d instanceof Date ? d : new Date(d as any));
        return this.fb.control(date);
      })
    );
    return this.fb.group({
      type: [schedule?.type || 'weekly', Validators.required],
      dayOfWeek: [schedule?.dayOfWeek ?? null],
      weekOfMonth: [schedule?.weekOfMonth ?? null],
      customDates: [schedule?.customDates || []],
      startTime: [this.timeStringToDate(schedule?.startTime || '19:00')],
      endTime: [this.timeStringToDate(schedule?.endTime || '21:00')],
      isActive: [schedule?.isActive ?? true],
      notes: [schedule?.notes || ''],
      exclusionDates
    });
  }

  getExclusionDates(scheduleIndex: number): FormArray {
    return this.quizSchedules.at(scheduleIndex).get('exclusionDates') as FormArray;
  }

  addExclusionDate(scheduleIndex: number): void {
    this.getExclusionDates(scheduleIndex).push(this.fb.control(null));
  }

  removeExclusionDate(scheduleIndex: number, dateIndex: number): void {
    this.getExclusionDates(scheduleIndex).removeAt(dateIndex);
  }

  asFormControl(ctrl: AbstractControl): FormControl {
    return ctrl as FormControl;
  }

  private timeStringToDate(timeStr: string): Date | null {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  private dateToTimeString(date: Date | null): string {
    if (!date) return '';
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
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

  highlightVenue(venue: Venue): void {
    this.selectedVenue = venue;
  }

  sortBy(key: 'venueName' | 'state' | 'isActive'): void {
    if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortKey = key;
      this.sortAsc = true;
    }
    this.isSorted = true;
    this.onSearch();
  }

  clearSort(): void {
    this.sortKey = 'venueName';
    this.sortAsc = true;
    this.isSorted = false;
    this.onSearch();
  }

  getSortIcon(key: 'venueName' | 'state' | 'isActive'): string {
    if (this.sortKey !== key) return 'pi-sort-alt';
    return this.sortAsc ? 'pi-sort-amount-up' : 'pi-sort-amount-down';
  }

  private applySorting(venues: Venue[]): Venue[] {
    const dir = this.sortAsc ? 1 : -1;
    return [...venues].sort((a, b) => {
      switch (this.sortKey) {
        case 'venueName': return dir * a.venueName.localeCompare(b.venueName);
        case 'state': return dir * (a.location.state || '').localeCompare(b.location.state || '');
        case 'isActive': return dir * (Number(b.isActive) - Number(a.isActive));
        default: return 0;
      }
    });
  }

  loadVenues(): void {
    this.venueService.getAllVenues().subscribe(venues => {
      this.venues = venues.filter(v => !v.deletedAt);
      this.filteredVenues = this.applySorting(this.venues);
    });
  }

  onSearch(): void {
    const term = this.searchTerm.toLowerCase().trim();
    const filtered = term
      ? this.venues.filter(v =>
          v.venueName.toLowerCase().includes(term) ||
          (v.location.state || '').toLowerCase().includes(term)
        )
      : this.venues;
    this.filteredVenues = this.applySorting(filtered);
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
        quizSchedules: formValue.quizSchedules.map((s: any) => ({
          ...s,
          startTime: this.dateToTimeString(s.startTime),
          endTime: this.dateToTimeString(s.endTime),
          exclusionDates: (s.exclusionDates || []).filter((d: any) => d != null)
        }))
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
