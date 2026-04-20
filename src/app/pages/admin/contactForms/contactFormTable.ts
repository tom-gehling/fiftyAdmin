import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { Subscription } from 'rxjs';
import { ContactFormService, ContactFormSubmission } from '@/shared/services/contact-form.service';

@Component({
    selector: 'app-contact-form-table',
    standalone: true,
    imports: [CommonModule, FormsModule, CardModule, ButtonModule, InputTextModule, ProgressSpinnerModule, TagModule],
    template: `
        <p-card>
            <div class="flex flex-col sm:flex-row justify-between items-start md:items-center mb-4 gap-2">
                <h2>Form Submissions</h2>
                <input pInputText type="text" placeholder="Search submissions..." class="flex-1 min-w-0 max-w-md" [(ngModel)]="searchText" (input)="applyFilter()" />
            </div>

            <!-- Loading -->
            <div *ngIf="loading" class="flex justify-center py-8">
                <p-progressSpinner styleClass="w-12 h-12" strokeWidth="2"></p-progressSpinner>
            </div>

            <!-- Table -->
            <div *ngIf="!loading && filtered.length > 0" class="overflow-x-auto rounded-lg">
                <table class="w-full" style="border-collapse: separate; border-spacing: 0;">
                    <thead>
                        <tr style="background: rgba(255,255,255,0.06);">
                            <th class="text-left p-3" style="width: 15%;">Name</th>
                            <th class="hidden md:table-cell text-left p-3" style="width: 20%;">Email</th>
                            <th class="hidden lg:table-cell text-left p-3" style="width: 14%;">Mobile</th>
                            <th class="text-left p-3" style="width: 30%;">Message</th>
                            <th class="hidden sm:table-cell text-center p-3" style="width: 13%;">Submitted</th>
                            <th class="text-center p-3" style="width: 8%;">Read</th>
                        </tr>
                    </thead>
                    <tbody>
                        <ng-container *ngFor="let row of filtered">
                            <tr
                                class="cursor-pointer transition-colors"
                                [style.background]="expandedId === row.id ? 'rgba(var(--fifty-neon-green-rgb, 0,255,128), 0.1)' : row.read ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)'"
                                style="border-bottom: 1px solid rgba(255,255,255,0.08);"
                                (click)="toggleExpand(row)"
                                (dblclick)="toggleRead(row)"
                            >
                                <td class="p-3 font-semibold">{{ row.name }}</td>
                                <td class="hidden md:table-cell p-3 text-sm opacity-80">{{ row.email }}</td>
                                <td class="hidden lg:table-cell p-3 text-sm opacity-80">{{ row.mobile || '—' }}</td>
                                <td class="p-3 text-sm opacity-80" style="max-width: 280px;">
                                    <span *ngIf="expandedId !== row.id">{{ truncate(row.message) }}</span>
                                    <span *ngIf="expandedId === row.id">{{ row.message }}</span>
                                </td>
                                <td class="hidden sm:table-cell p-3 text-center text-sm opacity-70">{{ formatDate(row.submittedAt) }}</td>
                                <td class="p-3 text-center">
                                    <p-tag [value]="row.read ? 'Read' : 'New'" [severity]="row.read ? 'secondary' : 'success'" style="font-size: 0.75rem;"></p-tag>
                                </td>
                            </tr>

                            <!-- Expanded detail row -->
                            <tr *ngIf="expandedId === row.id" style="background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.08);">
                                <td colspan="6" class="p-4">
                                    <div class="flex flex-col gap-2 text-sm">
                                        <div><span class="opacity-60">Email:</span> {{ row.email }}</div>
                                        <div><span class="opacity-60">Mobile:</span> {{ row.mobile || '—' }}</div>
                                        <div><span class="opacity-60">Submitted:</span> {{ formatDate(row.submittedAt) }}</div>
                                        <div class="mt-1"><span class="opacity-60">Message:</span><br />{{ row.message }}</div>
                                        <div class="mt-2">
                                            <button
                                                pButton
                                                [label]="row.read ? 'Mark as Unread' : 'Mark as Read'"
                                                [icon]="row.read ? 'pi pi-envelope' : 'pi pi-envelope-open'"
                                                class="p-button-sm p-button-outlined"
                                                (click)="toggleRead(row); $event.stopPropagation()"
                                            ></button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </ng-container>
                    </tbody>
                </table>
            </div>

            <!-- Empty -->
            <div *ngIf="!loading && !filtered.length" class="text-center opacity-60 py-8">No submissions found.</div>
        </p-card>
    `
})
export class ContactFormTableComponent implements OnInit, OnDestroy {
    all: ContactFormSubmission[] = [];
    filtered: ContactFormSubmission[] = [];
    searchText = '';
    loading = true;
    expandedId: string | null = null;
    private sub?: Subscription;

    constructor(private contactFormService: ContactFormService) {}

    ngOnInit() {
        this.sub = this.contactFormService.getAll().subscribe((data) => {
            this.all = data.sort((a, b) => {
                const aTime = a.submittedAt?.toMillis?.() ?? 0;
                const bTime = b.submittedAt?.toMillis?.() ?? 0;
                return bTime - aTime;
            });
            this.applyFilter();
            this.loading = false;
        });
    }

    ngOnDestroy() {
        this.sub?.unsubscribe();
    }

    applyFilter() {
        const q = this.searchText.toLowerCase();
        this.filtered = q ? this.all.filter((r) => r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.mobile?.toLowerCase().includes(q) || r.message?.toLowerCase().includes(q)) : [...this.all];
    }

    toggleExpand(row: ContactFormSubmission) {
        this.expandedId = this.expandedId === row.id ? null : row.id;
    }

    async toggleRead(row: ContactFormSubmission) {
        await this.contactFormService.markRead(row.id, !row.read);
    }

    truncate(text: string): string {
        if (!text) return '';
        return text.length > 80 ? text.slice(0, 80) + '…' : text;
    }

    formatDate(ts: any): string {
        if (!ts) return '—';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
    }
}
