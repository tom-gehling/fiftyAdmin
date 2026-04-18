import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AppFloatingConfigurator } from '../../../layout/component/app.floatingconfigurator';

@Component({
    selector: 'app-join-success',
    standalone: true,
    imports: [ButtonModule, AppFloatingConfigurator],
    template: `
        <app-floating-configurator />
        <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
            <div class="flex flex-col items-center justify-center">
                <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20 text-center" style="border-radius: 53px; max-width: 480px">
                        <div class="mb-6">
                            <i class="pi pi-check-circle text-primary" style="font-size: 4rem"></i>
                        </div>

                        <h1 class="text-surface-900 dark:text-surface-0 text-3xl font-bold mb-4">Welcome to Fifty+!</h1>

                        <p class="text-surface-600 dark:text-surface-400 text-base mb-2">Your subscription is confirmed.</p>
                        <p class="text-surface-500 dark:text-surface-500 text-sm mb-8">
                            Your account will be activated within a few seconds. Head back to start exploring all the exclusive content.
                        </p>

                        <p-button label="Let's Go!" icon="pi pi-arrow-right" iconPos="right" styleClass="w-full" (click)="router.navigate([returnUrl])"></p-button>
                    </div>
                </div>
            </div>
        </div>
    `,
})
export class JoinSuccessPage implements OnInit {
    returnUrl = '/fiftyPlus';

    constructor(
        public router: Router,
        private route: ActivatedRoute
    ) {}

    ngOnInit() {
        this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/fiftyPlus';
    }
}
