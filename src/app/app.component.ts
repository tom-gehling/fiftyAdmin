import { Component } from '@angular/core';
import { RouterOutlet} from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { slideFromLeft } from './shared/animations/routerTransition';
import { MENU_ITEMS } from './shared/config/menu.config';
import { AppMenuItem } from './shared/config/menu.config';
import { SideMenuComponent } from './layout/side-menu/side-menu.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    SideMenuComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  animations: [slideFromLeft()]
})
export class AppComponent {
  opened = true;
  menuItems: AppMenuItem[] = MENU_ITEMS;

  toggleSidebar() {
    this.opened = !this.opened;
  }

  closeIfOver() {
    if (window.innerWidth < 768) {
      this.opened = false;
    }
  }

  prepareRoute(outlet: RouterOutlet) {
    return outlet && outlet.activatedRouteData && outlet.activatedRouteData['animation'];
  }
}
