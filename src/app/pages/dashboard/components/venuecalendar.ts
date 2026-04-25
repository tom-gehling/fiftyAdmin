import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { PopoverModule, Popover } from 'primeng/popover';
import { VenueService } from '@/shared/services/venue.service';
import { Venue, VenueSchedule } from '@/shared/models/venue.model';

interface CalendarEvent {
    venueName: string;
    venueId: string;
    venueCity: string;
    venueState: string;
    startTime?: string;
    endTime?: string;
    type: string;
    scheduleLabel: string;
    notes?: string;
}

interface CalendarDay {
    date: Date;
    dayOfMonth: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    events: CalendarEvent[];
}

@Component({
    selector: 'app-venue-calendar',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, SelectModule, ButtonModule, PopoverModule],
    template: `
        <div class="col-span-12">
            <div class="card p-4 fiftyBorder" style="background: rgb(40, 40, 40); border-radius: 1rem;">
                <!-- Header -->
                <div class="flex flex-wrap justify-between items-center mb-4 gap-3">
                    <div class="flex items-center gap-3 flex-wrap">
                        <h3 class="text-2xl font-bold text-surface-900 dark:text-surface-0 m-0">Quiz Night Schedule</h3>
                        <a routerLink="/find-a-venue" class="inline-flex items-center gap-1 text-sm font-medium no-underline hover:opacity-80" style="color: var(--fifty-neon-green);">
                            <i class="pi pi-map-marker text-xs"></i>
                            <span>Find a venue</span>
                            <i class="pi pi-arrow-right text-xs"></i>
                        </a>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <!-- View toggle -->
                        <div class="flex rounded-lg overflow-hidden border border-surface-300 dark:border-surface-600">
                            <button
                                class="px-3 py-1.5 text-sm font-medium transition-colors border-l border-surface-300 dark:border-surface-600"
                                [style.background]="viewMode === 'week' ? 'var(--fifty-neon-green)' : 'transparent'"
                                [style.color]="viewMode === 'week' ? '#000' : ''"
                                [ngClass]="viewMode !== 'week' ? 'text-muted-color' : ''"
                                (click)="setViewMode('week')"
                            >
                                Week
                            </button>
                            <button
                                class="px-3 py-1.5 text-sm font-medium transition-colors"
                                [style.background]="viewMode === 'month' ? 'var(--fifty-neon-green)' : 'transparent'"
                                [style.color]="viewMode === 'month' ? '#000' : ''"
                                [ngClass]="viewMode !== 'month' ? 'text-muted-color' : ''"
                                (click)="setViewMode('month')"
                            >
                                Month
                            </button>
                        </div>

                        <p-select [(ngModel)]="selectedState" [options]="stateOptions" optionLabel="label" optionValue="value" placeholder="All States" (onChange)="onStateChange()" styleClass="w-44 text-base"></p-select>

                        <div class="flex items-center gap-1">
                            <button pButton icon="pi pi-chevron-left" class="p-button-text p-button-rounded p-button-sm" (click)="prevPeriod()"></button>
                            <span class="font-semibold text-surface-900 dark:text-surface-0 min-w-52 text-center text-base">{{ periodLabel }}</span>
                            <button pButton icon="pi pi-chevron-right" class="p-button-text p-button-rounded p-button-sm" (click)="nextPeriod()"></button>
                        </div>
                    </div>
                </div>

                <!-- State colour key -->
                <div *ngIf="stateOptions.length > 2" class="flex flex-wrap gap-2 mb-4">
                    <ng-container *ngFor="let opt of stateOptions">
                        <span
                            *ngIf="opt.value"
                            class="flex items-center gap-1.5 text-sm font-medium px-2 py-0.5 rounded-full"
                            [style.background]="hexToAlpha(getStateColor(opt.value), 0.15)"
                            [style.color]="getStateColor(opt.value)"
                            [style.border]="'1px solid ' + getStateColor(opt.value)"
                        >
                            <span class="w-2 h-2 rounded-full inline-block" [style.background]="getStateColor(opt.value)"></span>
                            {{ opt.label }}
                        </span>
                    </ng-container>
                </div>

                <!-- Day name headers — hidden on mobile in week view (cells show their own label) -->
                <div class="grid grid-cols-7 mb-1" [ngClass]="{ 'hidden sm:grid': viewMode === 'week' }">
                    <div *ngFor="let day of DAY_NAMES" class="text-center text-sm font-semibold py-2 text-muted-color uppercase tracking-wide">{{ day }}</div>
                </div>

                <!-- ===== MONTH VIEW ===== -->
                <div *ngIf="viewMode === 'month'" class="grid grid-cols-7 border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
                    <div
                        *ngFor="let day of calendarDays; let i = index"
                        class="min-h-20 p-1.5 flex flex-col gap-0.5 border-r border-b border-surface-200 dark:border-surface-700"
                        [ngClass]="{
                            'bg-surface-0 dark:bg-surface-900': day.isCurrentMonth,
                            'bg-surface-50 dark:bg-surface-800 opacity-50': !day.isCurrentMonth,
                            'border-r-0': (i + 1) % 7 === 0,
                            'cursor-pointer sm:cursor-default': day.events.length > 0
                        }"
                        (click)="day.events.length ? openDayPanel($event, day) : null"
                    >
                        <div class="flex justify-start mb-0.5">
                            <span
                                class="text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full leading-none"
                                [ngClass]="day.isCurrentMonth ? 'text-surface-900 dark:text-surface-0' : 'text-muted-color'"
                                [style.backgroundColor]="day.isToday ? 'var(--fifty-neon-green)' : 'transparent'"
                                [style.color]="day.isToday ? '#000' : ''"
                                >{{ day.dayOfMonth }}</span
                            >
                        </div>

                        <!-- Mobile: full-width color bars -->
                        <div class="sm:hidden flex flex-col gap-0.5">
                            <span *ngFor="let event of day.events" class="block h-1.5 rounded-sm w-full" [style.background]="getStateColor(event.venueState)"></span>
                        </div>

                        <!-- Desktop: event labels -->
                        <ng-container *ngFor="let event of day.events.slice(0, 3)">
                            <div
                                class="hidden sm:block text-sm rounded px-1 py-0.5 truncate font-medium leading-tight cursor-pointer transition-opacity hover:opacity-80"
                                [style.background]="hexToAlpha(getStateColor(event.venueState), 0.15)"
                                [style.color]="getStateColor(event.venueState)"
                                [style.border-left]="'2px solid ' + getStateColor(event.venueState)"
                                (click)="openPanel($event, event, day); $event.stopPropagation()"
                            >
                                {{ event.venueName }}
                            </div>
                        </ng-container>
                        <div *ngIf="day.events.length > 3" class="hidden sm:block text-sm text-muted-color pl-1 cursor-pointer hover:underline" (click)="openDayPanel($event, day); $event.stopPropagation()">+{{ day.events.length - 3 }} more</div>
                    </div>
                </div>

                <!-- ===== WEEK VIEW ===== -->
                <div *ngIf="viewMode === 'week'" class="grid grid-cols-1 sm:grid-cols-7 border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
                    <div
                        *ngFor="let day of weekDays; let i = index"
                        class="p-2 flex flex-row sm:flex-col gap-2 sm:gap-1 border-b sm:border-b-0 sm:border-r border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900"
                        [ngClass]="{
                            'sm:border-r-0': i === 6,
                            'border-b-0': i === 6
                        }"
                        [style.background]="day.isToday ? hexToAlpha('#4cfbab', 0.04) : ''"
                    >
                        <!-- Day label — left column on mobile, top header on desktop -->
                        <div class="flex flex-row sm:flex-col items-center sm:items-start gap-2 sm:gap-0 sm:mb-1 sm:pb-1 sm:border-b border-surface-200 dark:border-surface-700 shrink-0 w-16 sm:w-auto">
                            <span
                                class="text-lg font-bold w-9 h-9 flex items-center justify-center rounded-full leading-none shrink-0"
                                [ngClass]="day.isCurrentMonth ? 'text-surface-900 dark:text-surface-0' : 'text-muted-color'"
                                [style.backgroundColor]="day.isToday ? 'var(--fifty-neon-green)' : 'transparent'"
                                [style.color]="day.isToday ? '#000' : ''"
                                >{{ day.dayOfMonth }}</span
                            >
                            <span class="text-xs font-semibold text-muted-color uppercase tracking-wide">{{ DAY_NAMES[day.date.getDay()] }}</span>
                        </div>

                        <!-- Events — all shown, no truncation -->
                        <div class="flex-1 flex flex-col gap-1">
                            <ng-container *ngFor="let event of day.events">
                                <div
                                    class="text-sm rounded px-2 py-1 font-medium leading-tight cursor-pointer transition-opacity hover:opacity-80 flex flex-col gap-0.5"
                                    style="margin-left:10px;"
                                    [style.background]="hexToAlpha(getStateColor(event.venueState), 0.15)"
                                    [style.color]="getStateColor(event.venueState)"
                                    [style.border-left]="'3px solid ' + getStateColor(event.venueState)"
                                    (click)="openPanel($event, event, day)"
                                >
                                    <span class="truncate">{{ event.venueName }}</span>
                                    <span class="text-xs opacity-80" *ngIf="event.startTime">{{ formatTime(event.startTime) }}</span>
                                </div>
                            </ng-container>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Event detail popover -->
        <p-popover #eventPopover>
            <ng-container *ngIf="popoverEvent">
                <div class="flex flex-col gap-3 min-w-56 max-w-xs">
                    <div class="flex items-start gap-2">
                        <i class="pi pi-map-marker mt-0.5 text-sm" [style.color]="getStateColor(popoverEvent.venueState)"></i>
                        <div>
                            <div class="font-bold text-surface-900 dark:text-surface-0 text-lg leading-tight">{{ popoverEvent.venueName }}</div>
                            <div class="text-sm text-muted-color mt-0.5" *ngIf="popoverEvent.venueCity || popoverEvent.venueState">
                                {{ popoverEvent.venueCity }}{{ popoverEvent.venueCity && popoverEvent.venueState ? ', ' : '' }}{{ popoverEvent.venueState }}
                            </div>
                        </div>
                    </div>

                    <hr class="border-0 border-t border-surface-200 dark:border-surface-700 m-0" />

                    <div class="flex items-center gap-2 text-base">
                        <i class="pi pi-calendar text-base" style="color: var(--fifty-neon-green);"></i>
                        <span class="text-surface-900 dark:text-surface-0">{{ popoverDay?.date | date: 'EEEE, d MMMM yyyy' }}</span>
                    </div>

                    <div class="flex items-center gap-2 text-base" *ngIf="popoverEvent.startTime">
                        <i class="pi pi-clock text-base" style="color: var(--fifty-neon-green);"></i>
                        <span class="text-surface-900 dark:text-surface-0">
                            {{ formatTime(popoverEvent.startTime) }}
                            <ng-container *ngIf="popoverEvent.endTime"> – {{ formatTime(popoverEvent.endTime) }}</ng-container>
                        </span>
                    </div>

                    <div class="flex items-center gap-2 text-base">
                        <i class="pi pi-refresh text-base" style="color: var(--fifty-neon-green);"></i>
                        <span class="text-surface-900 dark:text-surface-0">{{ popoverEvent.scheduleLabel }}</span>
                    </div>

                    <div class="flex items-start gap-2 text-base" *ngIf="popoverEvent.notes">
                        <i class="pi pi-info-circle text-base mt-0.5" style="color: var(--fifty-neon-green);"></i>
                        <span class="text-muted-color">{{ popoverEvent.notes }}</span>
                    </div>
                </div>
            </ng-container>

            <!-- Day overflow list -->
            <ng-container *ngIf="!popoverEvent && popoverDay">
                <div class="flex flex-col gap-2 min-w-56">
                    <div class="font-semibold text-surface-900 dark:text-surface-0 text-base mb-1">
                        {{ popoverDay.date | date: 'EEEE, d MMMM' }}
                    </div>
                    <div
                        *ngFor="let ev of popoverDay.events"
                        class="text-sm rounded px-2 py-1.5 font-medium leading-tight cursor-pointer transition-opacity hover:opacity-80"
                        [style.background]="hexToAlpha(getStateColor(ev.venueState), 0.15)"
                        [style.color]="getStateColor(ev.venueState)"
                        [style.border-left]="'2px solid ' + getStateColor(ev.venueState)"
                        (click)="expandedPopoverEvent = expandedPopoverEvent === ev ? null : ev"
                    >
                        <div class="truncate">{{ ev.venueName }}</div>
                        <ng-container *ngIf="expandedPopoverEvent === ev">
                            <div class="mt-1.5 pt-1.5 flex flex-col gap-1 font-normal text-xs opacity-90" [style.border-top]="'1px solid ' + hexToAlpha(getStateColor(ev.venueState), 0.4)">
                                <span *ngIf="ev.venueCity || ev.venueState" class="opacity-75"> {{ ev.venueCity }}{{ ev.venueCity && ev.venueState ? ', ' : '' }}{{ ev.venueState }} </span>
                                <span *ngIf="ev.startTime">
                                    {{ formatTime(ev.startTime) }}<ng-container *ngIf="ev.endTime"> – {{ formatTime(ev.endTime) }}</ng-container>
                                </span>
                                <span>{{ ev.scheduleLabel }}</span>
                                <span *ngIf="ev.notes" class="opacity-75">{{ ev.notes }}</span>
                            </div>
                        </ng-container>
                    </div>
                </div>
            </ng-container>
        </p-popover>
    `
})
export class VenueCalendarComponent implements OnInit {
    @ViewChild('eventPopover') eventPopover!: Popover;

