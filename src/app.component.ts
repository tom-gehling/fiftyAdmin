import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { AuthModalComponent } from '@/shared/components/auth-modal/auth-modal.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule, ToastModule, AuthModalComponent],
    template: `
        <p-toast position="bottom-right"></p-toast>
        <app-auth-modal />
        <router-outlet></router-outlet>
    `
})
export class AppComponent {}
