import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { UserService } from '@/shared/services/user.service';
import { QuizResultsService } from '@/shared/services/quiz-result.service';
import { UserDetailComponent } from './userDetail';

interface UserRow {
  uid: string;
  displayName: string;
  email: string;
  lastLoginAt: any;
  membershipType: string;
  completedQuizzes: number;
  raw: any;
}

type SortKey = 'displayName' | 'membershipType' | 'lastLoginAt' | 'completedQuizzes';

@Component({
  selector: 'app-user-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    ProgressSpinnerModule,
    UserDetailComponent
  ],
  template: `
    <p-card>
      <div class="flex flex-col sm:flex-row justify-between items-start md:items-center mb-4 gap-2">
        <h2>All Users</h2>
        <input
          pInputText
          type="text"
          placeholder="Search users..."
          class="flex-1 min-w-0 max-w-md"
          [(ngModel)]="searchText"
          (input)="applyFilter()"
        />
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="flex justify-center py-8">
        <p-progressSpinner styleClass="w-12 h-12" strokeWidth="2"></p-progressSpinner>
      </div>

      <!-- Table -->
      <div *ngIf="!loading && filteredUsers.length > 0" class="overflow-x-auto rounded-lg">
        <table class="w-full" style="border-collapse: separate; border-spacing: 0;">
          <thead>
            <tr style="background: rgba(255,255,255,0.06);">
              <th class="text-left p-3 cursor-pointer select-none" style="width: 35%;" (click)="sortBy('displayName')">
                User <i class="pi" [ngClass]="getSortIcon('displayName')"></i>
              </th>
              <th class="text-center p-3 cursor-pointer select-none" style="width: 20%;" (click)="sortBy('membershipType')">
                Membership Type <i class="pi" [ngClass]="getSortIcon('membershipType')"></i>
              </th>
              <th class="text-center p-3 cursor-pointer select-none" style="width: 20%;" (click)="sortBy('lastLoginAt')">
                Last Login <i class="pi" [ngClass]="getSortIcon('lastLoginAt')"></i>
              </th>

              <th class="p-3 text-right" style="width: 10%;">
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
              *ngFor="let user of filteredUsers"
              class="cursor-pointer transition-colors"
              [style.background]="detailUser?.uid === user.uid && showDetail ? 'rgba(var(--fifty-neon-green-rgb, 0,255,128), 0.15)' : selectedUser?.uid === user.uid ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'"
              style="border-bottom: 1px solid var(--fifty-neon-green);"
              [ngClass]="{
                'hover:bg-surface-100 dark:hover:bg-surface-600': selectedUser?.uid !== user.uid
              }"
              (click)="highlightRow(user)"
              (dblclick)="openDetail(user)"
            >
              <td class="p-3">
                <div class="flex flex-col min-w-0">
                  <span class="font-semibold text-surface-900 dark:text-surface-100 truncate">
                    {{ user.displayName || 'Unknown' }}
                  </span>
                  <span class="text-sm text-gray-500 truncate">{{ user.email || '' }}</span>
                </div>
              </td>
              <td class="p-3 text-center font-medium">{{ user.membershipType }}</td>
              <td class="p-3 text-center font-medium">{{ formatDate(user.lastLoginAt) }}</td>

              <td class="p-3 text-right">
                <button
                  pButton
                  icon="pi pi-eye"
                  class="p-button-text p-button-sm"
                  (click)="openDetail(user); $event.stopPropagation()"
                ></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty -->
      <div *ngIf="!loading && !filteredUsers.length" class="text-center text-gray-500 py-4">
        No users found.
      </div>
    </p-card>

    <!-- Detail Modal -->
    <app-user-detail
      [user]="detailUser"
      [(visible)]="showDetail"
    ></app-user-detail>
  `
})
export class UserTableComponent implements OnInit {
  users: UserRow[] = [];
  filteredUsers: UserRow[] = [];
  selectedUser: UserRow | null = null;
  detailUser: any = null;
  showDetail = false;
  searchText = '';
  loading = false;

  sortKey: SortKey = 'displayName';
  sortAsc = true;
  isSorted = false;

  constructor(
    private userService: UserService,
    private quizResultsService: QuizResultsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  async loadUsers() {
    this.loading = true;
    const allUsers = await this.userService.getAllUsers();

    const rows: UserRow[] = [];
    for (const u of allUsers) {
      let completedQuizzes = 0;
      try {
        const results = await firstValueFrom(this.quizResultsService.getUserResults(u.uid));
        completedQuizzes = results.filter(r => r.status === 'completed').length;
      } catch {}

      const membershipType = u.isAdmin ? 'Admin' : u.isMember ? 'Member' : 'Guest';

      rows.push({
        uid: u.uid,
        displayName: u.displayName ?? '',
        email: u.email ?? '',
        lastLoginAt: u.lastLoginAt ?? u.createdAt,
        membershipType,
        completedQuizzes,
        raw: u
      });
    }

    this.users = rows;
    this.applyFilter();
    this.loading = false;
    this.cdr.detectChanges();
  }

  applyFilter() {
    const term = this.searchText.toLowerCase().trim();
    let result = this.users;
    if (term) {
      result = result.filter(u =>
        u.displayName.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
      );
    }
    this.filteredUsers = this.applySorting(result);
  }

  sortBy(key: SortKey) {
    if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortKey = key;
      this.sortAsc = true;
    }
    this.isSorted = true;
    this.applyFilter();
  }

  clearSort() {
    this.sortKey = 'displayName';
    this.sortAsc = true;
    this.isSorted = false;
    this.applyFilter();
  }

  getSortIcon(key: SortKey): string {
    if (this.sortKey !== key) return 'pi-sort-alt';
    return this.sortAsc ? 'pi-sort-amount-up' : 'pi-sort-amount-down';
  }

  private applySorting(rows: UserRow[]): UserRow[] {
    const dir = this.sortAsc ? 1 : -1;
    return [...rows].sort((a, b) => {
      const key = this.sortKey;
      if (key === 'displayName' || key === 'membershipType') {
        return dir * (a[key] as string).localeCompare(b[key] as string);
      }
      if (key === 'lastLoginAt') {
        return dir * (this.toTimestamp(a.lastLoginAt) - this.toTimestamp(b.lastLoginAt));
      }
      return dir * ((a[key] as number) - (b[key] as number));
    });
  }

  private toTimestamp(d: any): number {
    if (!d) return 0;
    if (d?.toDate) return d.toDate().getTime();
    if (d?.seconds) return d.seconds * 1000;
    if (d instanceof Date) return d.getTime();
    return new Date(d).getTime() || 0;
  }

  highlightRow(user: UserRow) {
    this.selectedUser = user;
  }

  openDetail(user: UserRow) {
    this.detailUser = user.raw;
    this.showDetail = true;
  }

  formatDate(d: any): string {
    if (!d) return '—';
    const date = d?.toDate?.() ?? (d?.seconds ? new Date(d.seconds * 1000) : new Date(d));
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
}
