import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ChipModule } from 'primeng/chip';
import { AvatarModule } from 'primeng/avatar';

import { UserSearchService } from '@/shared/services/user-search.service';
import { AppUser } from '@/shared/models/user.model';
import { TaggedUser } from '@/shared/models/quizSubmission.model';

@Component({
  selector: 'app-user-tag-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AutoCompleteModule,
    ChipModule,
    AvatarModule
  ],
  template: `
    <div class="flex flex-col gap-2">
      <!-- Selected Users as Chips -->
      <div *ngIf="selectedUsers.length > 0" class="flex flex-wrap gap-2 mb-2">
        <p-chip
          *ngFor="let user of selectedUsers; let i = index"
          [removable]="true"
          (onRemove)="removeUser(i)"
        >
          <div class="flex items-center gap-2">
            <p-avatar
              *ngIf="user.photoUrl"
              [image]="user.photoUrl"
              shape="circle"
              class="w-6 h-6 text-xs"
            ></p-avatar>
            <p-avatar
              *ngIf="!user.photoUrl"
              [label]="getInitials(user.displayName)"
              shape="circle"
              class="w-6 h-6 text-xs"
            ></p-avatar>
            <span>{{ user.displayName || user.uid }}</span>
          </div>
        </p-chip>
      </div>

      <!-- Autocomplete Search -->
      <p-autoComplete
        [(ngModel)]="searchQuery"
        [suggestions]="filteredUsers"
        (completeMethod)="searchUsers($event)"
        (onSelect)="selectUser($event)"
        [placeholder]="placeholder"
        field="displayName"
        [showEmptyMessage]="true"
        emptyMessage="No users found"
        [minLength]="1"
        class="w-full"
      >
        <ng-template let-user pTemplate="item">
          <div class="flex items-center gap-3 p-2">
            <p-avatar
              *ngIf="user.photoUrl"
              [image]="user.photoUrl"
              shape="circle"
              size="normal"
            ></p-avatar>
            <p-avatar
              *ngIf="!user.photoUrl"
              [label]="getInitials(user.displayName)"
              shape="circle"
              size="normal"
              class="bg-primary text-white"
            ></p-avatar>
            <div class="flex flex-col">
              <span class="font-semibold">{{ user.displayName || 'Unknown' }}</span>
              <span class="text-sm text-gray-500">{{ user.email }}</span>
            </div>
          </div>
        </ng-template>
      </p-autoComplete>

      <!-- Suggested Users -->
      <div *ngIf="showSuggestions && suggestedUsers.length > 0 && selectedUsers.length === 0" class="mt-2">
        <span class="text-sm text-gray-500 mb-1 block">Suggested:</span>
        <div class="flex flex-wrap gap-2">
          <p-chip
            *ngFor="let user of suggestedUsers"
            (click)="selectSuggestedUser(user)"
            class="cursor-pointer hover:bg-surface-100"
          >
            <div class="flex items-center gap-1">
              <p-avatar
                *ngIf="user.photoUrl"
                [image]="user.photoUrl"
                shape="circle"
                class="w-6 h-6 text-xs"
              ></p-avatar>
              <span>{{ user.displayName }}</span>
            </div>
          </p-chip>
        </div>
      </div>
    </div>
  `
})
export class UserTagSelectorComponent implements OnInit {
  @Input() placeholder = 'Search for teammates...';
  @Input() showSuggestions = true;
  @Input() maxUsers = 10;
  @Input() selectedUsers: TaggedUser[] = [];

  @Output() selectedUsersChange = new EventEmitter<TaggedUser[]>();

  searchQuery = '';
  filteredUsers: AppUser[] = [];
  suggestedUsers: AppUser[] = [];

  constructor(private userSearchService: UserSearchService) {}

  ngOnInit(): void {
    if (this.showSuggestions) {
      this.loadSuggestions();
    }
  }

  private loadSuggestions(): void {
    this.userSearchService.getSuggestedUsers(5).subscribe(users => {
      this.suggestedUsers = users;
    });
  }

  searchUsers(event: AutoCompleteCompleteEvent): void {
    const query = event.query;
    this.userSearchService.searchFollowersFollowing(query, 10).subscribe(users => {
      // Filter out already selected users
      const selectedUids = new Set(this.selectedUsers.map(u => u.uid));
      this.filteredUsers = users.filter(u => !selectedUids.has(u.uid!));
    });
  }

  selectUser(event: any): void {
    const user: AppUser = event.value || event;
    if (this.selectedUsers.length >= this.maxUsers) {
      return;
    }

    const alreadySelected = this.selectedUsers.some(u => u.uid === user.uid);
    if (!alreadySelected && user.uid) {
      const taggedUser: TaggedUser = {
        uid: user.uid,
        displayName: user.displayName || 'Unknown',
        photoUrl: user.photoUrl || undefined
      };
      this.selectedUsers = [...this.selectedUsers, taggedUser];
      this.selectedUsersChange.emit(this.selectedUsers);
    }

    // Clear search
    this.searchQuery = '';
  }

  selectSuggestedUser(user: AppUser): void {
    this.selectUser(user);
  }

  removeUser(index: number): void {
    this.selectedUsers = this.selectedUsers.filter((_, i) => i !== index);
    this.selectedUsersChange.emit(this.selectedUsers);
  }

  getInitials(name: string | null): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
