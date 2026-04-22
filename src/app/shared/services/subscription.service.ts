import { Injectable } from '@angular/core';
import { Purchases, Offering, Package, CustomerInfo, PurchasesError, ErrorCode } from '@revenuecat/purchases-js';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
    /**
     * Fetch the current offering from RevenueCat.
     * Offerings + packages (quarterly / yearly / etc.) are configured in the RevenueCat dashboard.
     * Returns null if no current offering is configured.
     *
     */
    async getCurrentOffering(): Promise<Offering | null> {
        const offerings = await Purchases.getSharedInstance().getOfferings();
        return offerings.current ?? null;
    }

    /**
     * Purchase a package. RevenueCat renders its embedded purchase flow inside `htmlTarget`.
     * Resolves with the updated CustomerInfo on success; rejects with a PurchasesError on failure/cancel.
     */
    async purchasePackage(pkg: Package, opts: { htmlTarget: HTMLElement; customerEmail?: string }): Promise<CustomerInfo> {
        const result = await Purchases.getSharedInstance().purchase({
            rcPackage: pkg,
            htmlTarget: opts.htmlTarget,
            customerEmail: opts.customerEmail
        });
        return result.customerInfo;
    }

    /**
     * Opens the RevenueCat-hosted subscription management page in the current tab.
     * `managementURL` is populated on `customerInfo` once a user has an active subscription.
     */
    async openManagementUrl(): Promise<void> {
        const info = await Purchases.getSharedInstance().getCustomerInfo();
        const url = info.managementURL;
        if (!url) throw new Error('No active subscription to manage.');
        window.location.href = url;
    }

    /** True when a thrown error represents the user cancelling the purchase flow. */
    static isUserCancelled(err: unknown): boolean {
        return err instanceof PurchasesError && err.errorCode === ErrorCode.UserCancelledError;
    }

    // ================================================================
    // DEPRECATED — previous Stripe implementation.
    // Kept commented for reference during the RevenueCat migration.
    // ================================================================
    //
    // import { Functions, getFunctions, httpsCallable } from '@angular/fire/functions';
    // private functions = getFunctions();
    //
    // async createSubscriptionIntent(priceId: string): Promise<{ clientSecret: string; subscriptionId: string }> {
    //     const fn = httpsCallable<{ priceId: string }, { clientSecret: string; subscriptionId: string }>(this.functions, 'createSubscriptionIntent');
    //     const result = await fn({ priceId });
    //     return result.data;
    // }
    //
    // async createPortalSession(returnUrl: string): Promise<string> {
    //     const fn = httpsCallable<{ returnUrl: string }, { url: string }>(this.functions, 'createPortalSession');
    //     const result = await fn({ returnUrl });
    //     return result.data.url;
    // }
}
