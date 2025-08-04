import { Component, EventEmitter, inject, Output } from '@angular/core';
import { MENU_ITEMS } from '../../shared/config/menu.config';
import {
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Router,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { slideFromLeft } from '../../shared/animations/routerTransition';
import { MatExpansionModule } from '@angular/material/expansion';
import { AuthService } from '../../shared/services/auth.service';

@Component({
    selector: 'side-menu',
    standalone: true,
    imports: [
        RouterLink,
        RouterLinkActive,
        CommonModule,
        MatSidenavModule,
        MatToolbarModule,
        MatListModule,
        MatIconModule,
        MatButtonModule,
        MatExpansionModule,
    ],
    templateUrl: './side-menu.component.html',
    styleUrls: ['./side-menu.component.css'],
})
export class SideMenuComponent {
    menuItems = MENU_ITEMS.filter((item) => item.shownInMenu);

    @Output() linkClick = new EventEmitter<void>();

    private authService = inject(AuthService);
    private router = inject(Router);

    user$ = this.authService.user$;

    onLinkClick() {
        this.linkClick.emit();
    }

    async login() {
        // For demo, simple email/password prompt - replace with real login UI
        const email = prompt('Email:');
        const password = prompt('Password:');
        if (email && password) {
            try {
                await this.authService.loginEmailPassword(email, password);
                alert('Logged in!');
            } catch (error) {
                alert('Login failed: ' + (error as Error).message);
            }
        }
    }

    async logout() {
        await this.authService.logout();
        alert('Logged out (now anonymous)');
        this.router.navigate(['/']); // optional redirect
    }
}
