import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PublicTopbarComponent } from './components/public-topbar';

@Component({
    selector: 'app-contact-us',
    standalone: true,
    imports: [RouterModule, PublicTopbarComponent],
    template: `
        <app-public-topbar />
        <div class="page-content">
           Contact Us
        </div>
    `,
    styles: [`
        :host {
            display: block;
            min-height: 100vh;
            background: var(--fifty-green);
            color: var(--fifty-pink);
        }
        .page-content {
            padding: 4.5rem 1.5rem 1.5rem;
        }
    `]
})
export class ContactUsPage {}
