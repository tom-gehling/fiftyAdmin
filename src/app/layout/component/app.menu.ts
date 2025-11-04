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
    template: `
        <ul class="layout-menu">
            <ng-container *ngFor="let item of model; let i = index">
                <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
                <li *ngIf="item.separator" class="menu-separator"></li>
            </ng-container>
        </ul>
    `
})
export class AppMenu {
    model: MenuItem[] = [];

    constructor(private auth: AuthService) {}

    ngOnInit() {
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
            items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/members'] }]
        };

        // Admin section
        const adminMenu: MenuItem = {
            label: 'Admin',
            items: [
                { label: 'Quiz Stats', icon: 'pi pi-fw pi-chart-line', routerLink: ['/members/admin/stats'] },
                { label: 'Quizzes', icon: 'pi pi-fw pi-question-circle', routerLink: ['/members/admin/quizzes'] },
                { label: 'Quiz Tags', icon: 'pi pi-fw pi-tags', routerLink: ['/members/admin/quizTags'] }
            ]
        };

        // Fifty+ section (all members/admin)
        const fiftyPlusMenu: MenuItem = {
            label: 'Fifty+',
            items: [
                { label: 'Archives', icon: 'pi pi-fw pi-book', routerLink: ['/members/archives'] },
                { label: 'Exclusives', icon: 'pi pi-fw pi-star', routerLink: ['/members/exclusives'] },
                { label: 'Collaborations', icon: 'pi pi-fw pi-users', routerLink: ['/members/collabs'] },
                { label: 'Question Quizzes', icon: 'pi pi-fw pi-list', routerLink: ['/members/questionQuizzes'] }
            ]
        };

        // Build model dynamically
        this.model = [homeMenu];

        if (isAdmin) this.model.push(adminMenu);
        if (isMember || isAdmin) this.model.push(fiftyPlusMenu);
    }
}
