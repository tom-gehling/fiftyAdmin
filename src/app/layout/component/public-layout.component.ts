import { Component } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AppTopbar } from './app.topbar';

@Component({
    selector: 'app-public-layout',
    standalone: true,
    imports: [AppTopbar, RouterOutlet],
    template: `
        <div class="flex flex-col min-h-screen">
            <app-topbar [showMenuToggle]="false" [bgColor]="topbarColor" />
            <router-outlet />
        </div>
    `,
})
export class PublicLayout {
    topbarColor = 'var(--fifty-green)';

    constructor(private router: Router, private activatedRoute: ActivatedRoute) {
        this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
            this.topbarColor = this.resolveTopbarColor(this.activatedRoute.snapshot);
        });
    }

    private resolveTopbarColor(snapshot: ActivatedRouteSnapshot): string {
        let route = snapshot;
        while (route.firstChild) route = route.firstChild;
        const token = route.data['topbarColor'] ?? route.parent?.data['topbarColor'];
        return token === 'black' ? 'var(--p-surface-900)' : 'var(--fifty-green)';
    }
}
