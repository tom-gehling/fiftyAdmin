import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CarouselModule } from 'primeng/carousel';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { NotifyService } from '@/shared/services/notify.service';
import { ContactFormService } from '@/shared/services/contact-form.service';

interface ServiceCard {
    icon: string;
    title: string;
    description: string;
}

@Component({
    selector: 'app-contact-us',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, CarouselModule, InputTextModule, TextareaModule, ButtonModule, ToastModule],
    providers: [],
    template: `


        <!-- Hero -->
        <div class="hero-section">
            <img src="assets/logos/logo.png" alt="The Weekly Fifty" class="hero-logo" />
            <h1 class="hero-heading">Here's what we can do for you.</h1>
        </div>

        <!-- Services Carousel -->
        <div class="carousel-section">
            <p-carousel
                [value]="services"
                [numVisible]="3"
                [numScroll]="1"
                [circular]="true"
                [responsiveOptions]="responsiveOptions"
                [showNavigators]="true"
                [showIndicators]="true"
            >
                <ng-template #item let-service>
                    <div class="service-card">
                        <i [class]="'pi ' + service.icon + ' service-icon'"></i>
                        <h3 class="service-title">{{ service.title }}</h3>
                        <p class="service-description">{{ service.description }}</p>
                    </div>
                </ng-template>
            </p-carousel>
        </div>

        <!-- Contact Form -->
        <div class="form-section">
            <h2 class="form-heading">Get in touch.</h2>
            <h6 class="form-subHeading">Say g'day at hello@theweeklyfifty.com.au or via the contact form below.</h6>

            <form class="contact-form" (ngSubmit)="onSubmit()" #contactForm="ngForm">

                <!-- Honeypot (hidden from humans, traps bots) -->
                <input type="text" name="website" [(ngModel)]="honeypot" tabindex="-1" autocomplete="off" style="display:none;position:absolute;left:-9999px;" />

                <div class="form-field">
                    <label for="name">Name *</label>
                    <input
                        pInputText
                        id="name"
                        name="name"
                        [(ngModel)]="formData.name"
                        required
                        placeholder="Your name"
                        class="w-full"
                    />
                </div>

                <div class="form-field">
                    <label for="email">Email</label>
                    <input
                        pInputText
                        id="email"
                        name="email"
                        type="email"
                        [(ngModel)]="formData.email"
                        placeholder="your@email.com"
                        class="w-full"
                    />
                </div>

                <div class="form-field">
                    <label for="mobile">Mobile Number</label>
                    <input
                        pInputText
                        id="mobile"
                        name="mobile"
                        type="tel"
                        [(ngModel)]="formData.mobile"
                        placeholder="0400 000 000"
                        class="w-full"
                    />
                </div>

                <div class="form-field">
                    <label for="message">What's your big idea? *</label>
                    <textarea
                        pTextarea
                        id="message"
                        name="message"
                        [(ngModel)]="formData.message"
                        required
                        rows="5"
                        placeholder="Tell us about your idea..."
                        class="w-full"
                    ></textarea>
                </div>

                <button
                    pButton
                    type="submit"
                    label="Send"
                    icon="pi pi-send"
                    [loading]="submitting"
                    [disabled]="contactForm.invalid || submitting"
                    class="send-btn"
                ></button>
            </form>
        </div>
    `,
    styles: [`
        :host {
            display: block;
            min-height: 100vh;
            background: var(--fifty-green);
            color: white;
        }

        /* Hero */
        .hero-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 3rem 1.5rem 2rem;
            text-align: center;
        }

        .hero-logo {
            width: 180px;
            max-width: 80%;
            margin-bottom: 1.5rem;
        }

        .hero-heading {
            font-size: 2rem;
            font-weight: 700;
            color: var(--fifty-pink);
            margin: 0;
        }

        @media (max-width: 640px) {
            .hero-heading { font-size: 1.5rem; }
        }

        /* Carousel */
        .carousel-section {
            padding: 1rem 1.5rem 2.5rem;
            max-width: 1100px;
            margin: 0 auto;
        }

        .service-card {
            margin: 0.75rem;
            padding: 2rem 1.5rem;
            background: rgba(0, 0, 0, 0.25);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            text-align: center;
            min-height: 220px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
        }

        .service-icon {
            font-size: 2.5rem;
            color: var(--fifty-pink);
        }

        .service-title {
            font-size: 1.1rem;
            font-weight: 700;
            color: var(--fifty-pink);
            margin: 0;
        }

        .service-description {
            font-size: 0.95rem;
            color: rgba(255, 255, 255, 0.85);
            margin: 0;
            line-height: 1.5;
        }

        /* Carousel navigation arrows */
        :host ::ng-deep .p-carousel-prev,
        :host ::ng-deep .p-carousel-next {
            color: var(--fifty-pink) !important;
        }

        :host ::ng-deep .p-carousel-indicator.p-highlight button {
            background: var(--fifty-pink) !important;
        }

        /* Form */
        .form-section {
            max-width: 600px;
            margin: 0 auto;
            padding: 0 1.5rem 4rem;
        }

        .form-heading {
            font-size: 2rem;
            font-weight: 700;
            color: var(--fifty-pink);
            margin-bottom: 2rem;
            text-align: center;
        }

        .form-subHeading {
            font-size: 1.2rem;
            font-weight: 400;
            color: var(--fifty-pink);
            margin-bottom: 2rem;
            text-align: center;
        }


        .contact-form {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }

        .form-field {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }

        .form-field label {
            font-size: 0.9rem;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
        }

        :host ::ng-deep .form-field input.p-inputtext,
        :host ::ng-deep .form-field textarea.p-textarea {
            background: rgba(0, 0, 0, 0.3);
            border-color: rgba(255, 255, 255, 0.2);
            color: white;
        }

        :host ::ng-deep .form-field input.p-inputtext::placeholder,
        :host ::ng-deep .form-field textarea.p-textarea::placeholder {
            color: rgba(255, 255, 255, 0.4);
        }

        :host ::ng-deep .form-field input.p-inputtext:focus,
        :host ::ng-deep .form-field textarea.p-textarea:focus {
            border-color: var(--fifty-pink);
            box-shadow: 0 0 0 2px rgba(255, 100, 150, 0.2);
        }

        .send-btn {
            align-self: flex-start;
            margin-top: 0.5rem;
        }

        :host ::ng-deep .send-btn.p-button {
            background: var(--fifty-pink);
            border-color: var(--fifty-pink);
            color: white;
            font-weight: 700;
            padding: 0.65rem 2rem;
        }

        :host ::ng-deep .send-btn.p-button:hover {
            background: var(--fifty-pink);
            filter: brightness(1.1);
        }
    `]
})
export class ContactUsPage implements OnInit {
    formData = { name: '', email: '', mobile: '', message: '' };
    honeypot = '';
    submitting = false;
    private pageLoadTime = 0;

