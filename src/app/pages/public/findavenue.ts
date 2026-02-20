import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { PanelModule } from 'primeng/panel';
import { DrawerModule } from 'primeng/drawer';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { VenueService } from '@/shared/services/venue.service';
import { GoogleMapsService } from '@/shared/services/google-maps.service';
import { Venue, VenueSchedule } from '@/shared/models/venue.model';
import { PublicTopbarComponent } from './components/public-topbar';

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
    PanelModule,
    DrawerModule,
    IconFieldModule,
    InputIconModule,
    PublicTopbarComponent
  ],
  template: `
    <app-public-topbar />
    <div class="venue-finder">
      <!-- Header -->
      <div class="venue-header">
        <div class="container mx-auto">
          <h1 class="text-3xl md:text-4xl font-bold mb-1">Find a Quiz Night</h1>
          <p class="text-lg opacity-80">Get your team to a quiz night near you</p>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="filter-bar">
        <div class="container mx-auto flex flex-col md:flex-row gap-3">
          <p-iconfield class="flex-1">
            <p-inputicon styleClass="pi pi-search" />
            <input
              pInputText
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
              placeholder="Search venues or locations..."
              class="w-full"
            />
          </p-iconfield>

          <p-select
            [(ngModel)]="selectedState"
            [options]="stateOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Filter by state"
            (onChange)="onFilterChange()"
            [showClear]="true"
            class="w-full md:w-48"
          ></p-select>

          <p-select
            [(ngModel)]="selectedDay"
            [options]="dayOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Filter by quiz day"
            (onChange)="onFilterChange()"
            [showClear]="true"
            class="w-full md:w-48"
          ></p-select>

          <button
            pButton
            type="button"
            icon="pi pi-list"
            label="Show List"
            (click)="sidebarVisible = true"
            class="show-list-btn md:hidden"
          ></button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="map-container">
        <!-- Google Map -->
        <div #mapElement class="flex-1 h-full"></div>

        <!-- Desktop Sidebar -->
        <div class="venue-sidebar hidden md:block">
          <div class="h-full flex flex-col">
            <!-- Sidebar Header -->
            <div class="sidebar-header">
              <h2 class="text-xl font-bold">
                Venues ({{ filteredVenues.length }})
              </h2>
            </div>

            <!-- Sidebar Content -->
            <div class="flex-1 overflow-y-auto p-4">
              <div *ngIf="filteredVenues.length === 0" class="empty-state">
                No venues found
              </div>

              <div class="venue-panels">
                <p-panel
                  *ngFor="let venue of filteredVenues"
                  [toggleable]="true"
                  [collapsed]="venueCollapsed[venue.id!] !== false"
                  (collapsedChange)="onPanelToggle(venue, $event)"
                  styleClass="venue-panel">
                  <ng-template #header>
                    <div class="venue-panel-header-content">
                      <div class="venue-list-info">
                        <h3 class="venue-list-name">{{ venue.venueName }}</h3>
                        <p class="venue-list-location">
                          <i class="pi pi-map-marker mr-1"></i>
                          {{ venue.location.city }}
                        </p>
                        <div *ngIf="getNextQuizDateForVenue(venue) as nextDate" class="venue-list-next-quiz">
                          <i class="pi pi-clock mr-1"></i>
                          Next Quiz: {{ nextDate | date:'EEE, MMM d' }}
                        </div>
                      </div>
                      <img
                        *ngIf="venue.imageUrl"
                        [src]="venue.imageUrl"
                        [alt]="venue.venueName"
                        class="venue-list-img"
                      />
                    </div>
                  </ng-template>
                  <div class="venue-detail">
                    <!-- Address -->
                    <div class="venue-detail-row">
                      <i class="pi pi-map-marker venue-detail-icon"></i>
                      <div>
                        <h4 class="venue-detail-label">Address</h4>
                        <p class="venue-detail-value">
                          {{ venue.location.address }}<br>
                          {{ venue.location.city }}<span *ngIf="venue.location.state">, {{ venue.location.state }}</span>
                          <span *ngIf="venue.location.postalCode"> {{ venue.location.postalCode }}</span>
                        </p>
                      </div>
                    </div>

                    <!-- Phone -->
                    <div *ngIf="venue.phoneNumber" class="venue-detail-row">
                      <i class="pi pi-phone venue-detail-icon"></i>
                      <div>
                        <h4 class="venue-detail-label">Phone</h4>
                        <a [href]="'tel:' + venue.phoneNumber" class="venue-detail-link">{{ venue.phoneNumber }}</a>
                      </div>
                    </div>

                    <!-- Website -->
                    <div *ngIf="venue.websiteUrl" class="venue-detail-row">
                      <i class="pi pi-globe venue-detail-icon"></i>
                      <div>
                        <h4 class="venue-detail-label">Website</h4>
                        <a [href]="venue.websiteUrl" target="_blank" class="venue-detail-link">{{ venue.websiteUrl }}</a>
                      </div>
                    </div>

                    <!-- Quiz Schedules -->
                    <div *ngIf="getActiveSchedules(venue).length > 0" class="venue-detail-row venue-detail-row--schedules">
                      <i class="pi pi-calendar venue-detail-icon"></i>
                      <div class="flex-1">
                        <h4 class="venue-detail-label">Quiz Nights</h4>
                        <div *ngFor="let schedule of getActiveSchedules(venue)" class="venue-detail-schedule">
                          <p class="venue-detail-value">{{ formatSchedule(schedule) }}</p>
                          <p *ngIf="schedule.notes" class="venue-detail-note">{{ schedule.notes }}</p>
                        </div>
                      </div>
                    </div>

                    <!-- Directions link -->
                    <a [href]="getDirectionsUrl(venue)" target="_blank" class="venue-detail-directions">
                      <i class="pi pi-directions mr-2"></i> Get Directions
                    </a>
                  </div>
                </p-panel>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile Drawer -->
        <p-drawer [(visible)]="sidebarVisible" position="right" [style]="{ width: '90vw', maxWidth: '400px' }" header="Venues ({{ filteredVenues.length }})" styleClass="venue-drawer">

          <div *ngIf="filteredVenues.length === 0" class="empty-state">
            No venues found
          </div>

          <div class="venue-panels">
            <p-panel
              *ngFor="let venue of filteredVenues"
              [toggleable]="true"
              [collapsed]="venueCollapsed[venue.id!] !== false"
              (collapsedChange)="onPanelToggle(venue, $event)"
              styleClass="venue-panel">
              <ng-template #header>
                <div class="venue-panel-header-content">
                  <div class="venue-list-info">
                    <h3 class="venue-list-name">{{ venue.venueName }}</h3>
                    <p class="venue-list-location">
                      <i class="pi pi-map-marker mr-1"></i>
                      {{ venue.location.city }}
                    </p>
                    <div *ngIf="venue.quizSchedules.length > 0" class="venue-list-schedule">
                      <i class="pi pi-calendar mr-1"></i>
                      {{ formatFirstSchedule(venue) }}
                    </div>
                  </div>
                  <img
                    *ngIf="venue.imageUrl"
                    [src]="venue.imageUrl"
                    [alt]="venue.venueName"
                    class="venue-list-img"
                  />
                </div>
              </ng-template>
              <div class="venue-detail">
                <div class="venue-detail-row">
                  <i class="pi pi-map-marker venue-detail-icon"></i>
                  <div>
                    <h4 class="venue-detail-label">Address</h4>
                    <p class="venue-detail-value">
                      {{ venue.location.address }}<br>
                      {{ venue.location.city }}<span *ngIf="venue.location.state">, {{ venue.location.state }}</span>
                      <span *ngIf="venue.location.postalCode"> {{ venue.location.postalCode }}</span>
                    </p>
                  </div>
                </div>
                <div *ngIf="venue.phoneNumber" class="venue-detail-row">
                  <i class="pi pi-phone venue-detail-icon"></i>
                  <div>
                    <h4 class="venue-detail-label">Phone</h4>
                    <a [href]="'tel:' + venue.phoneNumber" class="venue-detail-link">{{ venue.phoneNumber }}</a>
                  </div>
                </div>
                <div *ngIf="venue.websiteUrl" class="venue-detail-row">
                  <i class="pi pi-globe venue-detail-icon"></i>
                  <div>
                    <h4 class="venue-detail-label">Website</h4>
                    <a [href]="venue.websiteUrl" target="_blank" class="venue-detail-link">{{ venue.websiteUrl }}</a>
                  </div>
                </div>
                <div *ngIf="getActiveSchedules(venue).length > 0" class="venue-detail-row venue-detail-row--schedules">
                  <i class="pi pi-calendar venue-detail-icon"></i>
                  <div class="flex-1">
                    <h4 class="venue-detail-label">Quiz Nights</h4>
                    <div *ngFor="let schedule of getActiveSchedules(venue)" class="venue-detail-schedule">
                      <p class="venue-detail-value">{{ formatSchedule(schedule) }}</p>
                      <p *ngIf="schedule.notes" class="venue-detail-note">{{ schedule.notes }}</p>
                    </div>
                  </div>
                </div>
                <a [href]="getDirectionsUrl(venue)" target="_blank" class="venue-detail-directions">
                  <i class="pi pi-directions mr-2"></i> Get Directions
                </a>
              </div>
            </p-panel>
          </div>
        </p-drawer>

        <!-- Loading State -->
        <div *ngIf="loading" class="loading-overlay">
          <div class="text-center">
            <div class="loading-spinner"></div>
            <p class="loading-text">Loading venues...</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--fifty-green);
    }

    h1, h2 {
      background-color: var(--fifty-green);
      color: var(--fifty-pink);
    }

    .venue-finder {
      width: 100%;
      min-height: 100vh;
      background-color: var(--fifty-green);
      color: var(--fifty-pink);
    }

    /* Header */
    .venue-header {
      background: var(--fifty-green);
      color: var(--fifty-pink);
      padding: 1.5rem;
      padding-top: 4rem;
      border-bottom: 2px solid #4cfbab;
    }

    /* Filter bar */
    .filter-bar {
      background: rgba(0, 0, 0, 0.2);
      padding: 1rem;
    }

    :host ::ng-deep .filter-bar .p-inputtext {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(76, 251, 171, 0.4);
      color: var(--fifty-pink);
    }

    :host ::ng-deep .filter-bar .p-inputtext::placeholder {
      color: rgba(251, 226, 223, 0.5);
    }

    :host ::ng-deep .filter-bar .p-inputtext:focus {
      border-color: #4cfbab;
      box-shadow: 0 0 0 2px rgba(76, 251, 171, 0.2);
    }

    :host ::ng-deep .filter-bar .p-select {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(76, 251, 171, 0.4);
      color: var(--fifty-pink);
    }

    :host ::ng-deep .filter-bar .p-select .p-select-label {
      color: var(--fifty-pink);
    }

    :host ::ng-deep .filter-bar .p-select .p-select-label.p-placeholder {
      color: rgba(251, 226, 223, 0.5);
    }

    :host ::ng-deep .filter-bar .p-select:hover,
    :host ::ng-deep .filter-bar .p-select.p-focus {
      border-color: #4cfbab;
    }

    :host ::ng-deep .filter-bar .p-inputicon {
      color: #4cfbab;
    }

    .show-list-btn {
      background: transparent !important;
      border: 2px solid #4cfbab !important;
      color: #4cfbab !important;
    }

    .show-list-btn:hover {
      background: rgba(76, 251, 171, 0.15) !important;
    }

    /* Map container */
    .map-container {
      position: relative;
      display: flex;
      flex-direction: row;
      height: calc(100vh - 160px);
    }

    @media (max-width: 768px) {
      .map-container {
        height: calc(100vh - 200px);
      }
    }

    /* Sidebar */
    .venue-sidebar {
      width: 24rem;
      flex-shrink: 0;
      height: 100%;
      background: var(--fifty-green);
      box-shadow: -4px 0 15px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      z-index: 10;
    }

    .sidebar-header {
      padding: 1rem;
      border-bottom: 2px solid #4cfbab;
      color: var(--fifty-pink);
    }

    /* Venue panels container */
    .venue-panels {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    /* Panel header content */
    .venue-panel-header-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      min-width: 0;
    }

    .venue-list-info {
      flex: 1;
      min-width: 0;
    }

    .venue-list-img {
      width: 60px;
      height: 60px;
      border-radius: 6px;
      object-fit: cover;
      flex-shrink: 0;
      border: 1px solid rgba(76, 251, 171, 0.3);
    }

    .venue-list-name {
      font-weight: bold;
      font-size: 1.1rem;
      margin-bottom: 0.25rem;
      color: var(--fifty-pink);
    }

    .venue-list-location {
      font-size: 1rem;
      font-weight: 600;
      color: rgba(251, 226, 223, 0.7);
      margin-bottom: 0.5rem;
    }

    .venue-list-location .pi {
      color: #4cfbab;
    }

    .venue-list-schedule {
      font-size: 0.875rem;
      color: rgba(251, 226, 223, 0.8);
    }

    .venue-list-next-quiz {
      font-size: 1rem;
      color: #fbe2dfcc;
      font-weight: 600;
      margin-bottom: 0.2rem;
    }

    .venue-list-next-quiz .pi {
      color: #4cfbab;
    }

    .venue-list-schedule .pi {
      color: #4cfbab;
    }

    :host ::ng-deep .p-panel {
      display: block;
      border-radius: var(--p-panel-border-radius);
      color: var(--p-panel-color);
    }

    .p-button-text.p-button-secondary {
      background: transparent;
      border-color: transparent;
      color: var(--p-panel-color);
    }

    /* Venue panel theming */
    :host ::ng-deep .venue-panel {
      margin: 0;
    }

    :host ::ng-deep .venue-panel .p-panel-header,
    :host ::ng-deep .venue-panel button.p-panel-header,
    :host ::ng-deep .venue-panel .p-panel-header:hover,
    :host ::ng-deep .venue-panel button.p-panel-header:hover,
    :host ::ng-deep .venue-panel .p-panel-header:focus,
    :host ::ng-deep .venue-panel button.p-panel-header:focus,
    :host ::ng-deep .venue-panel .p-panel-header:active,
    :host ::ng-deep .venue-panel button.p-panel-header:active {
      background: var(--fifty-green) !important;
      border: 1px solid #4cfbab !important;
      border-radius: 8px !important;
      color: var(--fifty-pink) !important;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    :host ::ng-deep .venue-panel .p-panel-header:hover,
    :host ::ng-deep .venue-panel button.p-panel-header:hover {
      background: rgba(76, 251, 171, 0.08) !important;
    }

    :host ::ng-deep .venue-panel.p-panel-expanded .p-panel-header,
    :host ::ng-deep .venue-panel.p-panel-expanded button.p-panel-header,
    :host ::ng-deep .venue-panel.p-panel-expanded .p-panel-header:hover,
    :host ::ng-deep .venue-panel.p-panel-expanded button.p-panel-header:hover,
    :host ::ng-deep .venue-panel.p-panel-expanded .p-panel-header:focus,
    :host ::ng-deep .venue-panel.p-panel-expanded button.p-panel-header:focus {
      border-bottom-left-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
    }

    :host ::ng-deep .venue-panel .p-panel-content {
      background: var(--fifty-green) !important;
      border: 1px solid #4cfbab !important;
      border-top: none !important;
      border-bottom-left-radius: 8px !important;
      border-bottom-right-radius: 8px !important;
      padding: 0.75rem;
    }

    :host ::ng-deep .venue-panel .p-panel-header-icon,
    :host ::ng-deep .venue-panel .p-panel-header-icon:hover,
    :host ::ng-deep .venue-panel .p-panel-header-icon:focus {
      color: #4cfbab !important;
      background: transparent !important;
    }

    :host ::ng-deep .venue-panel .p-panel-header-icon:hover {
      background: rgba(76, 251, 171, 0.15) !important;
    }

    /* Venue detail rows inside panel */
    .venue-detail {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .venue-detail-row {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
    }

    .venue-detail-icon {
      color: #4cfbab;
      font-size: 0.85rem;
      margin-top: 0.15rem;
      flex-shrink: 0;
    }

    .venue-detail-label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #4cfbab;
      margin-bottom: 0.1rem;
    }

    .venue-detail-value {
      font-size: 0.85rem;
      color: var(--fifty-pink);
      line-height: 1.4;
    }

    .venue-detail-link {
      font-size: 0.85rem;
      color: var(--fifty-pink);
      text-decoration: underline;
      text-underline-offset: 2px;
      word-break: break-all;
    }

    .venue-detail-link:hover {
      color: #4cfbab;
    }

    .venue-detail-schedule {
      padding: 0.4rem 0;
    }

    .venue-detail-schedule + .venue-detail-schedule {
      border-top: 1px solid rgba(76, 251, 171, 0.2);
    }

    .venue-detail-note {
      font-size: 0.75rem;
      color: rgba(251, 226, 223, 0.6);
      font-style: italic;
      margin-top: 0.15rem;
    }

    .venue-detail-directions {
      display: inline-flex;
      align-items: center;
      margin-top: 0.25rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid #4cfbab;
      border-radius: 6px;
      color: #4cfbab;
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.2s ease;
    }

    .venue-detail-directions:hover {
      background: rgba(76, 251, 171, 0.1);
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      color: rgba(251, 226, 223, 0.5);
      padding: 2rem 0;
    }

    /* Loading */
    .loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(103, 124, 115, 0.85);
      z-index: 20;
    }

    .loading-spinner {
      width: 4rem;
      height: 4rem;
      border: 4px solid rgba(251, 226, 223, 0.2);
      border-top: 4px solid #4cfbab;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-text {
      color: var(--fifty-pink);
    }

    /* Mobile drawer styling */
    :host ::ng-deep .venue-drawer .p-drawer-content {
      background: var(--fifty-green);
      color: var(--fifty-pink);
    }

    :host ::ng-deep .venue-drawer .p-drawer-header {
      background: var(--fifty-green);
      color: var(--fifty-pink);
      border-bottom: 2px solid #4cfbab;
    }

    :host ::ng-deep .venue-drawer .p-drawer-close-button {
      color: #4cfbab;
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
  selectedState: string | null = null;
  stateOptions: { label: string; value: string }[] = [];

  venueCollapsed: Record<string, boolean> = {};

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
        this.buildStateOptions();
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
          url: 'assets/logos/twf.png',
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20)
        }
      });

      marker.addListener('click', () => {
        const nextQuiz = this.formatFirstSchedule(venue);
        this.infoWindow.setContent(`
          <div style="font-family: sans-serif; padding: 4px; min-width: 160px;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${venue.venueName}</div>
            <div style="font-size: 12px; color: #555;">${venue.location.city}${venue.location.state ? ', ' + venue.location.state : ''}</div>
            <div style="font-size: 12px; color: #333; margin-top: 4px;">
              <strong>Next Quiz:</strong> ${nextQuiz}
            </div>
          </div>
        `);
        this.infoWindow.open(this.map, marker);
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
    this.venueCollapsed[venue.id!] = false;

    // On mobile, show the sidebar
    if (window.innerWidth < 768) {
      this.sidebarVisible = true;
    }
  }

  onPanelToggle(venue: Venue, collapsed: boolean): void {
    this.venueCollapsed[venue.id!] = collapsed;
    if (!collapsed) {
      this.selectedVenue = venue;
      this.panToMarker(venue);
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

  buildStateOptions(): void {
    const states = new Set<string>();
    this.venues.forEach(v => {
      if (v.location.state) states.add(v.location.state);
    });
    this.stateOptions = Array.from(states).sort().map(s => ({ label: s, value: s }));
  }

  filterVenues(): void {
    this.filteredVenues = this.venues.filter(venue => {
      // Text search
      const matchesSearch = !this.searchQuery ||
        venue.venueName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        venue.location.city.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        venue.location.address.toLowerCase().includes(this.searchQuery.toLowerCase());

      // State filter
      const matchesState = this.selectedState === null ||
        venue.location.state === this.selectedState;

      // Day filter
      const matchesDay = this.selectedDay === null ||
        venue.quizSchedules.some(s => s.dayOfWeek === this.selectedDay && s.isActive);

      return matchesSearch && matchesState && matchesDay;
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

  getNextQuizDateForVenue(venue: Venue): Date | null {
    const activeSchedules = venue.quizSchedules?.filter(s => s.isActive) || [];
    for (const schedule of activeSchedules) {
      const date = this.googleMapsService.calculateNextQuizDate(schedule);
      if (date) return date;
    }
    return null;
  }

  getActiveSchedules(venue: Venue): VenueSchedule[] {
    return venue.quizSchedules?.filter(s => s.isActive) || [];
  }

  formatSchedule(schedule: VenueSchedule): string {
    return this.googleMapsService.formatSchedule(schedule);
  }

  getDirectionsUrl(venue: Venue): string {
    const { latitude, longitude } = venue.location;
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }
}
