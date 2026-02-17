import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-tier-lock-overlay',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg"
         style="background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);">
      <i class="pi pi-lock text-3xl text-gray-300 mb-3"></i>
      <p class="text-white font-semibold text-center px-4">{{ message }}</p>
      <p-button
        *ngIf="showUpgradeButton"
        label="Upgrade"
        icon="pi pi-arrow-up"
        [outlined]="true"
        severity="success"
        class="mt-3"
        (onClick)="upgrade.emit()">
      </p-button>
    </div>
  `
})
export class TierLockOverlayComponent {
  @Input() message = 'Upgrade your membership to unlock this content';
  @Input() showUpgradeButton = true;
  @Output() upgrade = new EventEmitter<void>();
}
