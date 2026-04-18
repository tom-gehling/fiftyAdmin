# Adding Stripe Payments to Your Angular App

Two approaches are covered below — use one or both:

- **Option A: Embedded card form** — Stripe Elements renders inside your Angular UI. Full control over the look and feel.
- **Option B: Stripe Checkout (express)** — Redirects to a Stripe-hosted page. Zero UI to build, supports Apple Pay / Google Pay / Link out of the box.

---

## Shared setup

### 1. Install dependencies

```bash
npm install ngx-stripe @stripe/stripe-js
```

### 2. Register ngx-stripe

**app.config.ts**

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideNgxStripe } from 'ngx-stripe';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideNgxStripe('pk_test_YOUR_PUBLISHABLE_KEY'),
  ],
};
```

### 3. Create the payment service

**payment.service.ts**

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);

  // Option A: Embedded card form
  createPaymentIntent(amount: number) {
    return this.http.post<{ clientSecret: string }>(
      'http://localhost:3000/create-payment-intent',
      { amount }
    );
  }

  // Option B: Stripe Checkout (redirect)
  createCheckoutSession(amount: number) {
    return this.http.post<{ url: string }>(
      'http://localhost:3000/create-checkout-session',
      { amount }
    );
  }
}
```

---

## Option A: Embedded card form

### Checkout component (card form)

**checkout.component.ts**

```typescript
import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  StripeCardComponent,
  NgxStripeModule,
  StripeService,
} from 'ngx-stripe';
import { StripeCardElementOptions } from '@stripe/stripe-js';
import { PaymentService } from './payment.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, NgxStripeModule],
  template: `
    <div class="checkout">
      <h2>Pay $49.00</h2>

      <ngx-stripe-card [options]="cardOptions" />

      <button (click)="pay()" [disabled]="paying">
        {{ paying ? 'Processing...' : 'Pay now' }}
      </button>

      <p *ngIf="message" [class]="status">{{ message }}</p>
    </div>
  `,
})
export class CheckoutComponent {
  @ViewChild(StripeCardComponent) card!: StripeCardComponent;

  private stripeService = inject(StripeService);
  private paymentService = inject(PaymentService);

  paying = false;
  message = '';
  status = '';

  cardOptions: StripeCardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#32325d',
        '::placeholder': { color: '#aab7c4' },
      },
    },
  };

  pay() {
    this.paying = true;
    this.message = '';

    // Step 1: Ask your backend for a clientSecret
    this.paymentService.createPaymentIntent(4900).subscribe({
      next: ({ clientSecret }) => {

        // Step 2: Confirm the payment with Stripe directly
        this.stripeService
          .confirmCardPayment(clientSecret, {
            payment_method: { card: this.card.element },
          })
          .subscribe((result) => {
            this.paying = false;

            if (result.error) {
              this.status = 'error';
              this.message = result.error.message ?? 'Payment failed';
            } else {
              this.status = 'success';
              this.message = 'Payment succeeded!';
            }
          });
      },
      error: () => {
        this.paying = false;
        this.status = 'error';
        this.message = 'Could not reach server';
      },
    });
  }
}
```

---

## Option B: Stripe Checkout (express redirect)

This is the simplest possible integration. No card form, no styling — Stripe hosts the entire payment page.

### Express checkout component

**express-checkout.component.ts**

```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from './payment.service';

@Component({
  selector: 'app-express-checkout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button (click)="checkout()" [disabled]="loading">
      {{ loading ? 'Redirecting...' : 'Checkout' }}
    </button>
  `,
})
export class ExpressCheckoutComponent {
  private paymentService = inject(PaymentService);
  loading = false;

  checkout() {
    this.loading = true;

    this.paymentService.createCheckoutSession(4900).subscribe({
      next: ({ url }) => {
        // Redirect to Stripe's hosted checkout page
        window.location.href = url;
      },
      error: () => {
        this.loading = false;
        alert('Could not reach server');
      },
    });
  }
}
```

### Success and cancel pages

After payment, Stripe redirects the user back to your site. Create two simple pages:

**success.component.ts**

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-success',
  standalone: true,
  template: `
    <h2>Payment successful!</h2>
    <p>Thank you for your purchase.</p>
  `,
})
export class SuccessComponent {}
```

