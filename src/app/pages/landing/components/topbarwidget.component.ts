import { Component } from '@angular/core';
import { StyleClassModule } from 'primeng/styleclass';
import { Router, RouterModule } from '@angular/router';
import { RippleModule } from 'primeng/ripple';
import { ButtonModule } from 'primeng/button';
import {AppFloatingConfigurator} from "@/layout/component/app.floatingconfigurator";

@Component({
    selector: 'topbar-widget',
    imports: [RouterModule, StyleClassModule, ButtonModule, RippleModule, AppFloatingConfigurator],
    template: `<a class="flex items-center" href="#">
            <a class="layout-topbar-logo" routerLink="/">
                    <img 
                        src="assets/logos/logo.png"
                        alt="My Logo"
                        class="h-8"
                        >
                </a>
        </a>

        <a pButton [text]="true" severity="secondary" [rounded]="true" pRipple class="lg:hidden!" pStyleClass="@next" enterFromClass="hidden" leaveToClass="hidden" [hideOnOutsideClick]="true">
            <i class="pi pi-bars text-2xl!"></i>
        </a>

        <div class="items-center bg-surface-0 dark:bg-surface-900 grow justify-between hidden lg:flex absolute lg:static w-full left-0 top-full px-12 lg:px-0 z-20 rounded-border">
            <ul class="list-none p-0 m-0 flex lg:items-center select-none flex-col lg:flex-row cursor-pointer gap-8">
                <li>
                    <a (click)="router.navigate(['/landing'], { fragment: 'home' })" pRipple class="px-0 py-4 text-surface-900 dark:text-surface-0 font-medium text-xl">
                        <span>Home</span>
                    </a>
                </li>
                <li>
                    <a (click)="router.navigate(['/landing'], { fragment: 'features' })" pRipple class="px-0 py-4 text-surface-900 dark:text-surface-0 font-medium text-xl">
                        <span>The Fifty</span>
                    </a>
                </li>
                <li>
                    <a (click)="router.navigate(['/landing'], { fragment: 'highlights' })" pRipple class="px-0 py-4 text-surface-900 dark:text-surface-0 font-medium text-xl">
                        <span>Shop</span>
                    </a>
                </li>
                <li>
                    <a (click)="router.navigate(['/landing'], { fragment: 'pricing' })" pRipple class="px-0 py-4 text-surface-900 dark:text-surface-0 font-medium text-xl">
                        <span>Contact Us</span>
                    </a>
                </li>
            </ul>
            <div class="flex border-t lg:border-t-0 border-surface py-4 lg:py-0 mt-4 lg:mt-0 gap-2">
                <button pButton pRipple label="Login" routerLink="/auth/login" [rounded]="true" ></button>
                <!-- <button pButton pRipple label="Register" routerLink="/auth/login" [rounded]="true"></button> -->
                <!-- <app-floating-configurator [float]="false"/> -->
            </div>
        </div> `
})
export class TopbarWidget {
    constructor(public router: Router) {}
}
