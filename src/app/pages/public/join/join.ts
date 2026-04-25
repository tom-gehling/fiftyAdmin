import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AuthService } from '@/shared/services/auth.service';
import { SubscriptionService } from '@/shared/services/subscription.service';
import type { Offering, Package } from '@revenuecat/purchases-js';
import { AppFloatingConfigurator } from '../../../layout/component/app.floatingconfigurator';
import { Subscription } from 'rxjs';

// Stripe (deprecated — replaced by RevenueCat Web Billing)
// import { injectStripe, StripeElementsDirective, StripePaymentElementComponent } from 'ngx-stripe';
// import type { Appearance, StripeElementsOptionsClientSecret, StripeElements } from '@stripe/stripe-js';
// const PRICES = {
//     quarterly: { id: 'price_1TCsduH14haeupiArZVyTSg2', display: '$20 / quarter', savings: '' },
//     yearly: { id: 'price_1TCtR6H14haeupiAkV4e1aWH', display: '$40 / year', savings: 'Save $40 vs quarterly' },
// };

@Component({
    selector: 'app-join',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, DividerModule, SelectButtonModule, AppFloatingConfigurator],
    styles: [
        `
            .logo-bg {
                position: absolute;
                inset: 0;
                overflow: hidden;
                z-index: 0;
                display: flex;
                flex-direction: column;
                justify-content: space-around;
                padding: 16px 0;
                pointer-events: none;
            }
            .logo-scroll-row {
                overflow: hidden;
                height: 100px;
                display: flex;
                align-items: center;
            }
            .logo-scroll-inner {
                display: flex;
                animation: scroll-logos 70s linear infinite;
            }
            .logo-collage-img {
                height: 70px;
                width: auto;
                object-fit: contain;
                margin: 0 16px;
                opacity: 0.2;
                filter: grayscale(20%);
                flex-shrink: 0;
            }
            @keyframes scroll-logos {
                0% {
                    transform: translateX(0);
                }
                100% {
                    transform: translateX(-50%);
                }
            }
        `,
    ],
    template: `

        <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen overflow-hidden relative py-20">
            <!-- Scrolling logo collage background -->
            <div class="logo-bg">
                @for (row of logoRows; track row.delay) {
                    <div class="logo-scroll-row">
                        <div class="logo-scroll-inner" [style.animation-delay]="row.delay">
                            @for (logo of collageLogos; track $index) {
                                <img [src]="logo" class="logo-collage-img" alt="" draggable="false" />
                            }
                        </div>
                    </div>
                }
            </div>

            <div class="flex flex-col items-center justify-center relative" style="z-index: 1; width: 100%; max-width: 960px; padding: 0 16px;">
                <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%); width: 100%">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-12 px-8 sm:px-14" style="border-radius: 53px">

                        <!-- Logo -->
                        <div class="text-center mb-6">
                            <img src="/assets/logos/fiftyplus.png" alt="Fifty+" class="mx-auto mb-4" style="width: 100%; max-width: 500px !important; height: auto;" />
                            <h1 class="text-surface-900 dark:text-surface-0 text-xl lg:text-2xl font-semibold mb-1">Unlock the full Fifty+ experience</h1>
                            <p class="text-surface-500 dark:text-surface-400 text-xl lg:text-2xl">Join thousands of quiz enthusiasts with access to everything Fifty+ has to offer.</p>
                        </div>

                        <!-- Two-column layout on large screens -->
                        <div class="flex flex-col lg:flex-row lg:gap-8">

                            <!-- Benefits list -->
                            <ul class="list-none p-0 m-0 lg:flex-1 mb-6 lg:mb-0">
                                @for (benefit of benefits; track benefit.label) {
                                    <li class="flex items-center gap-3 py-2">
                                        <i [class]="benefit.icon + ' text-primary text-xl'"></i>
                                        <div>
                                            <span class="text-surface-900 dark:text-surface-0 font-medium">{{ benefit.label }}</span>
                                            <span class="text-surface-500 dark:text-surface-400 text-sm ml-2">{{ benefit.description }}</span>
                                        </div>
                                    </li>
                                }
                            </ul>

                            <div class="lg:hidden"><p-divider /></div>
                            <div class="hidden lg:flex mx-2"><p-divider layout="vertical" /></div>

                            <!-- Right side: login / billing / payment -->
                            <div class="lg:flex-1">

                        @if (!isLoggedIn) {
                            <!-- Not logged in — prompt to create account -->
                            <div class="text-center py-4">
                                <i class="pi pi-user text-4xl text-primary mb-4 block"></i>
                                <p class="text-surface-700 dark:text-surface-300 mb-6">Create a free account first, then subscribe to unlock Fifty+.</p>
                                <p-button label="Create Free Account" styleClass="w-full mb-3" (click)="router.navigate(['/login'], { queryParams: { register: 'true' } })"></p-button>
                                <p class="text-surface-500 text-lg mt-3">Already have an account? <a class="text-primary cursor-pointer" (click)="router.navigate(['/login'])">Sign in</a></p>
                            </div>
                        } @else {
                            <!-- Billing toggle + pricing card -->
                            <div class="mb-6">
                                <p class="text-surface-700 dark:text-surface-300 text-sm font-medium mb-3 text-center">Choose your billing period</p>
                                <p-select-button [(ngModel)]="billingPeriod" [options]="billingOptions" optionLabel="label" optionValue="value" styleClass="w-full" style="width:100%; height:100%;" />
                            </div>

                            <!-- Pricing card -->
                            <div class="border border-primary rounded-xl p-6 mb-6 text-center" style="border-width: 2px; border-color: var(--primary-color)">
                                <p class="text-surface-500 dark:text-surface-400 text-sm uppercase tracking-widest mb-2">Fifty+ Membership</p>
                                @if (currentPackage) {
                                    <p class="text-surface-900 dark:text-surface-0 text-4xl font-bold mb-1">{{ currentPriceDisplay }}</p>
                                    @if (savingsLabel) {
                                        <p class="text-primary text-sm font-medium mb-4">{{ savingsLabel }}</p>
                                    } @else {
                                        <p class="text-surface-400 text-sm mb-4">{{ billingPeriod === 'quarterly' ? 'Billed every 3 months' : 'Billed annually' }}</p>
                                    }
                                    <p-button label="Start 7 Day Free Trial" icon="pi pi-lock" styleClass="w-full mb-3" [loading]="loadingOfferings" (click)="openPurchaseDialog()"></p-button>
                                    <p class="text-surface-500 text-sm">Cancel anytime from your account settings</p>
                                } @else {
                                    <p class="text-surface-400 text-sm my-8">{{ loadingOfferings ? 'Loading pricing…' : 'No pricing available — please try again shortly.' }}</p>
                                }
                            </div>

                            @if (error) {
                                <p class="text-red-500 mt-4 text-center text-sm">{{ error }}</p>
                            }
                        }

                        <!-- Already a member link -->
                        @if (isLoggedIn) {
                            <div class="text-center mt-6">
                                <a class="text-surface-400 text-xl cursor-pointer hover:text-primary" (click)="manageBilling()">Already a member? Manage your subscription</a>
                            </div>
                        }

                            </div> <!-- /right column -->
                        </div> <!-- /two-column flex -->
                    </div>
                </div>
            </div>
        </div>

        <!-- RevenueCat embedded purchase flow -->
        <p-dialog
            [(visible)]="purchasing"
            [modal]="true"
            [dismissableMask]="false"
            [draggable]="false"
            [resizable]="false"
            appendTo="body"
            [style]="{ width: '520px', maxWidth: '95vw' }"
            [header]="dialogHeader"
            (onShow)="onDialogShow()"
            (onHide)="onDialogHide()">
            <div class="mb-3">
                <p class="text-surface-900 dark:text-surface-0 text-lg font-semibold mb-1">{{ currentPriceDisplay }}</p>
                <p class="text-surface-500 text-sm">{{ billingPeriod === 'quarterly' ? 'Billed every 3 months' : 'Billed annually' }} · Cancel anytime</p>
            </div>
            <div #rcPurchaseTarget id="rc-purchase-target" class="min-h-[200px]"></div>
            @if (error) {
                <p class="text-red-500 mt-4 text-sm">{{ error }}</p>
            }
        </p-dialog>
    `,
})
export class JoinPage implements OnInit, OnDestroy {
    readonly logos = [
        '/assets/logos/2010s-clear-1.png',
        '/assets/logos/EURO.png',
        '/assets/logos/HOTTEST-20%20(1).png',
        '/assets/logos/Movie.png',
        '/assets/logos/SA.png',
        '/assets/logos/Yearl-2023.png',
        '/assets/logos/archivesLogo.png',
        '/assets/logos/aussie.png',
        '/assets/logos/boomer.png',
        '/assets/logos/chrissy.png',
        '/assets/logos/fiftyAdminLogo.png',
        '/assets/logos/footy.png',
        '/assets/logos/logo.png',
        '/assets/logos/loser.png',
        '/assets/logos/movie2.png',
        '/assets/logos/olympic.png',
        '/assets/logos/people50.png',
        '/assets/logos/peoples.png',
        '/assets/logos/reality.png',
        '/assets/logos/specialsLogo.png',
        '/assets/logos/spooky.png',
        '/assets/logos/swifty%20(1).png',
        '/assets/logos/twf.png',
        '/assets/logos/weekly-hundred.png',
        '/assets/logos/yearly-22022.png',
        '/assets/logos/yeswequiz.png',
    ];
    readonly collageLogos = [...this.logos, ...this.logos];
    readonly logoRows = [{ delay: '0s' }, { delay: '-35s' }, { delay: '-17s' }, { delay: '-52s' }];

