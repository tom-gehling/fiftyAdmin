// Example environment configuration
// Copy this file to environment.ts and fill in your actual values
// DO NOT commit environment.ts with real API keys

export const environment = {
    production: false,
    googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY',

    // Stripe (deprecated — kept commented for reference during the RevenueCat migration)
    // stripePublishableKey: 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY',

    // RevenueCat Web Billing public API key (web SDK)
    revenueCatPublicApiKey: 'rcb_YOUR_REVENUECAT_PUBLIC_KEY',
    // Entitlement identifier that unlocks Fifty+ access
    revenueCatEntitlementId: 'fiftyplus',

    // Firebase Cloud Functions base URL — '' for prod (relative via Hosting rewrites),
    // full https URL for local dev against live Firebase.
    functionsBaseUrl: 'https://us-central1-weeklyfifty-7617b.cloudfunctions.net'
};
