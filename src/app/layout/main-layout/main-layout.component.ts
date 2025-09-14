import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatRippleModule } from '@angular/material/core';
import { slideFromLeft } from '../../shared/animations/routerTransition';
import { MENU_ITEMS, AppMenuItem } from '../../shared/config/menu.config';
import { SideMenuComponent } from '../side-menu/side-menu.component';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    SideMenuComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css'],
  animations: [slideFromLeft()],
})
export class MainLayoutComponent {
  opened = true;
  menuItems: AppMenuItem[] = MENU_ITEMS;

  displayName: string | null = null;
  email: string | null = null;

  constructor(private router: Router, private auth: AuthService) {
    this.auth.user$.subscribe(user => {
      if (user) {
        this.displayName = user.displayName || null;
        this.email = user.email || null;
      }
    });
  }

  toggleSidebar() {
    this.opened = !this.opened;
  }

  closeIfOver() {
    if (window.innerWidth < 768) {
      this.opened = false;
    }
  }

  prepareRoute(outlet: RouterOutlet) {
    return outlet?.activatedRouteData?.['animation'];
  }

  goToAccount() {
    this.router.navigate(['/account']);
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
