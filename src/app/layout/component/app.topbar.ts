import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { StyleClassModule } from 'primeng/styleclass';
import { MenuModule } from 'primeng/menu';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MenuItem } from 'primeng/api';
import { FormsModule } from '@angular/forms';

import { AppConfigurator } from './app.configurator';
import { LayoutService } from '../service/layout.service';
import { AuthService } from '@/shared/services/auth.service';
import { MembershipService, MembershipTier } from '@/shared/services/membership.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    StyleClassModule,
    MenuModule,
    ButtonModule,
    SelectButtonModule,
    AppConfigurator,
    FormsModule
  ],
  template: `
    <div class="layout-topbar flex justify-between items-center p-2 fiftyBorderBottom">

      <!-- Left: Logo + Menu Toggle -->
      <div class="flex items-center space-x-2">
        <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
          <i class="pi pi-bars"></i>
        </button>
        <a class="flex items-center" routerLink="/">
          <img src="assets/logos/logo.png" alt="Logo" class="h-8 sm:h-10 md:h-12 lg:h-14 w-auto object-contain"
               [style.filter]="layoutService.isDarkTheme() ? 'invert(0)' : 'invert(1)'">
        </a>
      </div>

      <!-- Right: Actions -->
      <div class="flex items-center gap-2">

        <!-- Dark Mode Toggle -->
        <button type="button" class="layout-topbar-action" (click)="toggleDarkMode()">
          <i class="pi" [ngClass]="{'pi-moon': layoutService.isDarkTheme(), 'pi-sun': !layoutService.isDarkTheme()}"></i>
        </button>

        <!-- Configurator -->
        <!-- <div class="relative">
          <button type="button" class="layout-topbar-action layout-topbar-action-highlight" pStyleClass="@next"
                  enterFromClass="hidden" enterActiveClass="animate-scalein"
                  leaveToClass="hidden" leaveActiveClass="animate-fadeout" [hideOnOutsideClick]="true">
            <i class="pi pi-palette"></i>
          </button>
          <app-configurator></app-configurator>
        </div> -->

        <!-- Membership Single-Select -->
        <p-selectButton 
          [options]="membershipOptions" 
          [(ngModel)]="selectedMembership" 
          optionLabel="label" 
          optionValue="value"
          (onChange)="onMembershipChange($event.value)"
        ></p-selectButton>

        <!-- Profile Menu -->
        <p-menu #profileMenu [popup]="true" [model]="profileItems"></p-menu>
        <button type="button" class="layout-topbar-action flex items-center gap-2" (click)="profileMenu.toggle($event)">
          <i class="pi pi-user"></i>
          <span>Profile</span>
        </button>

      </div>
    </div>
  `
})
export class AppTopbar implements OnInit {
  profileItems: MenuItem[] = [];

  membershipOptions = [
    { label: 'Basic', value: MembershipTier.Fifty },
    { label: 'Premium', value: MembershipTier.FiftyGold },
    // { label: 'Admin', value: MembershipTier.Admin }
  ];
  selectedMembership: MembershipTier = MembershipTier.Fifty; // default selection

  constructor(
    public layoutService: LayoutService,
    private authService: AuthService,
    private router: Router,
    private membershipService: MembershipService
  ) {}

  ngOnInit(): void {
    // Update selection from service
    this.membershipService.membership$.subscribe(level => this.selectedMembership = level);

    this.profileItems = [
      { label: 'Update Profile', icon: 'pi pi-user-edit', command: () => this.router.navigate(['/profile']) },
      { label: 'Logout', icon: 'pi pi-sign-out', command: () => { this.authService.logout(); this.router.navigate(['/auth/login']); } }
    ];
  }

  toggleDarkMode(): void {
    this.layoutService.layoutConfig.update(state => ({ ...state, darkTheme: !state.darkTheme }));
  }

  onMembershipChange(level: MembershipTier): void {
    this.membershipService.setMembership(level);
  }
}
