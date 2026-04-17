import {
  Component, OnInit, OnDestroy, AfterViewInit,
  NgZone, ChangeDetectorRef, ViewChild, ElementRef
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// Clip-path: 8 values [x0,y0, x1,y1, x2,y2, x3,y3]
// polygon(x0% y0%, x1% y1%, x2% y2%, x3% y3%) — points: TL, TR, BR, BL
const CLIP_RIGHT  = [65,0,  100,0, 100,100, 45,100]; // hero — green on right
const CLIP_LEFT   = [0,0,   35,0,  55,100,  0,100 ]; // green on left
const CLIP_PEAK   = [0,0,  100,0, 100,100,  0,100 ]; // full screen flash
const CLIP_TOP_HALF = [0,0,  100,0, 100,50,  0,50  ]; // top half
const CLIP_BOTTOM   = [0,50, 100,50, 100,100, 0,100 ]; // bottom half

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lp   = (a: number[], b: number[], t: number) => a.map((v, i) => lerp(v, b[i], t));
const toCp = ([x0,y0,x1,y1,x2,y2,x3,y3]: number[]) =>
  `polygon(${x0}% ${y0}%, ${x1}% ${y1}%, ${x2}% ${y2}%, ${x3}% ${y3}%)`;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const inv   = (a: number, b: number, v: number) => clamp((v - a) / (b - a), 0, 1);
const eio   = (t: number) => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const eIn   = (t: number) => t * t * t;
const eOut  = (t: number) => 1 - (1 - t) ** 3;

const LOGOS = [
  'aussie.png', 'boomer.png', 'chrissy.png', 'footy.png', 'loser.png',
  'movie2.png', 'olympic.png', 'people50.png', 'peoples.png', 'reality.png',
  'specialsLogo.png', 'spooky.png', 'weekly-hundred.png', 'yearly-22022.png',
  'yeswequiz.png', 'twf.png', 'archivesLogo.png', 'EURO.png', 'Movie.png',
  'SA.png', 'Yearl-2023.png', 'fiftyplus.png', '2010s-clear-1.png',
  'HOTTEST-20 (1).png', 'swifty (1).png'
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule],
  template: `
    <!-- Tall scroll container — 600vh for 5 scenes -->
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

        <!-- LAYER 2: Logos wall — fades in for Fifty+ section, with heartbeat pulse -->
        <div class="logos-wall" [style.opacity]="logosAlpha">
          <img *ngFor="let logo of logos; let i = index"
               [src]="'assets/logos/' + logo"
               [alt]="logo"
               [class.logo-active]="activeLogo === i" />
        </div>

        <!-- LAYER 3: Green overlay — clip-path drives the 5-section journey -->
        <div class="green-shadow-wrapper">
          <div class="green-overlay" [style.clipPath]="clipPath"></div>
        </div>

        <!-- LAYER 4: Quiz Nights video background (above green) -->
        <div class="s4-video-layer" [style.opacity]="s4Alpha">
          <video #videoEl autoplay muted loop playsinline preload="auto">
            <source src="assets/videos/nearly.mp4" type="video/mp4" />
          </video>
          <div class="s4-scrim"></div>
        </div>

        <!-- SECTION 2: A fresh fifty every week -->
        <div class="section-overlay s2-overlay" [style.opacity]="s2Alpha">
          <div class="s2-content">
            <div class="section-eyebrow">This Week</div>
            <div class="section-headline">A fresh fifty<br>every week</div>
            <div class="section-body">Play from anywhere. New quiz every week.</div>
            <button routerLink="/weekly-quiz" class="section-btn"
                    [style.pointerEvents]="s2Alpha < 0.05 ? 'none' : 'auto'">
              Play This Week's Quiz
            </button>
          </div>
        </div>

        <!-- SECTION 3: Fifty+ -->
        <div class="section-overlay s3-overlay" [style.opacity]="s3Alpha">
          <!-- Upper content sits on the green (top half) -->
          <div class="s3-upper">
            <div class="s3-headline">Unlock the full<br>Fifty+ experience</div>
            <div class="s3-tagline">Join thousands of quiz enthusiasts with access to everything Fifty+ has to offer.</div>
            <div class="s3-benefits">
              <div class="s3-benefit" *ngFor="let b of benefits">
                <span class="benefit-label">{{ b.label }}</span>
              </div>
            </div>
            <button routerLink="/join" class="section-btn"
                    [style.pointerEvents]="s3Alpha < 0.05 ? 'none' : 'auto'">
              Join Now
            </button>
          </div>
          <!-- Fifty+ logo straddling the green boundary -->
          <div class="s3-logo">
            <img src="assets/logos/fiftyplus.png" alt="Fifty+" />
          </div>
        </div>

        <!-- SECTION 4: Quiz Nights content (above the video layer) -->
        <div class="section-overlay s4-content-overlay" [style.opacity]="s4Alpha">
          <div class="s4-content">
            <div class="section-eyebrow">Near You</div>
            <div class="section-headline">Quiz Nights</div>
            <div class="section-body" style="margin-top:20%;">Get a team together and head to one of our amazing venues near you</div>
            <button routerLink="/find-a-venue" class="section-btn"
                    [style.pointerEvents]="s4Alpha < 0.05 ? 'none' : 'auto'">
              Find a Venue
            </button>
          </div>
        </div>

        <!-- SECTION 5: Shop -->
        <div class="section-overlay s5-overlay" [style.opacity]="s5Alpha">
          <div class="s5-content">
            <div class="section-eyebrow">Merch</div>
            <div class="section-headline">The Fifty Shop</div>
            <div class="section-body">Gear up with official Weekly Fifty merch</div>
            <div class="s5-images">
              <div class="s5-placeholder-img"></div>
              <div class="s5-placeholder-img"></div>
              <div class="s5-placeholder-img"></div>
            </div>
            <a href="https://theweeklyfifty.com.au/pshop/" target="_blank" rel="noopener"
               class="section-btn section-btn-link"
               [style.pointerEvents]="s5Alpha < 0.05 ? 'none' : 'auto'">
              Visit the Shop
            </a>
          </div>
        </div>

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
      height: 600vh;
      width: 100vw;
      background-color: #1a1a1a;
      color: var(--fifty-pink);
    }

    .scroll-container {
      height: 600vh;
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

    /* ─── LAYER 2: Logos wall — occupies the non-green half in Fifty+ section ── */
    .logos-wall {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      bottom: 0;
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

    .logos-wall img.logo-active {
      animation: heartbeat 0.6s ease-in-out;
    }

    @keyframes heartbeat {
      0%   { transform: scale(1);    opacity: 0.85; }
      30%  { transform: scale(1.35); opacity: 1; }
      60%  { transform: scale(1.12); opacity: 0.95; }
      100% { transform: scale(1);    opacity: 0.85; }
    }

    /* ─── LAYER 3: Green overlay ─────────────────────────────────── */
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

    /* ─── LAYER 4: Quiz Nights video background ──────────────────── */
    .s4-video-layer {
      position: absolute;
      inset: 0;
      z-index: 15;
      overflow: hidden;
      pointer-events: none;
      /* clip to top half — green remains visible on bottom half */
      clip-path: polygon(0% 0%, 100% 0%, 100% 50%, 0% 50%);
    }

    .s4-video-layer video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .s4-scrim {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.52);
      z-index: 1;
    }

    /* ─── Section overlay base ───────────────────────────────────── */
    .section-overlay {
      position: absolute;
      inset: 0;
      z-index: 100;
      pointer-events: none;
    }

    /* ─── Shared section text styles ────────────────────────────── */
    .section-eyebrow {
      font-size: clamp(0.65rem, 1.4vw, 0.95rem);
      font-weight: 400;
      letter-spacing: 0.4em;
      text-transform: uppercase;
      opacity: 0.6;
      margin-bottom: 0.6rem;
      color: var(--fifty-pink);
    }

    .section-headline {
      font-size: clamp(2.8rem, 7vw, 6rem);
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 0.92;
      color: var(--fifty-pink);
      margin-bottom: 1rem;
    }

    .section-body {
      font-size: clamp(1.15rem, 1.6vw, 1.80rem);
      line-height: 1.65;
      opacity: 0.75;
      letter-spacing: 0.03em;
      color: var(--fifty-pink);
    }

    .section-btn {
      display: inline-block;
      margin-top: 1.6rem;
      padding: 0.8rem 2.4rem;
      font-size: clamp(0.8rem, 1.3vw, 0.95rem);
      font-weight: 700;
      color: var(--fifty-pink);
      background: var(--fifty-green);
      border: 2px solid var(--fifty-pink);
      border-radius: 8px;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(0,0,0,0.35);
      transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
      pointer-events: auto;
    }

    .section-btn:hover {
      transform: translateY(-2px) scale(1.04);
      background: rgba(103, 124, 115, 0.75);
      box-shadow: 0 6px 20px rgba(0,0,0,0.45);
    }

    .section-btn-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    /* ─── SECTION 2: Weekly Quiz ─────────────────────────────────── */
    .s2-overlay {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: clamp(1.5rem, 5vw, 4rem);
    }

    .s2-content {
      position: relative;
      z-index: 1;
      width: clamp(260px, 42%, 520px);
      color: var(--fifty-pink);
      text-align: left;
    }

    /* ─── SECTION 3: Fifty+ ──────────────────────────────────────── */
    .s3-overlay {
      /* no flex — children are absolutely positioned */
    }

    .s3-upper {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 48%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.2rem clamp(1rem, 10vw, 7rem) 0;
      text-align: center;
      gap: 0.35rem;
      color: var(--fifty-pink);
    }

    .s3-headline {
      font-size: clamp(1.5rem, 3.2vw, 2.6rem);
      font-weight: 900;
      line-height: 1.0;
      letter-spacing: -0.02em;
      color: var(--fifty-pink);
      margin-bottom: 0.3rem;
    }

    .s3-tagline {
      font-size: clamp(0.7rem, 1.2vw, 0.9rem);
      opacity: 0.68;
      color: var(--fifty-pink);
      max-width: 480px;
      margin-bottom: 0.4rem;
    }

    .s3-benefits {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.9rem 1.8rem;
      max-width: 640px;
      width: 100%;
      margin-bottom: 0.2rem;
    }

    .s3-benefit {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.05rem;
    }

    .benefit-label {
      font-size: clamp(0.58rem, 0.95vw, 0.72rem);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--fifty-pink);
      opacity: 0.9;
    }

    .benefit-desc {
      font-size: clamp(0.52rem, 0.82vw, 0.62rem);
      color: var(--fifty-pink);
      opacity: 0.5;
    }

    /* Fifty+ logo straddling the green boundary at 50% */
    .s3-logo {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 101;
      pointer-events: none;
    }

    .s3-logo img {
      width: clamp(130px, 28vw, 260px);
      height: auto;
      filter: drop-shadow(0 4px 28px rgba(0,0,0,0.7));
    }

    /* ─── SECTION 4: Quiz Nights ─────────────────────────────────── */
    .s4-content-overlay {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .s4-content {
      text-align: center;
      pointer-events: auto;
    }

    /* ─── SECTION 5: Shop ────────────────────────────────────────── */
    .s5-overlay {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .s5-content {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: auto;
    }

    .s5-images {
      display: flex;
      gap: clamp(0.8rem, 2vw, 1.5rem);
      margin: 1.8rem 0 0.5rem;
    }

    .s5-placeholder-img {
      width: clamp(100px, 14vw, 190px);
      height: clamp(130px, 18vw, 250px);
      background: rgba(255, 255, 255, 0.07);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
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

    /* ─── Hero content ───────────────────────────────────────────── */
    .hero-content {
      position: absolute;
      inset: 0;
      z-index: 150;
    }

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
      .scroll-hint-chevron,
      .logos-wall img.logo-active {
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

      .navbar { top: 1rem; right: 1rem; }

      .s2-overlay {
        padding-right: 1.2rem;
        justify-content: flex-end;
      }

      .s2-content { width: clamp(200px, 55%, 440px); }

      .s3-benefits { grid-template-columns: repeat(2, 1fr); }

      .s5-images { gap: 0.8rem; }
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

      .navbar { top: 0.75rem; right: 0.75rem; }

      .auth-btn {
        padding: 0.4rem 0.8rem;
        font-size: 0.85rem;
      }

      .scroll-hint { display: none; }

      /* Section 2 */
      .s2-overlay {
        justify-content: center;
        padding: 0 1.2rem;
      }

      .s2-bg {
        background: rgba(26,26,26,0.75);
      }

      .s2-content {
        width: 100%;
        text-align: center;
      }

      /* Section 3 */
      .s3-upper {
        padding: 1rem 1rem 0;
      }

      .s3-benefits {
        grid-template-columns: 1fr 1fr;
        gap: 0.3rem 0.8rem;
      }

      /* Section 5 */
      .s5-placeholder-img {
        width: clamp(80px, 26vw, 120px);
        height: clamp(105px, 34vw, 160px);
      }

      .s5-images { gap: 0.6rem; }
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

  readonly benefits = [
    { label: 'Full Quiz Archives', desc: 'Every quiz ever run' },
    { label: 'Exclusive Quizzes', desc: 'Premium content for members' },
    { label: 'Collaborations', desc: 'Special events & team content' },
    { label: 'Stats & Leaderboards', desc: 'Track your performance' },
    { label: 'Question Quizzes', desc: 'Unique question-based challenges' },
  ];

  /** Normalised scroll progress: 0 = top, 1 = bottom of scroll range */
  p = 0;

  activeLogo = -1;

  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;

  private rafId = 0;
  private pulseInterval: any;

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
    this.pulseInterval = setInterval(() => {
      this.activeLogo = Math.floor(Math.random() * this.logos.length);
      this.cdr.detectChanges();
    }, 1200);
    this.videoEl?.nativeElement.play().catch(() => {});
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.handler);
    cancelAnimationFrame(this.rafId);
    clearInterval(this.pulseInterval);
  }

  // ── Scroll-driven computed values ────────────────────────────────

  /** Green overlay clip-path — five-section journey:
   *  RIGHT → (flash) → LEFT → (flash) → TOP_HALF → (slide) → BOTTOM → (expand) → PEAK */
  get clipPath(): string {
    const { p } = this;
    let pts: number[];

    if (p < 0.10) {
      // Section 1: hero — green on right
      pts = CLIP_RIGHT;
    } else if (p < 0.22) {
      // Transition 1→2: RIGHT flash-wipe to LEFT
      const t = inv(0.10, 0.22, p);
      pts = t < 0.5
        ? lp(CLIP_RIGHT, CLIP_PEAK, eIn(t * 2))
        : lp(CLIP_PEAK, CLIP_LEFT, eOut((t - 0.5) * 2));
    } else if (p < 0.32) {
      // Section 2: weekly quiz — green on left
      pts = CLIP_LEFT;
    } else if (p < 0.45) {
      // Transition 2→3: LEFT flash then contracts to TOP half
      const t = inv(0.32, 0.45, p);
      pts = t < 0.5
        ? lp(CLIP_LEFT, CLIP_PEAK, eIn(t * 2))
        : lp(CLIP_PEAK, CLIP_TOP_HALF, eOut((t - 0.5) * 2));
    } else if (p < 0.55) {
      // Section 3: Fifty+ — green on top half, logos below
      pts = CLIP_TOP_HALF;
    } else if (p < 0.67) {
      // Transition 3→4: green slides down from top half to bottom half
      pts = lp(CLIP_TOP_HALF, CLIP_BOTTOM, eio(inv(0.55, 0.67, p)));
    } else if (p < 0.83) {
      // Section 4: green stays on bottom (covered by video layer above)
      pts = CLIP_BOTTOM;
    } else if (p < 0.92) {
      // Transition 4→5: green expands from bottom to full screen
      pts = lp(CLIP_BOTTOM, CLIP_PEAK, eio(inv(0.83, 0.92, p)));
    } else {
      // Section 5: shop — full screen green
      pts = CLIP_PEAK;
    }

    return toCp(pts);
  }

  /** Hero fades out as scroll begins */
  get heroAlpha(): number {
    return 1 - eio(inv(0.06, 0.14, this.p));
  }

  /** Section 2 (weekly quiz) — fades in when green settles on left, fades out before next transition */
  get s2Alpha(): number {
    return eio(inv(0.20, 0.27, this.p)) * (1 - eio(inv(0.30, 0.37, this.p)));
  }

  /** Section 3 (Fifty+) — fades in as green settles on top half, fades out as it slides down */
  get s3Alpha(): number {
    return eio(inv(0.43, 0.50, this.p)) * (1 - eio(inv(0.53, 0.60, this.p)));
  }

  /** Logos wall — visible only during Fifty+ section (shows in bottom half behind green) */
  get logosAlpha(): number {
    return eio(inv(0.43, 0.50, this.p)) * (1 - eio(inv(0.53, 0.60, this.p)));
  }

  /** Section 4 (quiz nights) — fades in after green slides to bottom, fades out before transition 4→5 */
  get s4Alpha(): number {
    return eio(inv(0.67, 0.73, this.p)) * (1 - eio(inv(0.76, 0.82, this.p)));
  }

  /** Section 5 (shop) — fades in on full green background */
  get s5Alpha(): number {
    return eio(inv(0.89, 0.95, this.p));
  }

  test() {
    this.router.navigate(['/login']);
  }
}
