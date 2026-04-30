import { Component } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AppTopbar } from './app.topbar';

@Component({
    selector: 'app-public-layout',
    standalone: true,
    imports: [AppTopbar, RouterOutlet],
    template: `
        <div class="flex flex-col" [class.min-h-screen]="!isEmbedded">
            @if (!isEmbedded) {
                <app-topbar [showMenuToggle]="false" [bgColor]="topbarColor" />
            }
            <router-outlet />
        </div>
    `,
})
export class PublicLayout {
    topbarColor = 'var(--fifty-green)';
    isEmbedded = false;

    constructor(
        private router: Router,
        private activatedRoute: ActivatedRoute
    ) {
        this.resolveLayoutState(this.activatedRoute.snapshot);
        this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
            this.resolveLayoutState(this.activatedRoute.snapshot);
        });
    }

    private resolveLayoutState(snapshot: ActivatedRouteSnapshot): void {
        let route = snapshot;
        while (route.firstChild) route = route.firstChild;
        const token = route.data['topbarColor'] ?? route.parent?.data['topbarColor'];
        this.topbarColor = token === 'black' ? 'var(--p-surface-900)' : 'var(--fifty-green)';

        const embeddable = route.data['embeddable'] === true;
        const embedParam = route.queryParamMap.get('embed') === 'true';
        this.isEmbedded = embeddable && embedParam;
    }
}