    private venueService = inject(VenueService);
    private http = inject(HttpClient);

    venues: Venue[] = [];
    selectedState: string | null = null;
    stateOptions: { label: string; value: string | null }[] = [{ label: 'All States', value: null }];

    viewMode: 'month' | 'week' = 'month';
    viewYear = new Date().getFullYear();
    viewMonth = new Date().getMonth();
    currentViewDate = new Date(); // drives week view
    calendarDays: CalendarDay[] = [];
    weekDays: CalendarDay[] = [];

    popoverEvent: CalendarEvent | null = null;
    popoverDay: CalendarDay | null = null;
    expandedPopoverEvent: CalendarEvent | null = null;

    private detectedRegion: string | null = null;

    readonly DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    readonly MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    private readonly STATE_PALETTE = ['#4cfbab', '#60a5fa', '#f472b6', '#fb923c', '#a78bfa', '#facc15', '#22d3ee', '#f87171', '#34d399', '#e879f9'];

    stateColorMap = new Map<string, string>();

    getStateColor(state: string): string {
        return this.stateColorMap.get(state) ?? '#4cfbab';
    }

    hexToAlpha(hex: string, alpha: number): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    ngOnInit() {
        this.venueService.getActiveVenues().subscribe((venues) => {
            this.venues = venues;
            this.buildStateOptions();
            if (this.detectedRegion && !this.selectedState) {
                this.applyDetectedRegion(this.detectedRegion);
            }
            this.buildCalendar();
        });

        this.http.get<{ region?: string }>('https://ipapi.co/json/').subscribe({
            next: (data) => {
                if (data.region) {
                    this.detectedRegion = data.region;
                    if (this.stateOptions.length > 1) {
                        this.applyDetectedRegion(data.region);
                        this.buildCalendar();
                    }
                }
            },
            error: () => {}
        });
    }

