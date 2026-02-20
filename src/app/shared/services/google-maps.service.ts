import { Injectable } from '@angular/core';
import { VenueLocation, VenueSchedule } from '@/shared/models/venue.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GoogleMapsService {
  private scriptLoaded = false;
  private scriptLoading: Promise<void> | null = null;

  /**
   * Load the Google Maps script dynamically
   * This keeps the API key out of index.html
   */
  async loadGoogleMaps(): Promise<void> {
    // If already loaded, return immediately
    if (this.scriptLoaded && typeof google !== 'undefined') {
      return Promise.resolve();
    }

    // If currently loading, return the existing promise
    if (this.scriptLoading) {
      return this.scriptLoading;
    }

    // Start loading
    this.scriptLoading = new Promise<void>((resolve, reject) => {
      // Check if script is already in DOM (e.g., loaded elsewhere)
      if (typeof google !== 'undefined' && google.maps) {
        this.scriptLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };

      script.onerror = () => {
        this.scriptLoading = null;
        reject(new Error('Failed to load Google Maps script'));
      };

      document.head.appendChild(script);
    });

    return this.scriptLoading;
  }

  /**
   * Check if Google Maps is loaded
   */
  isLoaded(): boolean {
    return this.scriptLoaded && typeof google !== 'undefined';
  }

  /**
   * Initialize Google Places Autocomplete on an input element
   */
  initAutocomplete(inputElement: HTMLInputElement): google.maps.places.Autocomplete {
    const autocomplete = new google.maps.places.Autocomplete(inputElement, {
      fields: ['address_components', 'geometry', 'place_id', 'formatted_address'],
      types: ['establishment', 'geocode']
    });

    return autocomplete;
  }

  /**
   * Parse a Google Places result into a VenueLocation object
   */
  parsePlace(place: google.maps.places.PlaceResult): Partial<VenueLocation> {
    if (!place.geometry?.location) {
      throw new Error('No geometry data available for this place');
    }

    const location: Partial<VenueLocation> = {
      latitude: place.geometry.location.lat(),
      longitude: place.geometry.location.lng(),
      placeId: place.place_id,
      address: place.formatted_address || ''
    };

    // Extract address components
    if (place.address_components) {
      for (const component of place.address_components) {
        const types = component.types;

        if (types.includes('locality')) {
          location.city = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          location.state = component.long_name;
        } else if (types.includes('country')) {
          location.country = component.long_name;
        } else if (types.includes('postal_code')) {
          location.postalCode = component.long_name;
        }
      }
    }

    return location;
  }

  /**
   * Geocode an address string to coordinates
   */
  async geocodeAddress(address: string): Promise<VenueLocation> {
    await this.loadGoogleMaps();

    return new Promise((resolve, reject) => {
      const geocoder = new google.maps.Geocoder();

      geocoder.geocode({ address }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
        if (status === 'OK' && results && results[0]) {
          const place = results[0];
          const location: VenueLocation = {
            address: place.formatted_address,
            city: '',
            country: '',
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
            placeId: place.place_id
          };

          // Extract address components
          if (place.address_components) {
            for (const component of place.address_components) {
              const types = component.types;

              if (types.includes('locality')) {
                location.city = component.long_name;
              } else if (types.includes('administrative_area_level_1')) {
                location.state = component.long_name;
              } else if (types.includes('country')) {
                location.country = component.long_name;
              } else if (types.includes('postal_code')) {
                location.postalCode = component.long_name;
              }
            }
          }

          resolve(location);
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  }

  /**
   * Calculate the next quiz date for a given schedule
   */
  calculateNextQuizDate(schedule: VenueSchedule): Date | null {
    if (!schedule.isActive) return null;

    const now = new Date();

    switch (schedule.type) {
      case 'weekly':
        return this.getNextDayOfWeek(now, schedule.dayOfWeek!);

      case 'biweekly':
        // For biweekly, we need a reference date to know which week
        // For now, we'll just return the next occurrence of the day
        return this.getNextDayOfWeek(now, schedule.dayOfWeek!);

      case 'monthly':
        return this.getNextMonthlyDate(now, schedule.dayOfWeek!, schedule.weekOfMonth!);

      case 'custom':
        if (schedule.customDates && schedule.customDates.length > 0) {
          const futureDates = schedule.customDates
            .map(d => new Date(d))
            .filter(d => d > now)
            .sort((a, b) => a.getTime() - b.getTime());

          return futureDates.length > 0 ? futureDates[0] : null;
        }
        return null;

      default:
        return null;
    }
  }

  /**
   * Get the next occurrence of a specific day of the week
   */
  private getNextDayOfWeek(fromDate: Date, dayOfWeek: number): Date {
    const result = new Date(fromDate);
    const currentDay = result.getDay();
    const daysUntilNext = (dayOfWeek - currentDay + 7) % 7;

    // If it's 0, it means today is the day - move to next week
    if (daysUntilNext === 0) {
      result.setDate(result.getDate() + 7);
    } else {
      result.setDate(result.getDate() + daysUntilNext);
    }

    return result;
  }

  /**
   * Get the next occurrence of a specific week of month and day
   * e.g., "First Tuesday" or "Third Friday"
   */
  private getNextMonthlyDate(fromDate: Date, dayOfWeek: number, weekOfMonth: number): Date {
    let currentMonth = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);

    // Try this month first
    let targetDate = this.getNthDayOfMonth(currentMonth, dayOfWeek, weekOfMonth);

    // If the date has passed, try next month
    if (targetDate <= fromDate) {
      currentMonth = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 1);
      targetDate = this.getNthDayOfMonth(currentMonth, dayOfWeek, weekOfMonth);
    }

    return targetDate;
  }

  /**
   * Get the nth occurrence of a day of week in a month
   * e.g., 2nd Tuesday, 4th Friday, Last Friday (weekOfMonth = -1)
   */
  private getNthDayOfMonth(monthStart: Date, dayOfWeek: number, weekOfMonth: number): Date {
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();

    if (weekOfMonth === -1) {
      // Last occurrence: work backwards from the last day of the month
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const lastDayWeekday = lastDayOfMonth.getDay();
      const daysBack = (lastDayWeekday - dayOfWeek + 7) % 7;
      return new Date(year, month, lastDayOfMonth.getDate() - daysBack);
    }

    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayWeekday = firstDayOfMonth.getDay();
    const daysUntilFirst = (dayOfWeek - firstDayWeekday + 7) % 7;
    const targetDate = 1 + daysUntilFirst + (weekOfMonth - 1) * 7;

    return new Date(year, month, targetDate);
  }

  /**
   * Format a schedule into a human-readable string
   */
  formatSchedule(schedule: VenueSchedule): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const time = schedule.startTime ? ` at ${this.formatTime12hr(schedule.startTime)}` : '';

    switch (schedule.type) {
      case 'weekly':
        return `Every ${days[schedule.dayOfWeek!]}${time}`;

      case 'biweekly':
        return `Every other ${days[schedule.dayOfWeek!]}${time}`;

      case 'monthly':
        const weeks: Record<number, string> = { 1: 'First', 2: 'Second', 3: 'Third', 4: 'Fourth', [-1]: 'Last' };
        return `${weeks[schedule.weekOfMonth!]} ${days[schedule.dayOfWeek!]}${time}`;

      case 'custom':
        return 'Custom schedule - see specific dates';

      default:
        return 'No schedule set';
    }
  }

  private formatTime12hr(time24: string): string {
    const [hourStr, minuteStr] = time24.split(':');
    let hour = parseInt(hourStr, 10);
    const minute = minuteStr || '00';
    const period = hour >= 12 ? 'pm' : 'am';
    if (hour === 0) hour = 12;
    else if (hour > 12) hour -= 12;
    return minute === '00' ? `${hour}${period}` : `${hour}:${minute}${period}`;
  }
}
