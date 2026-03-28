import { Component, OnInit, Input } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { AuthService } from '@/shared/services/auth.service';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-locked-widget',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  template: `
    <div class="relative" [style.width]="width" [style.height]="height">
      <div [class.pointer-events-none]="locked$ | async" [class.select-none]="locked$ | async"
           [style.filter]="(locked$ | async) ? 'blur(6px)' : 'none'">
        <ng-content></ng-content>
      </div>

      @if (locked$ | async) {
        <div class="absolute inset-0 rounded-xl flex flex-col items-center justify-center z-10 gap-3">
          @if (title) {
            <div class="absolute top-3 right-4 flex items-center gap-1.5">
              <i class="pi pi-lock text-xs" style="color: var(--fifty-neon-green)"></i>
              <span class="text-xs font-semibold" style="color: var(--fifty-neon-green)">{{ title }}</span>
            </div>
          }
          <i class="pi pi-lock" style="font-size: 3rem; color: var(--fifty-neon-green)"></i>
          <p class="text-white font-semibold text-sm text-center">Fifty+ membership required</p>
        </div>
      }
    </div>
  `
})
export class LockedWidgetComponent implements OnInit {
  @Input() width = '100%';
  @Input() height = '100%';
  @Input() title = '';
  locked$!: Observable<boolean>;

  constructor(public authService: AuthService) {}

  ngOnInit() {
    this.locked$ = this.authService.user$.pipe(
      map(user => !user || (user as any).isAnon === true)
    );
  }
}