    readonly services: ServiceCard[] = [
        {
            icon: 'pi-users',
            title: 'Quiz Nights',
            description: "Let's pack out your venue with a weekly or monthly quiz."
        },
        {
            icon: 'pi-megaphone',
            title: 'Advertise Your Business',
            description: 'Get your brand in front of tens of thousands of people on our main quiz page.'
        },
        {
            icon: 'pi-briefcase',
            title: 'Corporate Events',
            description: "We'll save you the hassle on the big night with the perfect quiz for any crowd."
        },
        {
            icon: 'pi-star',
            title: 'One-off Events',
            description: "Themed quiz nights, dinner parties, we're all ears."
        }
    ];

    readonly responsiveOptions = [
        { breakpoint: '1024px', numVisible: 3, numScroll: 1 },
        { breakpoint: '768px', numVisible: 2, numScroll: 1 },
        { breakpoint: '560px', numVisible: 1, numScroll: 1 }
    ];

    constructor(
        private contactFormService: ContactFormService,
        private notify: NotifyService
    ) {}

    ngOnInit() {
        this.pageLoadTime = Date.now();
    }

    async onSubmit() {
        // Honeypot check
        if (this.honeypot) {
            this.showSuccess();
            return;
        }

        // Timing check — reject if submitted in under 3 seconds
        if (Date.now() - this.pageLoadTime < 3000) {
            this.showSuccess();
            return;
        }

        this.submitting = true;
        try {
            await this.contactFormService.submit(this.formData);
            this.showSuccess();
            this.formData = { name: '', email: '', mobile: '', message: '' };
        } catch (err) {
            this.notify.error('Please try again or email us directly.', 'Something went wrong', 6000);
        } finally {
            this.submitting = false;
        }
    }

    private showSuccess() {
        this.notify.success("Thanks for reaching out — we'll be in touch soon.", 'Message sent!', 6000);
    }
}