    readonly benefits = [
        { icon: 'pi pi-book', label: 'Full Quiz Archives', description: 'Every quiz ever we\'ve written, at your fingertips' },
        { icon: 'pi pi-star', label: 'Exclusive Fifty+ Quizzes', description: 'Premium quizzes only for members' },
        { icon: 'pi pi-users', label: 'Collaboration Quizzes', description: 'All of our special events and content' },
        { icon: 'pi pi-chart-bar', label: 'Peronalised Stats', description: 'Track your quiz performance over time' },
        { icon: 'pi pi-question-circle', label: 'Daily Puzzles', description: 'For those who want more challenges' },
    ];

    readonly billingOptions = [
        { label: 'Quarterly', value: 'quarterly' },
        { label: 'Yearly', value: 'yearly' },
    ];

    billingPeriod: 'quarterly' | 'yearly' = 'quarterly';
    isLoggedIn = false;
    private userEmail: string | undefined;
    private userSub: Subscription | null = null;
    returnUrl = '/fiftyPlus';

    offering: Offering | null = null;
    loadingOfferings = false;
    purchasing = false;
    error: string | null = null;

    @ViewChild('rcPurchaseTarget') rcPurchaseTarget?: ElementRef<HTMLDivElement>;

    get currentPackage(): Package | null {
        if (!this.offering) return null;
        return this.billingPeriod === 'yearly' ? this.offering.annual : this.offering.threeMonth;
    }

