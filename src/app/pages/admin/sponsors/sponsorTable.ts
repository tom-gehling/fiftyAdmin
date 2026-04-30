import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';

import { Sponsor } from '@/shared/models/sponsor.model';
import { SponsorService } from '@/shared/services/sponsor.service';
import { AuthService } from '@/shared/services/auth.service';
import { NotifyService } from '@/shared/services/notify.service';

@Component({
    selector: 'app-sponsor-table',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, CardModule, ButtonModule, InputTextModule, TagModule],
    template: `
        <p-card>
            <div class="flex flex-col sm:flex-row justify-between items-start md:items-center mb-4 gap-2">
                <h2>Sponsors</h2>

                <div class="flex flex-col sm:flex-row gap-2 flex-1 w-full md:ml-4">
                    <input pInputText type="text" placeholder="Search sponsors..." class="flex-1 min-w-0" [(ngModel)]="searchText" (input)="filterSponsors()" />
                    <button pButton label="Create Sponsor" icon="pi pi-plus" class="p-button-primary" *ngIf="canWrite()" (click)="createSponsor()"></button>
                </div>
            </div>

            <div *ngIf="!loading && filteredSponsors.length > 0; else loadingOrEmpty" class="rounded-lg overflow-hidden">
                <div
                    *ngFor="let sponsor of filteredSponsors; let first = first"
                    style="display: flex !important; flex-direction:row; background: rgba(255,255,255,0.04); box-shadow: 0 1px 3px rgba(0,0,0,0.15); gap: 20px; position: relative;"
                    class="flex flex-row items-center justify-between cursor-pointer transition-colors"
                    [ngClass]="{
                        'bg-surface-50 dark:bg-surface-700': selectedSponsor?.id === sponsor?.id,
                        'hover:bg-surface-100 dark:hover:bg-surface-600': selectedSponsor?.id !== sponsor?.id
                    }"
                    (click)="highlightRow(sponsor)"
                    (dblclick)="openSponsor(sponsor)"
                >
                    <div *ngIf="!first" style="width:100%;height:1px;background:var(--fifty-neon-green);position:absolute;top:0;left:0"></div>

                    <div class="flex flex-1 items-center gap-4 p-3">
                        <div *ngIf="sponsor.imageUrl" class="w-16 h-16 flex items-center justify-center rounded overflow-hidden bg-surface-100 dark:bg-surface-700 flex-shrink-0">
                            <img [src]="sponsor.imageUrl" [alt]="sponsor.name" class="max-w-full max-h-full object-contain" />
                        </div>
                        <div *ngIf="!sponsor.imageUrl" class="w-16 h-16 flex items-center justify-center rounded bg-surface-100 dark:bg-surface-700 text-gray-400 flex-shrink-0">
                            <i class="pi pi-megaphone text-2xl"></i>
                        </div>

                        <div class="flex flex-col justify-center">
                            <div class="font-semibold text-lg text-surface-900 dark:text-surface-100">{{ sponsor.name }}</div>
                            <div class="text-xs text-gray-400 mt-1">{{ sponsor.appendedFields?.length || 0 }} appended field{{ (sponsor.appendedFields?.length || 0) === 1 ? '' : 's' }}</div>
                        </div>
                    </div>

                    <div class="flex flex-col justify-between items-end p-3">
                        <div class="flex items-center gap-2 text-sm text-gray-500">
                            <span *ngIf="sponsor.isActive" class="px-2 py-0.5 text-xs font-semibold text-white bg-green-500 rounded-full">Active</span>
                            <span *ngIf="!sponsor.isActive" class="px-2 py-0.5 text-xs font-semibold text-white bg-gray-400 rounded-full">Inactive</span>
                        </div>
                        <div class="flex gap-2 mt-2">
                            <button pButton icon="pi pi-pencil" class="p-button-text p-button-sm" *ngIf="canWrite()" (click)="editSponsor(sponsor); $event.stopPropagation()"></button>
                            <button pButton icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger" *ngIf="canWrite() && sponsor.isActive" (click)="deleteSponsor(sponsor); $event.stopPropagation()"></button>
                        </div>
                    </div>
                </div>
            </div>

            <ng-template #loadingOrEmpty>
                <div class="text-center text-gray-500 py-4" *ngIf="loading">Loading sponsors...</div>
                <div class="text-center text-gray-500 py-4" *ngIf="!loading && !filteredSponsors.length">No sponsors found.</div>
            </ng-template>
        </p-card>
    `
})
export class SponsorTableComponent implements OnInit {
    sponsors: Sponsor[] = [];
    filteredSponsors: Sponsor[] = [];
    searchText = '';
    loading = false;
    selectedSponsor: Sponsor | null = null;

    constructor(
        private sponsorService: SponsorService,
        private authService: AuthService,
        private router: Router,
        private notify: NotifyService
    ) {}

    ngOnInit(): void {
        this.loadSponsors();
    }

    loadSponsors(): void {
        this.loading = true;
        this.sponsorService.getAllSponsors().subscribe((sponsors) => {
            this.sponsors = sponsors;
            this.filterSponsors();
            this.loading = false;
        });
    }

    filterSponsors(): void {
        if (!this.searchText.trim()) {
            this.filteredSponsors = [...this.sponsors];
        } else {
            const term = this.searchText.toLowerCase();
            this.filteredSponsors = this.sponsors.filter((s) => s.name.toLowerCase().includes(term));
        }
    }

    canWrite(): boolean {
        return !!this.authService.isAdmin$.value;
    }

    createSponsor(): void {
        if (this.canWrite()) {
            this.router.navigate(['/fiftyPlus/admin/sponsors', '0']);
        }
    }

    editSponsor(sponsor: Sponsor): void {
        this.router.navigate(['/fiftyPlus/admin/sponsors', sponsor.id]);
    }

    highlightRow(sponsor: Sponsor): void {
        this.selectedSponsor = sponsor;
    }

    openSponsor(sponsor: Sponsor): void {
        this.router.navigate(['/fiftyPlus/admin/sponsors', sponsor.id]);
    }

    async deleteSponsor(sponsor: Sponsor): Promise<void> {
        if (!sponsor.id) return;
        if (confirm('Are you sure you want to deactivate this sponsor?')) {
            try {
                await this.sponsorService.deleteSponsor(sponsor.id);
                this.notify.success('Sponsor deactivated successfully');
            } catch (err) {
                console.error(err);
                this.notify.error('Error deactivating sponsor');
            }
        }
    }
}
