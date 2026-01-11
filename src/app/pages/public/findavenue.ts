import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-find-a-venue',
    standalone: true,
    imports: [RouterModule],
    template: `
        <div class="bg-surface-0 dark:bg-surface-900">
           Find A Venue
        </div>
    `
})
export class FindAVenuePage {}
