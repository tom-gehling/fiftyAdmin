import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-fifty-shop',
    standalone: true,
    imports: [RouterModule],
    template: `
        <div class="bg-surface-0 dark:bg-surface-900">
           Fifty Shop
        </div>
    `
})
export class FiftyShopPage {}
