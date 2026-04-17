import {
  Component, OnInit, OnDestroy, AfterViewInit,
  NgZone, ChangeDetectorRef
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// Green overlay clip-path: polygon(TL% 0%, TR% 0%, BR% 100%, BL% 100%)
// Each state = [topLeft, topRight, bottomRight, bottomLeft] as % of viewport width
// CLIP_RIGHT matches the original .green-overlay visual exactly (calculated from
// the original 60vw element at left:45vw with polygon(35% 0, 100% 0, 100% 100%, 0% 100%))
const CLIP_RIGHT  = [65, 100, 100, 45]; // green on right  (hero — matches original)
const CLIP_CENTER = [ 0,  50,  50,  0]; // green left half (50% vertical band)
const CLIP_PEAK   = [ 0, 100, 100,  0]; // green full screen (mid-transition flash)
const CLIP_FINAL  = [30,  70,  70, 30]; // green center column — logos on both sides

const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;
const lp    = (a: number[], b: number[], t: number) => a.map((v, i) => lerp(v, b[i], t));
const toCp  = ([tl, tr, br, bl]: number[]) =>
  `polygon(${tl}% 0%, ${tr}% 0%, ${br}% 100%, ${bl}% 100%)`;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const inv   = (a: number, b: number, v: number) => clamp((v - a) / (b - a), 0, 1);
const eio   = (t: number) => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const eIn   = (t: number) => t * t * t;           // ease-in cubic  — slow start, fast finish
const eOut  = (t: number) => 1 - (1 - t) ** 3;   // ease-out cubic — fast start, slow finish

const LOGOS = [
  'aussie.png', 'boomer.png', 'chrissy.png', 'footy.png', 'loser.png',
  'movie2.png', 'olympic.png', 'people50.png', 'peoples.png', 'reality.png',
  'specialsLogo.png', 'spooky.png', 'weekly-hundred.png', 'yearly-22022.png',
  'yeswequiz.png', 'twf.png', 'archivesLogo.png', 'EURO.png', 'Movie.png',
  'SA.png', 'Yearl-2023.png', 'fiftyplus.png', '2010s-clear-1.png',
  'HOTTEST-20 (1).png', 'swifty (1).png'
];
import { AuthModalService } from '@/shared/services/auth-modal.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule],
  template: `
    <!-- Tall scroll container — gives us 200vh of scroll travel -->
    <div class="scroll-container">

      <!-- Sticky scene — pins to viewport during scroll -->
      <div class="sticky-scene">

        <!-- LAYER 1: Scrolling background images -->
        <div class="images-section">
          <div class="image-row" *ngFor="let row of imageRows; let i = index"
               [class.scroll-left]="i % 2 === 0"
               [class.scroll-right]="i % 2 !== 0">
            <div class="strip-images">
              <ng-container *ngFor="let img of row">
                <img [src]="'assets/submissions/sub' + img + '.jpeg'" />
              </ng-container>
              <ng-container *ngFor="let img of row">
                <img [src]="'assets/submissions/sub' + img + '.jpeg'" />
              </ng-container>
            </div>
          </div>
        </div>

        <!-- LAYER 2: Logos wall (right side, fades in at phase 3) -->
        <div class="logos-wall" [style.opacity]="logosAlpha">
          <img *ngFor="let logo of logos"
               [src]="'assets/logos/' + logo"
               [alt]="logo" />
        </div>

        <!-- LAYER 3: Green overlay — shadow wrapper + clipped fill -->
        <div class="green-shadow-wrapper">
          <div class="green-overlay" [style.clipPath]="clipPath"></div>
        </div>

        <!-- LAYER 4: Section 2 text — fades in when green is vertical (z:100) -->
        <div class="section-text section2-text" [style.opacity]="s2Alpha">
          <div class="text-eyebrow">The Weekly</div>
          <div class="text-headline">FIFTY</div>
          <div class="text-body">Australia's favourite online pub trivia.<br>Play from anywhere. Every week.</div>
        </div>

        <!-- LAYER 5: Section 3 text — fades in when green is on left (z:100) -->
        <div class="section-text section3-text" [style.opacity]="s3Alpha">
          <div class="text-eyebrow">Hundreds of</div>
          <div class="text-headline">QUIZZES</div>
          <div class="text-body">Movies &middot; Music &middot; Sport<br>Pop Culture &middot; and more</div>
        </div>

        <!-- Navbar — always visible -->
        <nav class="navbar">
          <div class="auth-buttons">
            <button class="auth-btn" (click)="test()">LOGIN / SIGN UP</button>
          </div>
        </nav>

        <!-- Hero content — logo, menu buttons, scroll hint -->
        <div class="hero-content"
             [style.opacity]="heroAlpha"
             [style.pointerEvents]="heroAlpha < 0.05 ? 'none' : 'auto'">

          <div class="main-logo">
            <img src="assets/logos/logo.png" alt="The Weekly Fifty" />
          </div>

          <div class="menu-wrapper">
            <div class="menu-buttons">
              <button routerLink="/weekly-quiz" class="menu-btn">THIS WEEK'S QUIZ</button>
              <button routerLink="/login" class="menu-btn">FIFTY+</button>
              <button routerLink="/find-a-venue" class="menu-btn">FIND A VENUE</button>
              <button routerLink="https://theweeklyfifty.com.au/pshop/" class="menu-btn">FIFTY SHOP</button>
            </div>
          </div>

          <div class="scroll-hint">
            <span class="scroll-hint-text">SCROLL</span>
            <div class="scroll-hint-chevron"></div>
          </div>

        </div>

      </div>
    </div>

  `,
  styles: [`
    /* ─── Host — tall scroll container ─────────────────────────────── */
    :host {
      display: block;
      height: 300vh;
      width: 100vw;
      background-color: #1a1a1a;
      color: var(--fifty-pink);
    }

    .scroll-container {
      height: 300vh;
    }

    /* ─── Sticky scene — pins 100vh to viewport top ──────────────── */
    .sticky-scene {
      position: sticky;
      top: 0;
      height: 100vh;
      height: 100dvh;
      width: 100vw;
      overflow: hidden;
    }

    /* ─── LAYER 1: Scrolling images ──────────────────────────────── */
    .images-section {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-evenly;
      z-index: 1;
    }

    .image-row {
      height: 20%;
      width: 100%;
      overflow: hidden;
      display: flex;
      align-items: center;
    }

    .strip-images {
      display: flex;
      height: 100%;
    }

    .scroll-left  .strip-images { animation: scrollLeft  30s linear infinite; }
    .scroll-right .strip-images { animation: scrollRight 30s linear infinite; }

    .strip-images img {
      height: 100%;
      width: auto;
      object-fit: cover;
      flex-shrink: 0;
      opacity: 0.3;
    }

    @keyframes scrollLeft {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    @keyframes scrollRight {
      0%   { transform: translateX(-50%); }
      100% { transform: translateX(0); }
    }

    /* ─── LAYER 2: Logos wall — full width, visible both sides of center green ── */
    .logos-wall {
      position: absolute;
      inset: 0;
      z-index: 5;
      background: rgba(26, 26, 26, 0.92);
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 14px;
      padding: 28px;
      align-content: center;
      pointer-events: none;
    }

    .logos-wall img {
      width: 100%;
      height: 85px;
      object-fit: contain;
      opacity: 0.85;
    }

    /* ─── LAYER 3: Green overlay ─────────────────────────────────── */

    /* Shadow wrapper: filter applied AFTER clip-path for edge glow */
    .green-shadow-wrapper {
      position: absolute;
      inset: 0;
      z-index: 10;
      filter: drop-shadow(-8px 0 24px rgba(0,0,0,0.65));
    }

    .green-overlay {
      position: absolute;
      inset: 0;
      background-color: var(--fifty-green);
      will-change: clip-path;
    }

    /* ─── LAYER 4 / 5: Section texts ─────────────────────────────── */
    .section-text {
      position: absolute;
      z-index: 100;
      color: var(--fifty-pink);
      pointer-events: none;
    }

    /* Phase 2: centered within the left 50% green band */
    .section2-text {
      top: 50%;
      left: 25%;
      transform: translate(-50%, -50%);
      width: 38%;
      text-align: center;
    }

    /* Phase 3: centered within the final 30%–70% green column */
    .section3-text {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 35%;
      text-align: center;
    }

    .text-eyebrow {
      font-size: clamp(0.9rem, 2.2vw, 1.6rem);
      font-weight: 400;
      letter-spacing: 0.35em;
      text-transform: uppercase;
      opacity: 0.65;
      margin-bottom: 0.4rem;
    }

    .text-headline {
      font-size: clamp(3.5rem, 9vw, 8rem);
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 0.88;
      margin-bottom: 1.2rem;
    }

    .text-body {
      font-size: clamp(0.9rem, 1.8vw, 1.25rem);
      line-height: 1.65;
      opacity: 0.8;
      letter-spacing: 0.04em;
    }

    /* ─── Navbar ─────────────────────────────────────────────────── */
    .navbar {
      position: absolute;
      top: 1.5rem;
      right: 2rem;
      display: flex;
      justify-content: flex-end;
      z-index: 200;
    }

    .auth-buttons { display: flex; }

    .auth-btn {
      padding: 0.5rem 1rem;
      font-weight: bold;
      border: 2px solid var(--fifty-pink);
      background: transparent;
      color: var(--fifty-pink);
      cursor: pointer;
      border-radius: 5px;
      text-transform: uppercase;
      transition: transform 0.2s ease, background 0.2s ease;
    }

    .auth-btn:hover {
      transform: scale(1.1);
      background: rgba(255,255,255,0.1);
    }

    /* ─── Hero content wrapper ───────────────────────────────────── */
    .hero-content {
      position: absolute;
      inset: 0;
      z-index: 150;
    }

    /* Logo — centered on full screen */
    .main-logo {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      justify-content: center;
      align-items: center;
      pointer-events: none;
    }

    .main-logo img {
      width: 60vw;
      max-width: 700px;
      min-width: 300px;
      height: auto;
    }

    /* Menu buttons — bottom right */
    .menu-wrapper {
      position: absolute;
      bottom: 3rem;
      right: 2rem;
    }

    .menu-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 450px;
    }

    .menu-btn {
      width: 100%;
      height: 60px;
      font-size: 2rem;
      font-weight: bold;
      color: var(--fifty-pink);
      background: var(--fifty-green);
      border: 3px solid var(--fifty-pink);
      border-radius: 8px;
      cursor: pointer;
      text-transform: uppercase;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 10px;
      margin-right: 10px;
      box-shadow: 0 6px 15px rgba(0,0,0,0.3);
      transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
    }

    .menu-btn:hover {
      transform: translateY(-3px) scale(1.03);
      background: rgba(255,255,255,0.1);
      box-shadow: 0 8px 16px rgba(0,0,0,0.4);
    }

    /* ─── Scroll hint ────────────────────────────────────────────── */
    .scroll-hint {
      position: absolute;
      bottom: 2.5rem;
      left: 25%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      z-index: 160;
    }

    .scroll-hint-text {
      font-size: 0.6rem;
      letter-spacing: 0.35em;
      color: var(--fifty-pink);
      opacity: 0.55;
    }

    .scroll-hint-chevron {
      width: 14px;
      height: 14px;
      border-right: 2px solid var(--fifty-pink);
      border-bottom: 2px solid var(--fifty-pink);
      transform: rotate(45deg);
      opacity: 0.4;
      animation: chevronBounce 1.6s cubic-bezier(0.25, 1, 0.5, 1) infinite;
    }

    @keyframes chevronBounce {
      0%, 100% { opacity: 0.2; transform: rotate(45deg) translateY(-4px); }
      50%       { opacity: 0.7; transform: rotate(45deg) translateY(4px);  }
    }

    /* ─── Reduced motion ─────────────────────────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      .scroll-left .strip-images,
      .scroll-right .strip-images,
      .scroll-hint-chevron {
        animation: none;
      }
    }

    /* ─── Responsive: tablet ─────────────────────────────────────── */
    @media (max-width: 768px) {
      .logos-wall {
        grid-template-columns: repeat(auto-fill, minmax(75px, 1fr));
        padding: 16px;
        gap: 8px;
      }

      .logos-wall img { height: 62px; }

      .main-logo img {
        width: 70vw;
        max-width: 500px;
      }

      .menu-wrapper {
        bottom: 2rem;
        right: 1.5rem;
      }

      .menu-btn { font-size: 1.8rem; }

      .section2-text { width: 44%; }
      .section3-text { width: 38%; }

      .navbar { top: 1rem; right: 1rem; }
    }

    /* ─── Responsive: mobile ─────────────────────────────────────── */
    @media (max-width: 480px) {
      .logos-wall {
        grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
        padding: 12px;
        gap: 6px;
      }

      .logos-wall img { height: 48px; }

      .main-logo img {
        width: 80vw;
        min-width: 200px;
        max-width: 350px;
      }

      .menu-wrapper { bottom: 1rem; right: 0.75rem; }

      .menu-buttons { gap: 6px; }

      .menu-btn {
        height: 46px;
        font-size: 1.2rem;
        margin-left: 0;
        margin-right: 0;
        border-width: 2px;
        border-radius: 6px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      }

      .menu-btn:hover { box-shadow: 0 6px 12px rgba(0,0,0,0.4); }

      .section2-text { width: 44%; }
      .section3-text { width: 38%; }

      .navbar { top: 0.75rem; right: 0.75rem; }

      .auth-btn {
        padding: 0.4rem 0.8rem;
        font-size: 0.85rem;
      }

      .scroll-hint { display: none; }
    }
  `]
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy {

  imageRows = [
    [1, 2, 3, 4, 5, 6, 7],
    [7, 6, 5, 4, 3, 2, 1],
    [2, 4, 6, 1, 3, 5, 7],
    [5, 3, 1, 7, 6, 4, 2],
    [1, 3, 5, 7, 2, 4, 6]
  ];

  readonly logos = LOGOS;

  /** Normalised scroll progress: 0 = top, 1 = bottom of scroll range */
  p = 0;

  private rafId = 0;

  private handler = () => {
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const next = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      if (Math.abs(next - this.p) > 0.0002) {
        this.p = next;
        this.cdr.detectChanges();
      }
    });
  };

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {}

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.handler, { passive: true });
    });
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.handler);
    cancelAnimationFrame(this.rafId);
  }

  // ── Scroll-driven computed values ────────────────────────────────

  /** Green overlay clip-path — four-stage journey:
   *  RIGHT → CENTER → (expand) PEAK → (contract) LEFT  */
  get clipPath(): string {
    const { p } = this;
    let pts: number[];

    if (p < 0.25) {
      // Phase 1: hero state — green on right
      pts = CLIP_RIGHT;
    } else if (p < 0.55) {
      // Transition 1→2: diagonal right sweeps to left-half vertical
      pts = lp(CLIP_RIGHT, CLIP_CENTER, eio(inv(0.25, 0.55, p)));
    } else if (p < 0.65) {
      // Phase 2: green settled as left 50% vertical band
      pts = CLIP_CENTER;
    } else if (p < 0.75) {
      // Expand: right edge accelerates to cover full screen (cinematic flash)
      pts = lp(CLIP_CENTER, CLIP_PEAK, eIn(inv(0.65, 0.75, p)));
    } else if (p < 0.88) {
      // Contract: right edge sweeps back fast then eases into final left diagonal
      pts = lp(CLIP_PEAK, CLIP_FINAL, eOut(inv(0.75, 0.88, p)));
    } else {
      // Phase 3: green settled as center column, logos visible both sides
      pts = CLIP_FINAL;
    }

    return toCp(pts);
  }

  /** Hero (logo + buttons) fades out early in the scroll */
  get heroAlpha(): number {
    return 1 - eio(inv(0.15, 0.35, this.p));
  }

  /** Section 2 text: fades in when green reaches center, fades out before the flash */
  get s2Alpha(): number {
    return eio(inv(0.45, 0.55, this.p)) * (1 - eio(inv(0.60, 0.68, this.p)));
  }

  /** Logos wall fades in during the contract sweep — revealed from behind the green */
  get logosAlpha(): number {
    return eOut(inv(0.75, 0.88, this.p));
  }

  /** Section 3 text fades in once the green has settled on the left */
  get s3Alpha(): number {
    return eio(inv(0.88, 0.97, this.p));
  }

  test() {
    this.router.navigate(['/login']);
  }
}
