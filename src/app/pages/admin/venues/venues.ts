import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { VenueService } from '@/shared/services/venues.service';
import { Venue } from '@/shared/models/venues.model';
import { VenueModalComponent } from './venuesModal';
import { debounceTime } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-venues',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    VenueModalComponent
  ],
  template: `
<p-card>
  <div class="flex justify-between items-center mb-4">
    <h2>All Venues</h2>
    <button pButton label="Create" icon="pi pi-plus" class="p-button-primary" (click)="openModal()"></button>
  </div>

  <input pInputText type="text" placeholder="Search venues..." class="w-full mb-4"
         [(ngModel)]="searchText" (ngModelChange)="onSearchChange($event)" />

  <div *ngFor="let venue of filteredVenues" class="p-card mb-2 flex justify-between items-center cursor-pointer"
       style="border: 1px solid var(--fifty-neon-green); padding: 10px;"
       (click)="highlightRow(venue)">
    <div>
      <div class="font-semibold">{{ venue.name }}</div>
      <div class="text-sm">{{ venue.city }}, {{ venue.address }}</div>
      <div class="text-sm">Quiz Time: {{ venue.quizTime }}</div>
      <div class="text-sm">Commencing: {{ venue.commencingDate | date }}</div>
      <div class="text-sm">Quizzing Type: {{ venue.quizzingType }}</div>
    </div>

    <div class="flex gap-2">
      <button pButton icon="pi pi-pencil" class="p-button-text"
              (click)="openModal(venue); $event.stopPropagation()"></button>
      <button pButton icon="pi pi-trash" class="p-button-text p-button-danger"
              (click)="deleteVenue(venue); $event.stopPropagation()"></button>
    </div>
  </div>
</p-card>

<!-- Venue modal -->
<app-venue-modal #venueModal></app-venue-modal>
  `
})
export class VenuesComponent implements OnInit {
  private venueService = inject(VenueService);

  venues: Venue[] = [];
  filteredVenues: Venue[] = [];
  searchText = '';
  searchSubject = new Subject<string>();
  selectedVenue: Venue | null = null;

  @ViewChild('venueModal') venueModal!: VenueModalComponent;

  ngOnInit() {
    // Subscribe to venues from service
    this.venueService.getVenues().subscribe(data => {
      this.venues = data;
      this.applyFilter();
    });

    // Debounced search for better performance
    this.searchSubject.pipe(debounceTime(200)).subscribe(() => {
      this.applyFilter();
    });
  }

  onSearchChange(value: string) {
    this.searchSubject.next(value);
  }

  private applyFilter() {
    const s = this.searchText?.toLowerCase() || '';
    this.filteredVenues = this.venues.filter(v =>
      v.name.toLowerCase().includes(s) ||
      v.city?.toLowerCase().includes(s) ||
      v.address?.toLowerCase().includes(s)
    );
  }

  highlightRow(venue: Venue) {
    this.selectedVenue = venue;
  }

  openModal(venue?: Venue) {
    this.venueModal.show(venue); // open modal for create/edit
  }

  async deleteVenue(venue: Venue) {
    if (confirm(`Are you sure you want to delete venue "${venue.name}"?`)) {
      await this.venueService.deleteVenue(venue.id!);
    }
  }
}
