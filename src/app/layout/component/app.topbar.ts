import { Component, Input, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

import { LayoutService } from '../service/layout.service';
import { AuthService } from '@/shared/services/auth.service';
import { AuthModalService } from '@/shared/services/auth-modal.service';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [CommonModule, AsyncPipe, RouterModule, MenuModule, ButtonModule],
    template: `<div class="layout-topbar flex items-center p-2 fiftyBorderBottom relative" [style.background-color]="bgColor || null">
            @if (showMenuToggle) {
                <div class="flex items-center">
                    <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
                        <i class="pi pi-bars"></i>
                    </button>
                </div>
            

            <div class="absolute left-1/2 transform -translate-x-1/2 flex items-center">
                <a class="flex items-center" routerLink="/">
                    <img [src]="(auth.isAdmin$ | async) ? 'assets/logos/fiftyAdminLogo.png' : 'assets/logos/fiftyplus.png'" alt="Logo" class="h-8 sm:h-10 md:h-12 lg:h-14 w-auto object-contain" />
                </a>
            </div>
            } @else {
            <nav class="flex items-center gap-1 sm:gap-3">
                @for (link of publicNavLinks; track link.label) {
                    <a [routerLink]="link.route"
                       routerLinkActive
                       #rla="routerLinkActive"
                       [routerLinkActiveOptions]="{ exact: true }"
                       [class]="rla.isActive ? 'font-bold -translate-y-0.5 drop-shadow-sm px-8 gap-8 py-0.5 rounded-full bg-white/10' : 'font-medium hover:font-semibold hover:-translate-y-px'"
                       class="text-lg transition-all duration-150 no-underline"
                       style="color: var(--fifty-pink)">{{ link.label }}</a>
                }
            </nav>
            }

            <div class="ml-auto flex items-center gap-3">
                @if (auth.initialized$ | async) {
                    @if (!(auth.user$ | async) || (auth.user$ | async)?.isAnon) {
                        <p-button label="Sign In" [outlined]="false" size="large" (click)="authModal.open('login')"></p-button>
                    } @else {
                        @if (!(auth.isMember$ | async) && !(auth.isAdmin$ | async)) {
                            <p-button label="Become a Fifty+ Member" icon="pi pi-star" size="large" [outlined]="true" [routerLink]="['/join']" [queryParams]="{ returnUrl: router.url }"></p-button>
                        } @else if (auth.isMember$ | async) {
                            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-lg font-semibold" style="background: rgba(76,251,171,0.15); color: var(--primary-color); border: 1px solid var(--primary-color)">
                                <i class="pi pi-check-circle text-sm"></i> FIFTY+
                            </span>
                        }
                        <p-menu #profileMenu [popup]="true" [model]="profileItems"></p-menu>
                        <button type="button" class="flex items-center justify-center rounded-full font-bold text-sm cursor-pointer border-0" style="width: 36px; height: 36px; background: var(--primary-color); color: #1a1a1a; flex-shrink: 0" (click)="profileMenu.toggle($event)" [title]="(auth.user$ | async)?.displayName || ''">
                            {{ initials }}
                        </button>
                    }
                }
            </div>
        </div>`,
})
export class AppTopbar implements OnInit {
    @Input() showMenuToggle = true;
    @Input() bgColor = '';

    profileItems: MenuItem[] = [];

    readonly publicNavLinks = [
        { label: 'Home', route: '/home' },
        { label: 'The Fifty', route: '/weekly-quiz' },
        { label: 'Fifty+', route: '/join' },
        { label: 'Find a Venue', route: '/find-a-venue' },
        { label: 'Shop', route: '/fiftyshop' },
        { label: 'Contact Us', route: '/contact-us' },
    ];

    constructor(
        public layoutService: LayoutService,
        public auth: AuthService,
        public authModal: AuthModalService,
        public router: Router
    ) {}

    ngOnInit(): void {
        this.profileItems = [
            { label: 'Update Profile', icon: 'pi pi-user-edit', command: () => this.router.navigate(['/profile']) },
            { label: 'Logout', icon: 'pi pi-sign-out', command: () => this.auth.logout() },
        ];
    }

    get initials(): string {
        const u = this.auth.user$.value;
        return (u?.displayName ?? u?.email ?? '?').slice(0, 1).toUpperCase();
    }
}
