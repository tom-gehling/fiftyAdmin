import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { AuthModalComponent } from '@/shared/components/auth-modal/auth-modal.component';
import { AuthService } from '@/shared/services/auth.service';
import { environment } from './environments/environment';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule, ToastModule, AuthModalComponent, AsyncPipe],
    template: `
        @if (!(auth.initialized$ | async)) {
            <div class="auth-splash">
                <div class="auth-splash__pulse">
                    <span class="auth-splash__wave auth-splash__wave--first"></span>
                    <span class="auth-splash__wave auth-splash__wave--second"></span>
                    <img src="assets/logos/twf.png" alt="The Weekly Fifty" class="auth-splash__logo" />
                </div>
            </div>
        }
        <p-toast position="bottom-right"></p-toast>
        <app-auth-modal />
        <router-outlet></router-outlet>
        @if (showEnvBadge) {
            <div class="env-badge">DEV · {{ firebaseProjectId }}</div>
        }
    `,
    styles: [
        `
            .auth-splash {
                position: fixed;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--fifty-green, #677c73);
                z-index: 10000;
            }
            .auth-splash__pulse {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .auth-splash__wave {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 160px;
                height: 160px;
                margin-top: -80px;
                margin-left: -80px;
                border-radius: 50%;
                border: 2px solid rgba(255, 255, 255, 0.55);
                opacity: 0;
                pointer-events: none;
                animation: auth-splash-wave 1.3s ease-out infinite;
            }
            .auth-splash__wave--first {
                animation-delay: 0.18s;
            }
            .auth-splash__wave--second {
                animation-delay: 0.55s;
            }
            .auth-splash__logo {
                position: relative;
                z-index: 1;
                width: 140px;
                height: auto;
                transform-origin: center;
                animation: auth-splash-heartbeat 1.3s ease-in-out infinite;
            }
            @keyframes auth-splash-wave {
                0% {
                    transform: scale(0.9);
                    opacity: 0.65;
                }
                60% {
                    opacity: 0.2;
                }
                80%,
                100% {
                    transform: scale(2.4);
                    opacity: 0;
                }
            }
            .env-badge {
                position: fixed;
                bottom: 8px;
                left: 8px;
                z-index: 9999;
                pointer-events: none;
                padding: 4px 10px;
                border-radius: 999px;
                font-size: 11px;
                font-weight: 600;
                font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                letter-spacing: 0.04em;
                background: #facc15;
                color: #1a1a1a;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
            }
            @keyframes auth-splash-heartbeat {
                0% {
                    transform: scale(1);
                }
                14% {
                    transform: scale(1.12);
                }
                28% {
                    transform: scale(1);
                }
                42% {
                    transform: scale(1.12);
                }
                70% {
                    transform: scale(1);
                }
                100% {
                    transform: scale(1);
                }
            }
        `
    ]
})
export class AppComponent {
    auth = inject(AuthService);

    readonly firebaseProjectId = environment.firebase.projectId;
    readonly showEnvBadge = !environment.production;
}
