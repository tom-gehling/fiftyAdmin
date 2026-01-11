import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-contact-us',
    standalone: true,
    imports: [RouterModule],
    template: `
        <div class="bg-surface-0 dark:bg-surface-900">
           Contact Us
        </div>
    `
})
export class ContactUsPage {}