    get currentPriceDisplay(): string {
        return this.currentPackage?.webBillingProduct.currentPrice.formattedPrice ?? '—';
    }

    get dialogHeader(): string {
        return 'Complete your Fifty+ membership';
    }

    get savingsLabel(): string {
        if (!this.offering || this.billingPeriod !== 'yearly') return '';
        const yearly = this.offering.annual?.webBillingProduct.currentPrice;
        const quarterly = this.offering.threeMonth?.webBillingProduct.currentPrice;
        if (!yearly || !quarterly) return '';
        const savedMicros = quarterly.amountMicros * 4 - yearly.amountMicros;
        if (savedMicros <= 0) return '';
        const formatted = new Intl.NumberFormat(undefined, { style: 'currency', currency: yearly.currency }).format(savedMicros / 1_000_000);
        return `Save ${formatted} vs quarterly`;
    }

    constructor(
        public router: Router,
        private route: ActivatedRoute,
        private auth: AuthService,
        private subscriptionService: SubscriptionService
    ) {}

    async ngOnInit() {
        this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/fiftyPlus';
        let offeringsLoaded = false;
        this.userSub = this.auth.user$.subscribe((user) => {
            this.isLoggedIn = !!user && !user.isAnon;
            this.userEmail = user?.email || undefined;
            // RevenueCat is only configured once a Firebase user resolves — fetch offerings then.
            if (this.isLoggedIn && !offeringsLoaded) {
                offeringsLoaded = true;
                this.loadOfferings();
            }
        });
    }