**cancel.component.ts**

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-cancel',
  standalone: true,
  template: `
    <h2>Payment cancelled</h2>
    <p>You can try again whenever you're ready.</p>
  `,
})
export class CancelComponent {}
```

Add the routes in your router config:

```typescript
{ path: 'success', component: SuccessComponent },
{ path: 'cancel', component: CancelComponent },
```

---

## Backend (Express + Stripe)

Create a separate folder for this (e.g. `stripe-server/`).

```bash
mkdir stripe-server && cd stripe-server
npm init -y
npm install express stripe cors
npm install -D typescript @types/express ts-node
```

**server.ts**

```typescript
import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';

const app = express();
const stripe = new Stripe('sk_test_YOUR_SECRET_KEY');

app.use(cors());
app.use(express.json());

// ── Option A: Embedded card form ────────────────────────────

app.post('/create-payment-intent', async (req, res) => {
  const { amount } = req.body;

  const paymentIntent = await stripe.paymentIntents.create({
    amount,          // in cents (e.g. 4900 = $49.00)
    currency: 'aud',
  });

  res.json({ clientSecret: paymentIntent.client_secret });
});

// ── Option B: Stripe Checkout (redirect) ────────────────────

app.post('/create-checkout-session', async (req, res) => {
  const { amount } = req.body;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'aud',
          product_data: { name: 'Your Product' },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: 'http://localhost:4200/success',
    cancel_url: 'http://localhost:4200/cancel',
  });

  res.json({ url: session.url });
});

// ── Webhook (works for both options) ────────────────────────

app.post('/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(
      req.body, sig, 'whsec_YOUR_WEBHOOK_SECRET'
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('PaymentIntent succeeded:', event.data.object.id);
        // TODO: fulfil order (Option A)
        break;
      case 'checkout.session.completed':
        console.log('Checkout session completed:', event.data.object.id);
        // TODO: fulfil order (Option B)
        break;
    }

    res.json({ received: true });
  }
);

app.listen(3000, () => console.log('Server on :3000'));
```

Run the backend:

```bash
npx ts-node server.ts
```

## Flow summary

### Option A (embedded card form)

1. User clicks "Pay"
2. Angular calls `POST /create-payment-intent` on your backend
3. Backend asks Stripe to create a PaymentIntent, returns a `clientSecret`
4. Angular uses the `clientSecret` to send card details **directly to Stripe** (never touches your server)
5. Stripe processes the payment
6. Stripe sends a `payment_intent.succeeded` webhook to your backend
7. Your backend fulfils the order

### Option B (Stripe Checkout redirect)

1. User clicks "Checkout"
2. Angular calls `POST /create-checkout-session` on your backend
3. Backend creates a Checkout Session, returns a `url`
4. Angular redirects the user to Stripe's hosted payment page
5. User completes payment on Stripe's page (card, Apple Pay, Google Pay, etc.)
6. Stripe redirects user back to your `/success` or `/cancel` page
7. Stripe sends a `checkout.session.completed` webhook to your backend
8. Your backend fulfils the order

## Keys to replace

| Placeholder | Where to find it |
|---|---|
| `pk_test_YOUR_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys |
| `sk_test_YOUR_SECRET_KEY` | Same page (keep this server-side only) |
| `whsec_YOUR_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → Add endpoint |

> **Tip:** Use `stripe listen --forward-to localhost:3000/webhook` from the [Stripe CLI](https://stripe.com/docs/stripe-cli) to test webhooks locally.

## Which option should I use?

| | Option A (embedded) | Option B (checkout) |
|---|---|---|
| **UI control** | Full — style it however you want | None — Stripe controls the page |
| **Setup effort** | More code (card component, styling) | Minimal (just a redirect) |
| **Apple/Google Pay** | Requires extra `PaymentRequest` setup | Built in automatically |
| **PCI scope** | SAQ A (Stripe handles card data) | SAQ A (same) |
| **Best for** | Custom-branded checkout flows | Getting payments working fast |
