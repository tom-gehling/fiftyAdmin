import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DrawerModule } from 'primeng/drawer';

import { VenueService } from '@/shared/services/venue.service';
import { GoogleMapsService } from '@/shared/services/google-maps.service';
import { Venue } from '@/shared/models/venue.model';
import { VenueCardComponent } from './components/venue-card';

@Component({
  selector: 'app-find-a-venue',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    InputTextModule,
    SelectModule,
    ButtonModule,
    CardModule,
    DrawerModule,
    VenueCardComponent
  ],
  template: `
    <div class="venue-finder min-h-screen bg-surface-0 dark:bg-surface-900">
      <!-- Header -->
      <div class="bg-gradient-to-r from-[#677c73] to-[#4cfbab] text-white p-6">
        <div class="container mx-auto">
          <h1 class="text-3xl md:text-4xl font-bold mb-2">Find a Quiz Venue</h1>
          <p class="text-lg opacity-90">Discover quiz nights near you</p>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="bg-white dark:bg-surface-800 shadow-md p-4">
        <div class="container mx-auto flex flex-col md:flex-row gap-3">
          <span class="p-input-icon-left flex-1">
            <i class="pi pi-search"></i>
            <input
              pInputText
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
              placeholder="Search venues or locations..."
              class="w-full"
            />
          </span>

          <p-select
            [(ngModel)]="selectedDay"
            [options]="dayOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Filter by quiz day"
            (onChange)="onFilterChange()"
            [showClear]="true"
            class="w-full md:w-64"
          ></p-select>

          <button
            pButton
            type="button"
            icon="pi pi-list"
            label="Show List"
            (click)="sidebarVisible = true"
            class="md:hidden"
          ></button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="relative h-[calc(100vh-240px)] md:h-[calc(100vh-200px)]">
        <!-- Google Map -->
        <div #mapElement class="absolute inset-0 w-full h-full"></div>

        <!-- Desktop Sidebar -->
        <div class="hidden md:block absolute top-0 right-0 h-full w-96 bg-white dark:bg-surface-800 shadow-lg overflow-hidden z-10">
          <div class="h-full flex flex-col">
            <!-- Sidebar Header -->
            <div class="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 class="text-xl font-bold">
                {{ selectedVenue ? 'Venue Details' : 'Venues (' + filteredVenues.length + ')' }}
              </h2>
            </div>

            <!-- Sidebar Content -->
            <div class="flex-1 overflow-y-auto p-4">
              <div *ngIf="selectedVenue; else venueList">
                <button
                  pButton
                  type="button"
                  icon="pi pi-arrow-left"
                  label="Back to list"
                  class="p-button-text mb-3"
                  (click)="selectedVenue = null"
                ></button>
                <app-venue-card [venue]="selectedVenue"></app-venue-card>
              </div>

              <ng-template #venueList>
                <div *ngIf="filteredVenues.length === 0" class="text-center text-gray-500 py-8">
                  No venues found
                </div>

                <div *ngFor="let venue of filteredVenues" class="mb-3">
                  <div
                    class="p-4 border rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-700 transition-colors"
                    [class.bg-green-50]="selectedVenue?.id === venue.id"
                    (click)="selectVenue(venue)"
                  >
                    <h3 class="font-bold text-lg mb-1">{{ venue.venueName }}</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <i class="pi pi-map-marker mr-1"></i>
                      {{ venue.location.city }}
                    </p>
                    <div *ngIf="venue.quizSchedules.length > 0" class="text-sm text-gray-700 dark:text-gray-300">
                      <i class="pi pi-calendar mr-1"></i>
                      {{ formatFirstSchedule(venue) }}
                    </div>
                  </div>
                </div>
              </ng-template>
            </div>
          </div>
        </div>

        <!-- Mobile Drawer -->
        <p-drawer [(visible)]="sidebarVisible" position="right" [style]="{ width: '90vw', maxWidth: '400px' }" header="{{ selectedVenue ? 'Venue Details' : 'Venues (' + filteredVenues.length + ')' }}">

          <div *ngIf="selectedVenue; else mobileVenueList">
            <button
              pButton
              type="button"
              icon="pi pi-arrow-left"
              label="Back to list"
              class="p-button-text mb-3"
              (click)="selectedVenue = null"
            ></button>
            <app-venue-card [venue]="selectedVenue"></app-venue-card>
          </div>

          <ng-template #mobileVenueList>
            <div *ngIf="filteredVenues.length === 0" class="text-center text-gray-500 py-8">
              No venues found
            </div>

            <div *ngFor="let venue of filteredVenues" class="mb-3">
              <div
                class="p-4 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                [class.bg-green-50]="selectedVenue?.id === venue.id"
                (click)="selectVenue(venue)"
              >
                <h3 class="font-bold text-lg mb-1">{{ venue.venueName }}</h3>
                <p class="text-sm text-gray-600 mb-2">
                  <i class="pi pi-map-marker mr-1"></i>
                  {{ venue.location.city }}
                </p>
                <div *ngIf="venue.quizSchedules.length > 0" class="text-sm text-gray-700">
                  <i class="pi pi-calendar mr-1"></i>
                  {{ formatFirstSchedule(venue) }}
                </div>
              </div>
            </div>
          </ng-template>
        </p-drawer>

        <!-- Loading State -->
        <div *ngIf="loading" class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-20">
          <div class="text-center">
            <div class="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p class="text-gray-600">Loading venues...</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .venue-finder {
      width: 100%;
    }

    :host ::ng-deep .p-sidebar-content {
      padding: 0;
    }

    @media (max-width: 768px) {
      .hidden.md\\:block {
        display: none !important;
      }
    }
  `]
})
export class FindAVenuePage implements OnInit, AfterViewInit {
  @ViewChild('mapElement') mapElement!: ElementRef;

