import { Component, EventEmitter, Output } from '@angular/core';
import { MENU_ITEMS } from '../../shared/config/menu.config';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { slideFromLeft } from '../../shared/animations/routerTransition';
import { MatExpansionModule } from '@angular/material/expansion';

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

    onLinkClick() {
        this.linkClick.emit();
    }
}
