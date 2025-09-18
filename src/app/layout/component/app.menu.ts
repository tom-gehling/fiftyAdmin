import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '@/shared/services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul>`
})
export class AppMenu {
    model: MenuItem[] = [];

    constructor(private auth: AuthService) {}

    ngOnInit() {
        // Update menu whenever user or member/admin status changes
        this.auth.user$.pipe(filter(u => u !== undefined)).subscribe(() => this.buildMenu());
        this.auth.isMember$.subscribe(() => this.buildMenu());
        this.auth.isAdmin$.subscribe(() => this.buildMenu());
    }

    buildMenu() {
        const isAdmin = this.auth.isAdmin$.value;
        const isMember = this.auth.isMember$.value;

        // Home / Dashboard
        const homeMenu: MenuItem = {
            label: 'Home',
            items: [
                { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/members'] }
            ]
        };

        // Admin (only if admin)
        const adminMenu: MenuItem = {
            label: 'Admin',
            items: [
                { label: 'Quizzes', icon: 'pi pi-fw pi-question-circle', routerLink: ['/members/admin/quizzes'] }
            ]
        };

        // Fifty+ section
        const fiftyPlusMenu: MenuItem = {
            label: 'Fifty+',
            items: [
                { label: 'Archives', icon: 'pi pi-fw pi-book', routerLink: ['/members/archives'] },
                { label: 'Exclusives', icon: 'pi pi-fw pi-star', routerLink: ['/members/exclusives'] },
                { label: 'Question Quizzes', icon: 'pi pi-fw pi-list', routerLink: ['/members/questionQuizzes'] }
            ]
        };

        // UI Components
        const uiComponents: MenuItem = {
            label: 'UI Components',
            icon: 'pi pi-fw pi-desktop',
            items: [
                { label: 'Components', icon: 'pi pi-fw pi-id-card', items: [
                    { label: 'Form Layout', icon: 'pi pi-fw pi-id-card', routerLink: ['/uikit/formlayout'] },
                    { label: 'Input', icon: 'pi pi-fw pi-check-square', routerLink: ['/uikit/input'] },
                    { label: 'Button', icon: 'pi pi-fw pi-mobile', routerLink: ['/uikit/button'] },
                    { label: 'Table', icon: 'pi pi-fw pi-table', routerLink: ['/uikit/table'] },
                    { label: 'List', icon: 'pi pi-fw pi-list', routerLink: ['/uikit/list'] },
                    { label: 'Tree', icon: 'pi pi-fw pi-share-alt', routerLink: ['/uikit/tree'] },
                    { label: 'Panel', icon: 'pi pi-fw pi-tablet', routerLink: ['/uikit/panel'] },
                    { label: 'Overlay', icon: 'pi pi-fw pi-clone', routerLink: ['/uikit/overlay'] },
                    { label: 'Media', icon: 'pi pi-fw pi-image', routerLink: ['/uikit/media'] },
                    { label: 'Menu', icon: 'pi pi-fw pi-bars', routerLink: ['/uikit/menu'] },
                    { label: 'Message', icon: 'pi pi-fw pi-comment', routerLink: ['/uikit/message'] },
                    { label: 'File', icon: 'pi pi-fw pi-file', routerLink: ['/uikit/file'] },
                    { label: 'Chart', icon: 'pi pi-fw pi-chart-bar', routerLink: ['/uikit/charts'] },
                    { label: 'Timeline', icon: 'pi pi-fw pi-calendar', routerLink: ['/uikit/timeline'] },
                    { label: 'Misc', icon: 'pi pi-fw pi-circle', routerLink: ['/uikit/misc'] }
                ]}
            ]
        };

        // Build the menu
        this.model = [homeMenu];

        if (isAdmin) {
            this.model.push(adminMenu);
        }

        if (isMember || isAdmin) {
            this.model.push(fiftyPlusMenu, uiComponents);
        } else {
            // Public / Not logged in
            this.model.push(
                { label: 'Landing', icon: 'pi pi-fw pi-globe', routerLink: ['/landing'] },
                { label: 'Login', icon: 'pi pi-fw pi-sign-in', routerLink: ['/auth/login'] }
            );
        }
    }
}