  venues: Venue[] = [];
  filteredVenues: Venue[] = [];
  selectedVenue: Venue | null = null;
  sidebarVisible = false;
  loading = true;

  map!: google.maps.Map;
  markers: google.maps.Marker[] = [];
  infoWindow!: google.maps.InfoWindow;

  searchQuery = '';
  selectedDay: number | null = null;

  dayOptions = [
    { label: 'Sunday', value: 0 },
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 }
  ];

  constructor(
    private venueService: VenueService,
    private googleMapsService: GoogleMapsService
  ) {}

  ngOnInit(): void {
    this.loadVenues();
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initMap();
  }

  async initMap(): Promise<void> {
    if (!this.mapElement) return;

    // Load Google Maps script first
    try {
      await this.googleMapsService.loadGoogleMaps();
    } catch (error) {
      console.error('Failed to load Google Maps:', error);
      return;
    }

    // Default center - Melbourne, Australia (can be adjusted based on user location)
    this.map = new google.maps.Map(this.mapElement.nativeElement, {
      center: { lat: -37.8136, lng: 144.9631 },
      zoom: 12,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    this.infoWindow = new google.maps.InfoWindow();
  }

  loadVenues(): void {
    this.loading = true;
    this.venueService.getActiveVenues().subscribe({
      next: (venues) => {
        this.venues = venues;
        this.filteredVenues = venues;
        this.addMarkers();
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load venues', error);
        this.loading = false;
      }
    });
  }

  addMarkers(): void {
    // Clear existing markers
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];

    if (!this.map) return;

    // Add new markers
    this.filteredVenues.forEach(venue => {
      const marker = new google.maps.Marker({
        position: {
          lat: venue.location.latitude,
          lng: venue.location.longitude
        },
        map: this.map,
        title: venue.venueName,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
              <path fill="#677c73" d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z"/>
              <circle cx="16" cy="16" r="6" fill="white"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 40),
          anchor: new google.maps.Point(16, 40)
        }
      });

      marker.addListener('click', () => {
        this.selectVenue(venue);
        this.panToMarker(venue);
      });

      this.markers.push(marker);
    });

    // Fit map bounds to markers
    if (this.markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      this.markers.forEach(m => {
        const position = m.getPosition();
        if (position) bounds.extend(position);
      });
      this.map.fitBounds(bounds);

      // Don't zoom in too much for a single venue
      google.maps.event.addListenerOnce(this.map, 'bounds_changed', () => {
        if (this.map.getZoom()! > 15) {
          this.map.setZoom(15);
        }
      });
    }
  }

  selectVenue(venue: Venue): void {
    this.selectedVenue = venue;

    // On mobile, show the sidebar
    if (window.innerWidth < 768) {
      this.sidebarVisible = true;
    }
  }

  panToMarker(venue: Venue): void {
    if (!this.map) return;

    this.map.panTo({
      lat: venue.location.latitude,
      lng: venue.location.longitude
    });
    this.map.setZoom(15);
  }

  onSearchChange(): void {
    this.filterVenues();
  }

  onFilterChange(): void {
    this.filterVenues();
  }

  filterVenues(): void {
    this.filteredVenues = this.venues.filter(venue => {
      // Text search
      const matchesSearch = !this.searchQuery ||
        venue.venueName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        venue.location.city.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        venue.location.address.toLowerCase().includes(this.searchQuery.toLowerCase());

      // Day filter
      const matchesDay = this.selectedDay === null ||
        venue.quizSchedules.some(s => s.dayOfWeek === this.selectedDay && s.isActive);

      return matchesSearch && matchesDay;
    });

    this.addMarkers();

    // Clear selected venue if it's no longer in filtered results
    if (this.selectedVenue && !this.filteredVenues.find(v => v.id === this.selectedVenue!.id)) {
      this.selectedVenue = null;
    }
  }

  formatFirstSchedule(venue: Venue): string {
    const activeSchedules = venue.quizSchedules.filter(s => s.isActive);
    if (activeSchedules.length === 0) return 'No active quiz nights';

    return this.googleMapsService.formatSchedule(activeSchedules[0]);
  }
}