    setViewMode(mode: 'month' | 'week') {
        this.viewMode = mode;
        if (mode === 'week') {
            // Sync currentViewDate to the visible month when switching
            this.currentViewDate = new Date(this.viewYear, this.viewMonth, this.currentViewDate.getMonth() === this.viewMonth ? this.currentViewDate.getDate() : 1);
            this.buildWeekView();
        } else {
            this.buildCalendar();
        }
    }

    prevPeriod() {
        if (this.viewMode === 'month') {
            if (this.viewMonth === 0) {
                this.viewMonth = 11;
                this.viewYear--;
            } else this.viewMonth--;
            this.buildCalendar();
        } else {
            this.currentViewDate = new Date(this.currentViewDate);
            this.currentViewDate.setDate(this.currentViewDate.getDate() - 7);
            this.buildWeekView();
        }
    }

    nextPeriod() {
        if (this.viewMode === 'month') {
            if (this.viewMonth === 11) {
                this.viewMonth = 0;
                this.viewYear++;
            } else this.viewMonth++;
            this.buildCalendar();
        } else {
            this.currentViewDate = new Date(this.currentViewDate);
            this.currentViewDate.setDate(this.currentViewDate.getDate() + 7);
            this.buildWeekView();
        }
    }

    openPanel(mouseEvent: MouseEvent, event: CalendarEvent, day: CalendarDay) {
        this.popoverEvent = event;
        this.popoverDay = day;
        this.eventPopover.toggle(mouseEvent);
    }