    ngOnDestroy() {
        this.userSub?.unsubscribe();
    }

    private async loadOfferings() {
        this.loadingOfferings = true;
        try {
            this.offering = await this.subscriptionService.getCurrentOffering();
        } catch (err: any) {
            console.error('[RevenueCat] failed to load offerings', err);
            this.error = 'Could not load pricing. Please try again.';
        } finally {
            this.loadingOfferings = false;
        }
    }

    openPurchaseDialog() {
        if (!this.currentPackage) return;
        this.error = null;
        this.purchasing = true;
    }

    async onDialogShow() {
        const pkg = this.currentPackage;
        if (!pkg) {
            this.purchasing = false;
            return;
        }

        // onShow can fire before ViewChild resolves — defer one tick, then fall back to a DOM query.
        await new Promise((r) => setTimeout(r, 0));
        const target = this.rcPurchaseTarget?.nativeElement ?? (document.getElementById('rc-purchase-target') as HTMLDivElement | null);

        if (!target) {
            console.error('[RevenueCat] purchase target element not found in dialog');
            this.error = 'Something went wrong loading the purchase form. Please try again.';
            this.purchasing = false;
            return;
        }

        try {
            await this.subscriptionService.purchasePackage(pkg, {
                htmlTarget: target,
                customerEmail: this.userEmail
            });
            await this.auth.refreshMembership();
            this.purchasing = false;
            this.router.navigate(['/join/success'], { queryParams: { returnUrl: this.returnUrl } });
        } catch (err: any) {
            if (SubscriptionService.isUserCancelled(err)) {
                this.purchasing = false;
                return;
            }
            this.error = err?.message ?? 'Payment failed. Please try again.';
            this.purchasing = false;
        }
    }

    onDialogHide() {
        this.error = null;
    }

    async manageBilling() {
        try {
            await this.subscriptionService.openManagementUrl();
        } catch {
            this.error = 'Could not open billing portal. You may not have an active subscription yet.';
        }
    }

    // ================================================================
    // DEPRECATED — previous Stripe implementation.
    // Kept commented for reference during the RevenueCat migration.
    // ================================================================
    //
    // stripe = injectStripe();
    // showPaymentElement = false;
    // loadingIntent = false;
    // loadingSubscribe = false;
    // elements: StripeElements | null = null;
    // elementsOptions: StripeElementsOptionsClientSecret = {
    //     clientSecret: '',
    //     appearance: {
    //         theme: 'night',
    //         variables: {
    //             colorPrimary: '#4cfbab',
    //             colorBackground: '#1c1c1c',
    //             colorText: '#ffffff',
    //             colorTextSecondary: '#aaaaaa',
    //             borderRadius: '8px',
    //             fontFamily: 'Lato, sans-serif',
    //         },
    //     } as Appearance,
    // };
    //
    // async setupPayment() {
    //     this.error = null;
    //     this.loadingIntent = true;
    //     try {
    //         const priceId = PRICES[this.billingPeriod].id;
    //         const { clientSecret } = await this.subscriptionService.createSubscriptionIntent(priceId);
    //         this.elementsOptions = { ...this.elementsOptions, clientSecret };
    //         this.showPaymentElement = true;
    //     } catch (err: any) {
    //         this.error = err?.message ?? 'Something went wrong. Please try again.';
    //     } finally {
    //         this.loadingIntent = false;
    //     }
    // }
    //
    // subscribe() {
    //     if (!this.elements) return;
    //     this.error = null;
    //     this.loadingSubscribe = true;
    //     this.stripe
    //         .confirmPayment({
    //             elements: this.elements,
    //             confirmParams: {
    //                 return_url: `${window.location.origin}/join/success?returnUrl=${encodeURIComponent(this.returnUrl)}`,
    //             },
    //         })
    //         .subscribe({
    //             next: (result) => {
    //                 this.loadingSubscribe = false;
    //                 if (result.error) {
    //                     this.error = result.error.message ?? 'Payment failed. Please try again.';
    //                 }
    //             },
    //             error: (err) => {
    //                 this.loadingSubscribe = false;
    //                 this.error = err?.message ?? 'Payment failed. Please try again.';
    //             },
    //         });
    // }
}
