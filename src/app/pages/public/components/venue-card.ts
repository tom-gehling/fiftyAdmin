import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Venue, VenueSchedule } from '@/shared/models/venue.model';
import { GoogleMapsService } from '@/shared/services/google-maps.service';

@Component({
  selector: 'app-venue-card',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule],
  template: `
    <p-card *ngIf="venue" class="venue-card">
      <ng-template #header>
        <div class="p-4 bg-gradient-to-r from-[#677c73] to-[#4cfbab] text-white">
          <h2 class="text-2xl font-bold mb-1">{{ venue.venueName }}</h2>
          <p class="text-sm opacity-90">
            <i class="pi pi-map-marker mr-1"></i>
            {{ venue.location.city }}, {{ venue.location.country }}
          </p>
        </div>
      </ng-template>

      <div class="space-y-4">
        <!-- Address -->
        <div>
          <h3 class="font-semibold text-gray-700 mb-1">Address</h3>
          <p class="text-gray-600">
            {{ venue.location.address }}<br>
            {{ venue.location.city }}<span *ngIf="venue.location.state">, {{ venue.location.state }}</span>
            <span *ngIf="venue.location.postalCode"> {{ venue.location.postalCode }}</span>
          </p>
        </div>

        <!-- Description -->
        <div *ngIf="venue.description">
          <h3 class="font-semibold text-gray-700 mb-1">About</h3>
          <p class="text-gray-600">{{ venue.description }}</p>
        </div>

        <!-- Quiz Schedules -->
        <div *ngIf="activeSchedules.length > 0">
          <h3 class="font-semibold text-gray-700 mb-2">Quiz Nights</h3>
          <div *ngFor="let schedule of activeSchedules" class="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
            <p class="font-medium text-gray-800">{{ formatSchedule(schedule) }}</p>
            <p class="text-sm text-gray-600 mt-1" *ngIf="getNextQuizDate(schedule) as nextDate">
              <i class="pi pi-calendar mr-1"></i>
              Next quiz: {{ nextDate | date:'EEEE, MMMM d, y' }}
            </p>
            <p class="text-sm text-gray-600 mt-1" *ngIf="schedule.notes">
              <i class="pi pi-info-circle mr-1"></i>
              {{ schedule.notes }}
            </p>
          </div>
        </div>

        <!-- Contact Info -->
        <div *ngIf="venue.phoneNumber || venue.email" class="border-t pt-3">
          <h3 class="font-semibold text-gray-700 mb-2">Contact</h3>
          <p *ngIf="venue.phoneNumber" class="text-gray-600 mb-1">
            <i class="pi pi-phone mr-1"></i>
            {{ venue.phoneNumber }}
          </p>
          <p *ngIf="venue.email" class="text-gray-600">
            <i class="pi pi-envelope mr-1"></i>
            {{ venue.email }}
          </p>
        </div>

        <!-- Capacity -->
        <p *ngIf="venue.capacity" class="text-sm text-gray-600">
          <i class="pi pi-users mr-1"></i>
          Capacity: {{ venue.capacity }}
        </p>
      </div>

      <ng-template #footer>
        <div class="flex gap-2 flex-wrap">
          <a *ngIf="venue.websiteUrl" [href]="venue.websiteUrl" target="_blank" class="flex-1">
            <p-button
              label="Visit Website"
              icon="pi pi-external-link"
              [outlined]="true"
              severity="secondary"
              styleClass="w-full"
            ></p-button>
          </a>
          <a [href]="getDirectionsUrl(venue)" target="_blank" class="flex-1">
            <p-button
              label="Get Directions"
              icon="pi pi-map-marker"
              severity="secondary"
              styleClass="w-full"
            ></p-button>
          </a>
        </div>
      </ng-template>
    </p-card>
  `,
  styles: [`
    .venue-card {
      max-width: 100%;
    }

    ::ng-deep .venue-card .p-card-body {
      padding: 1rem;
    }

    ::ng-deep .venue-card .p-card-footer {
      padding: 1rem;
      border-top: 1px solid #e5e7eb;
    }
  `]
})
export class VenueCardComponent {
  @Input() venue!: Venue;

  constructor(private googleMapsService: GoogleMapsService) {}

  get activeSchedules(): VenueSchedule[] {
    return this.venue.quizSchedules?.filter(s => s.isActive) || [];
  }

  formatSchedule(schedule: VenueSchedule): string {
    return this.googleMapsService.formatSchedule(schedule);
  }

  getNextQuizDate(schedule: VenueSchedule): Date | null {
    return this.googleMapsService.calculateNextQuizDate(schedule);
  }

  getDirectionsUrl(venue: Venue): string {
    const { latitude, longitude } = venue.location;
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }
}
