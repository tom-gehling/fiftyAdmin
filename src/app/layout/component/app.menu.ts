import { Component, OnInit } from '@angular/core';
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
export class AppMenu implements OnInit {
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
            items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/fiftyPlus'] }]
        };

        // Admin section
        const adminMenu: MenuItem = {
            label: 'Admin',
            items: [
                {
                    label: 'Stats',
                    icon: 'pi pi-fw pi-chart-line',
                    items: [
                        { label: 'Total Stats', icon: 'pi pi-fw pi-chart-bar', routerLink: ['/fiftyPlus/admin/stats/total'] },
                        { label: 'Weekly Stats', icon: 'pi pi-fw pi-chart-line', routerLink: ['/fiftyPlus/admin/stats/weekly'] }
                    ]
                },
                { label: 'Quizzes', icon: 'pi pi-fw pi-question-circle', routerLink: ['/fiftyPlus/admin/quizzes'] },
                { label: 'Quiz Tags', icon: 'pi pi-fw pi-tags', routerLink: ['/fiftyPlus/admin/quizTags'] },
                { label: 'Users', icon: 'pi pi-fw pi-users', routerLink: ['/fiftyPlus/admin/users'] },
                { label: 'Forms', icon: 'pi pi-fw pi-file-edit', routerLink: ['/fiftyPlus/admin/submissionForms'] }
            ]
        };

        // Fifty+ section (all fiftyPlus/admin)
        const fiftyPlusMenu: MenuItem = {
            label: 'Fifty+',
            items: [
                { label: 'Archives', icon: 'pi pi-fw pi-book', routerLink: ['/fiftyPlus/archives'] },
                { label: 'Exclusives', icon: 'pi pi-fw pi-star', routerLink: ['/fiftyPlus/exclusives'] },
                { label: 'Collaborations', icon: 'pi pi-fw pi-users', routerLink: ['/fiftyPlus/collabs'] },
                { label: 'Question Quizzes', icon: 'pi pi-fw pi-list', routerLink: ['/fiftyPlus/questionQuizzes'] }
            ]
        };

        // Build model dynamically
        this.model = [homeMenu];

        if (isAdmin) this.model.push(adminMenu);
        if (isMember || isAdmin) this.model.push(fiftyPlusMenu);
    }
}
