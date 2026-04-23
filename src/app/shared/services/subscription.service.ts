import { Injectable, inject } from '@angular/core';
import { Functions, getFunctions, httpsCallable } from '@angular/fire/functions';
import { initializeApp } from '@angular/fire/app';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
    private functions: Functions;

    constructor() {
        this.functions = getFunctions();
    }

    /**
     * Creates a Stripe Subscription and returns a client_secret for the
     * embedded Stripe Payment Element to confirm payment.
     */
    async createSubscriptionIntent(priceId: string): Promise<{ clientSecret: string; subscriptionId: string }> {
        const fn = httpsCallable<{ priceId: string }, { clientSecret: string; subscriptionId: string }>(this.functions, 'createSubscriptionIntent');
        const result = await fn({ priceId });
        return result.data;
    }

    /**
     * Opens the Stripe Customer Portal for subscription management.
     * Returns the portal session URL.
     */
    async createPortalSession(returnUrl: string): Promise<string> {
        const fn = httpsCallable<{ returnUrl: string }, { url: string }>(this.functions, 'createPortalSession');
        const result = await fn({ returnUrl });
        return result.data.url;
    }
}
