import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule],
  template: `
    <!-- Background with scrolling images -->
    <div class="images-section">
      <!-- 5 rows of scrolling images -->
      <div class="image-row" *ngFor="let row of imageRows; let i = index"
           [class.scroll-left]="i % 2 === 0"
           [class.scroll-right]="i % 2 !== 0">
        <div class="strip-images">
          <ng-container *ngFor="let img of row">
            <img [src]="'assets/submissions/sub' + img + '.jpeg'" />
          </ng-container>
          <!-- Duplicate for seamless loop -->
          <ng-container *ngFor="let img of row">
            <img [src]="'assets/submissions/sub' + img + '.jpeg'" />
          </ng-container>
        </div>
      </div>
    </div>

    <!-- Navbar -->
    <nav class="navbar">
      <div class="auth-buttons">
        <button class="auth-btn" (click)="test()">LOGIN / SIGN UP</button>
      </div>
    </nav>

    <!-- Diagonal green overlay -->
    <div class="green-overlay"></div>

    <!-- Menu buttons -->
    <div class="menu-wrapper">
      <div class="menu-buttons">
        <button routerLink="/weekly-quiz" class="menu-btn">QUIZ</button>
        <button routerLink="/login" class="menu-btn">FIFTY+</button>
        <button routerLink="/findavenue" class="menu-btn">FIND A VENUE</button>
        <button routerLink="/fiftyshop" class="menu-btn">SHOP</button>
      </div>
    </div>

    <!-- Logo centered on entire screen -->
    <div class="main-logo">
      <img src="assets/logos/logo.png" alt="Fifty Logo" />
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
      background-color: #1a1a1a;
      color: var(--fifty-pink);
      position: relative;
      overflow: hidden;
    }

    /* Images section - left side with scrolling rows */
    .images-section {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
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

    .scroll-left .strip-images {
      animation: scrollLeft 30s linear infinite;
    }

    .scroll-right .strip-images {
      animation: scrollRight 30s linear infinite;
    }

    .strip-images img {
      height: 100%;
      width: auto;
      object-fit: cover;
      flex-shrink: 0;
      opacity: 0.3;
    }

    @keyframes scrollLeft {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    @keyframes scrollRight {
      0% { transform: translateX(-50%); }
      100% { transform: translateX(0); }
    }

    /* Diagonal green overlay */
    .green-overlay {
      position: absolute;
      top: -10%;
      right: -5%;
      width: 60%;
      height: 120%;
      background-color: var(--fifty-green);
      z-index: 10;
      clip-path: polygon(35% 0, 100% 0, 100% 100%, 0% 100%);
    }

    /* Deep shadow for green overlay - separate element to work with clip-path */
    .green-overlay::before {
      content: '';
      position: absolute;
      top: 0;
      left: -120px;
      width: 120px;
      height: 100%;
      background: linear-gradient(to right,
        transparent 0%,
        rgba(0, 0, 0, 0.4) 20%,
        rgba(0, 0, 0, 0.6) 50%,
        rgba(0, 0, 0, 0.85) 100%
      );
      transform: skewX(-15deg);
      transform-origin: top;
      filter: blur(25px);
    }

    /* Inner edge highlight for depth */
    .green-overlay::after {
      content: '';
      position: absolute;
      top: 0;
      left: -3px;
      width: 3px;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      transform: skewX(-15deg);
      transform-origin: top;
      filter: blur(2px);
    }

    /* Navbar - positioned relative to viewport */
    .navbar {
      position: fixed;
      top: 1.5rem;
      right: 2rem;
      display: flex;
      justify-content: flex-end;
      z-index: 200;
    }

    .auth-buttons {
      display: flex;
    }

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

    /* Logo - centered on entire screen */
    .main-logo {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 100;
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

    /* Menu wrapper - fixed to bottom right */
    .menu-wrapper {
      position: fixed;
      bottom: 3rem;
      right: 2rem;
      z-index: 150;
    }

    /* Menu buttons container - vertical stack */
    .menu-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: auto;
      max-width: 450px;
    }

    /* Individual buttons */
    .menu-btn {
      width: 100%;
      height: 90px;
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

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .green-overlay {
        width: 60%;
        clip-path: polygon(35% 0, 100% 0, 100% 100%, 0% 100%);
      }

      .navbar {
        top: 1rem;
        right: 1rem;
      }

      .main-logo img {
        width: 70vw;
        max-width: 500px;
      }

      .menu-wrapper {
        bottom: 2rem;
        right: 1.5rem;
      }

      .menu-btn {
        font-size: 1.8rem;
      }
    }

    @media (max-width: 480px) {
      .green-overlay {
        width: 60%;
        clip-path: polygon(35% 0, 100% 0, 100% 100%, 0% 100%);
      }

      .navbar {
        top: 0.75rem;
        right: 0.75rem;
      }

      .auth-btn {
        padding: 0.4rem 0.8rem;
        font-size: 0.85rem;
      }

      .main-logo img {
        width: 80vw;
        min-width: 250px;
      }

      .menu-wrapper {
        bottom: 1.5rem;
        right: 1rem;
      }

      .menu-buttons {
        gap: 7.5px;
      }

      .menu-btn {
        height: 67.5px;
        font-size: 1.5rem;
        margin-left: 7.5px;
        margin-right: 7.5px;
        border-width: 2px;
        border-radius: 6px;
        box-shadow: 0 4.5px 11.25px rgba(0,0,0,0.3);
      }

      .menu-btn:hover {
        box-shadow: 0 6px 12px rgba(0,0,0,0.4);
      }
    }
  `]
})
export class HomePage implements OnInit {
  // 5 rows of images, each with different arrangements for variety
  imageRows = [
    [1, 2, 3, 4, 5, 6, 7],
    [7, 6, 5, 4, 3, 2, 1],
    [2, 4, 6, 1, 3, 5, 7],
    [5, 3, 1, 7, 6, 4, 2],
    [1, 3, 5, 7, 2, 4, 6]
  ];

  constructor(private router: Router) {}

  async ngOnInit() {}

  test(){
    this.router.navigate(['/login']);
  }

}
