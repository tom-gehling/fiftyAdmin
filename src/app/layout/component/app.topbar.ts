import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { StyleClassModule } from 'primeng/styleclass';

import { AppConfigurator } from './app.configurator';
import { LayoutService } from '../service/layout.service';
import { AuthService } from '@/shared/services/auth.service';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        StyleClassModule,
        MenuModule,
        AppConfigurator
    ],
    template: `
        <div class="layout-topbar">
            <!-- Left: Logo + menu toggle -->
            <div class="layout-topbar-logo-container">
                <button 
                    class="layout-menu-button layout-topbar-action" 
                    (click)="layoutService.onMenuToggle()">
                    <i class="pi pi-bars"></i>
                </button>

                
                <a class="flex items-center space-x-2 p-2" routerLink="/">
                    <img 
                        src="assets/logos/logo.png"
                        alt="My Logo"
                        class="h-8 sm:h-10 md:h-12 lg:h-14 w-auto object-contain"
                        [style.filter]="layoutService.isDarkTheme() ? 'invert(0)' : 'invert(1)'"
                        />
                </a>
            </div>

            <!-- Right: Actions -->
            <div class="layout-topbar-actions">
                <!-- Dark mode toggle + Configurator -->
                <div class="layout-config-menu flex items-center gap-2">
                    <button 
                        type="button" 
                        class="layout-topbar-action" 
                        (click)="toggleDarkMode()">
                        <i 
                            class="pi"
                            [ngClass]="{
                                'pi-moon': layoutService.isDarkTheme(),
                                'pi-sun': !layoutService.isDarkTheme()
                            }">
                        </i>
                    </button>

                    <div class="relative">
                        <button
                            type="button"
                            class="layout-topbar-action layout-topbar-action-highlight"
                            pStyleClass="@next"
                            enterFromClass="hidden"
                            enterActiveClass="animate-scalein"
                            leaveToClass="hidden"
                            leaveActiveClass="animate-fadeout"
                            [hideOnOutsideClick]="true">
                            <i class="pi pi-palette"></i>
                        </button>
                        <app-configurator />
                    </div>
                </div>

                <!-- Profile dropdown -->
                <p-menu #profileMenu [popup]="true" [model]="profileItems"></p-menu>
                <button 
                    type="button" 
                    class="layout-topbar-action flex items-center gap-2" 
                    (click)="profileMenu.toggle($event)">
                    <i class="pi pi-user"></i>
                    <span>Profile</span>
                </button>
            </div>
        </div>
    `
})
export class AppTopbar {
    profileItems: MenuItem[] = [];

    constructor(
        public layoutService: LayoutService,
        private authService: AuthService,
        private router: Router
    ) {}

    ngOnInit() {
        this.profileItems = [
            {
                label: 'Update Profile',
                icon: 'pi pi-user-edit',
                command: () => this.router.navigate(['/profile'])
            },
            {
                label: 'Logout',
                icon: 'pi pi-sign-out',
                command: () => {
                    this.authService.logout();
                    this.router.navigate(['/auth/login']);
                }
            }
        ];
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({
            ...state,
            darkTheme: !state.darkTheme
        }));
    }
}
