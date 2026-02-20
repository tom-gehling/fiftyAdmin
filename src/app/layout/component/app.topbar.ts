import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { StyleClassModule } from 'primeng/styleclass';
import { MenuModule } from 'primeng/menu';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MenuItem } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

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
    <div class="layout-topbar flex items-center p-2 fiftyBorderBottom relative" >

  <!-- Left: Menu toggle -->
  <div class="flex items-center space-x-2">
    <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
      <i class="pi pi-bars"></i>
    </button>
  </div>

  <!-- Center: Logo -->
  <div class="absolute left-1/2 transform -translate-x-1/2 flex items-center">
    <a class="flex items-center" routerLink="/">
      <img [src]="(isAdmin$ | async) ? 'assets/logos/fiftyAdminLogo.png' : 'assets/logos/fiftyplus.png'" alt="Logo"
        class="h-8 sm:h-10 md:h-12 lg:h-14 w-auto object-contain"
      >
    </a>
  </div>

  <!-- Right: Actions -->
  <div class="ml-auto flex items-center gap-2">
    <!-- Dark Mode Toggle -->

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
  isAdmin$!: Observable<boolean>;

  selectedMembership: MembershipTier = MembershipTier.Fifty; // default selection

  constructor(
    public layoutService: LayoutService,
    private authService: AuthService,
    private router: Router,
    private membershipService: MembershipService
  ) {
    this.isAdmin$ = this.authService.isAdmin$;
  }

  ngOnInit(): void {
    // Update selection from service
    this.membershipService.membership$.subscribe(level => this.selectedMembership = level);

    this.profileItems = [
      { label: 'Update Profile', icon: 'pi pi-user-edit', command: () => this.router.navigate(['/fiftyPlus/profile']) },
      { label: 'Logout', icon: 'pi pi-sign-out', command: () => { this.authService.logout(); this.router.navigate(['/login']); } }
    ];
  }

  toggleDarkMode(): void {
    this.layoutService.layoutConfig.update(state => ({ ...state, darkTheme: !state.darkTheme }));
  }

  onMembershipChange(level: MembershipTier): void {
    this.membershipService.setMembership(level);
  }
}