    openDayPanel(mouseEvent: MouseEvent, day: CalendarDay) {
        this.popoverEvent = null;
        this.popoverDay = day;
        this.expandedPopoverEvent = null;
        this.eventPopover.toggle(mouseEvent);
    }

    switchToEvent(event: CalendarEvent) {
        this.popoverEvent = event;
    }

    private applyDetectedRegion(region: string) {
        const match = this.stateOptions.find((s) => s.value && s.value.toLowerCase() === region.toLowerCase());
        if (match) this.selectedState = match.value;
    }

    private buildStateOptions() {
        const states = new Set<string>();
        this.venues.forEach((v) => {
            if (v.location.state) states.add(v.location.state);
        });
        const sorted = [...states].sort();
        this.stateColorMap = new Map(sorted.map((s, i) => [s, this.STATE_PALETTE[i % this.STATE_PALETTE.length]]));
        this.stateOptions = [{ label: 'All States', value: null }, ...sorted.map((s) => ({ label: s, value: s }))];
    }

    buildCalendar() {
        const year = this.viewYear;
        const month = this.viewMonth;
        const eventsMap = this.buildEventsMapForMonth(year, month);

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const today = new Date();
        const days: CalendarDay[] = [];

        for (let i = firstDay.getDay() - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            days.push({ date, dayOfMonth: date.getDate(), isCurrentMonth: false, isToday: false, events: [] });
        }

        for (let d = 1; d <= lastDay.getDate(); d++) {
            const date = new Date(year, month, d);
            days.push({
                date,
                dayOfMonth: d,
                isCurrentMonth: true,
                isToday: date.toDateString() === today.toDateString(),
                events: eventsMap.get(d) || []
            });
        }

        const endPad = 42 - days.length;
        for (let d = 1; d <= endPad; d++) {
            const date = new Date(year, month + 1, d);
            days.push({ date, dayOfMonth: d, isCurrentMonth: false, isToday: false, events: [] });
        }

        this.calendarDays = days;
    }

