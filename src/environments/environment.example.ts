// Example environment configuration
// Copy this file to:
//   - environment.ts       → dev values (also written by CI from FIREBASE_CONFIG_DEV)
//   - environment.prod.ts  → prod values (also written by CI from FIREBASE_CONFIG_PROD)
// Both real files are gitignored. Never commit real keys.
//
// In CI, the relevant file is generated from a GitHub Actions secret before `ng build` runs.
// Locally, edit environment.ts directly with your dev project's keys.

export const environment = {
    production: false,

    // ── Firebase ────────────────────────────────────────────────────────────
    // Project Settings → Your apps → Web app config (Firebase console).
    // Different per env: dev project = weeklyfifty-dev, prod = weeklyfifty-7617b.
    firebase: {
        apiKey: 'YOUR_FIREBASE_API_KEY',
        authDomain: 'weeklyfifty-dev.firebaseapp.com',
        projectId: 'weeklyfifty-dev',
        storageBucket: 'weeklyfifty-dev.firebasestorage.app',
        messagingSenderId: 'YOUR_SENDER_ID',
        appId: 'YOUR_APP_ID',
        measurementId: 'YOUR_MEASUREMENT_ID',
    },

    // ── Google Maps ─────────────────────────────────────────────────────────
    // https://console.cloud.google.com/apis/credentials
    // Restrict the dev key to dev domain(s); restrict prod key to prod domain(s).
    googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY',

    // ── RevenueCat ──────────────────────────────────────────────────────────
    // https://app.revenuecat.com → Project Settings → API keys
    // Use Sandbox key in dev, Production key in prod.
    revenueCatPublicApiKey: 'rcb_YOUR_REVENUECAT_PUBLIC_KEY',
    revenueCatEntitlementId: 'fiftyplus',

    // ── Stripe (legacy / optional) ──────────────────────────────────────────
    // Test-mode keys (pk_test_…) in dev; live (pk_live_…) in prod.
    // stripePublishableKey: 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY',

    // ── Cloud Functions base URL ────────────────────────────────────────────
    // Empty string = use Firebase Hosting rewrites (/api/** → function 'api').
    // Full https URL when running locally against deployed Functions.
    functionsBaseUrl: '',
};