    buildWeekView() {
        const weekStart = this.getWeekStart(this.currentViewDate);
        const today = new Date();

        this.weekDays = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            return {
                date,
                dayOfMonth: date.getDate(),
                isCurrentMonth: date.getMonth() === this.viewMonth,
                isToday: date.toDateString() === today.toDateString(),
                events: this.buildEventsForDate(date)
            };
        });
    }

    private getWeekStart(date: Date): Date {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        return d;
    }

    private buildEventsForDate(date: Date): CalendarEvent[] {
        const filteredVenues = this.selectedState ? this.venues.filter((v) => v.location.state === this.selectedState) : this.venues;

        const events: CalendarEvent[] = [];
        filteredVenues.forEach((venue) => {
            venue.quizSchedules
                .filter((s) => s.isActive)
                .forEach((schedule) => {
                    const occurrences = this.getOccurrencesInMonth(schedule, date.getFullYear(), date.getMonth());
                    if (occurrences.includes(date.getDate())) {
                        events.push({
                            venueName: venue.venueName,
                            venueId: venue.id || '',
                            venueCity: venue.location.city || '',
                            venueState: venue.location.state || '',
                            startTime: schedule.startTime,
                            endTime: schedule.endTime,
                            type: schedule.type,
                            scheduleLabel: this.formatScheduleLabel(schedule),
                            notes: schedule.notes
                        });
                    }
                });
        });
        return events;
    }

    private buildEventsMapForMonth(year: number, month: number): Map<number, CalendarEvent[]> {
        const filteredVenues = this.selectedState ? this.venues.filter((v) => v.location.state === this.selectedState) : this.venues;

        const map = new Map<number, CalendarEvent[]>();
        filteredVenues.forEach((venue) => {
            venue.quizSchedules
                .filter((s) => s.isActive)
                .forEach((schedule) => {
                    this.getOccurrencesInMonth(schedule, year, month).forEach((day) => {
                        if (!map.has(day)) map.set(day, []);
                        map.get(day)!.push({
                            venueName: venue.venueName,
                            venueId: venue.id || '',
                            venueCity: venue.location.city || '',
                            venueState: venue.location.state || '',
                            startTime: schedule.startTime,
                            endTime: schedule.endTime,
                            type: schedule.type,
                            scheduleLabel: this.formatScheduleLabel(schedule),
                            notes: schedule.notes
                        });
                    });
                });
        });
        return map;
    }

    private getOccurrencesInMonth(schedule: VenueSchedule, year: number, month: number): number[] {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const result: number[] = [];

        switch (schedule.type) {
            case 'weekly': {
                for (let d = 1; d <= daysInMonth; d++) {
                    if (new Date(year, month, d).getDay() === schedule.dayOfWeek) result.push(d);
                }
                break;
            }
            case 'biweekly': {
                const all: number[] = [];
                for (let d = 1; d <= daysInMonth; d++) {
                    if (new Date(year, month, d).getDay() === schedule.dayOfWeek) all.push(d);
                }
                all.forEach((d, i) => {
                    if (i % 2 === 0) result.push(d);
                });
                break;
            }
            case 'monthly': {
                const day = this.getNthWeekdayOfMonth(year, month, schedule.dayOfWeek!, schedule.weekOfMonth!);
                if (day !== null) result.push(day);
                break;
            }
            case 'one-off':
            case 'custom': {
                (schedule.customDates || []).forEach((cd) => {
                    const d = cd instanceof Date ? cd : new Date(cd as any);
                    if (d.getFullYear() === year && d.getMonth() === month) result.push(d.getDate());
                });
                break;
            }
        }

        const exclusions = new Set<number>(
            (schedule.exclusionDates || [])
                .map((ed) => {
                    const d = ed instanceof Date ? ed : ((ed as any)?.toDate?.() ?? new Date(ed as any));
                    return d.getFullYear() === year && d.getMonth() === month ? d.getDate() : -1;
                })
                .filter((d) => d > 0)
        );

        return result.filter((d) => !exclusions.has(d));
    }

    private getNthWeekdayOfMonth(year: number, month: number, dayOfWeek: number, weekOfMonth: number): number | null {
        if (weekOfMonth === -1) {
            const lastDay = new Date(year, month + 1, 0);
            return lastDay.getDate() - ((lastDay.getDay() - dayOfWeek + 7) % 7);
        }
        const firstDay = new Date(year, month, 1);
        const diff = (dayOfWeek - firstDay.getDay() + 7) % 7;
        const targetDate = 1 + diff + (weekOfMonth - 1) * 7;
        return targetDate <= new Date(year, month + 1, 0).getDate() ? targetDate : null;
    }

    private formatScheduleLabel(schedule: VenueSchedule): string {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        switch (schedule.type) {
            case 'weekly':
                return `Every ${days[schedule.dayOfWeek!]}`;
            case 'biweekly':
                return `Every other ${days[schedule.dayOfWeek!]}`;
            case 'monthly': {
                const weeks: Record<number, string> = { 1: 'First', 2: 'Second', 3: 'Third', 4: 'Fourth', [-1]: 'Last' };
                return `${weeks[schedule.weekOfMonth!]} ${days[schedule.dayOfWeek!]} of the month`;
            }
            case 'one-off':
            case 'custom': {
                const dates = (schedule.customDates || []).map((cd) => {
                    const d = cd instanceof Date ? cd : new Date(cd as any);
                    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
                });
                return dates.length > 0 ? dates.join(', ') : '';
            }
            default:
                return '';
        }
    }

    formatTime(time: string): string {
        if (!time) return '';
        const [hourStr, minuteStr] = time.split(':');
        let hour = parseInt(hourStr, 10);
        const minute = minuteStr || '00';
        const period = hour >= 12 ? 'pm' : 'am';
        if (hour === 0) hour = 12;
        else if (hour > 12) hour -= 12;
        return minute === '00' ? `${hour}${period}` : `${hour}:${minute}${period}`;
    }

    onStateChange() {
        this.viewMode === 'week' ? this.buildWeekView() : this.buildCalendar();
    }

    get periodLabel(): string {
        if (this.viewMode === 'month') {
            return `${this.MONTH_NAMES[this.viewMonth]} ${this.viewYear}`;
        }
        const weekStart = this.getWeekStart(this.currentViewDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const startStr = `${weekStart.getDate()} ${this.MONTH_NAMES[weekStart.getMonth()].slice(0, 3)}`;
        const endStr = `${weekEnd.getDate()} ${this.MONTH_NAMES[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getFullYear()}`;
        return `${startStr} – ${endStr}`;
    }
}
