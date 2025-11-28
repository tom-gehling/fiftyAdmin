import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule],
  template: `
    <!-- Navbar -->
    <nav class="navbar">
      <div class="auth-buttons">
        <button class="auth-btn">LOGIN / SIGN UP</button>
      </div>
    </nav>

    <!-- Hero Section -->
    <div class="hero-container">
      <!-- Image strip -->
      <div class="image-strip">
        <div class="strip-images">
          <ng-container *ngFor="let n of [1,2,3,4,5,6,7,1,2,3,4,5,6,7]">
            <img src="assets/submissions/sub{{n}}.jpeg" />
          </ng-container>
        </div>
      </div>

      <!-- Logo -->
      <div class="main-logo">
        <img src="assets/logos/logo.png" alt="Fifty Logo" />
      </div>

      <!-- Menu buttons centered in green area -->
      <div class="menu-wrapper">
        <div class="menu-buttons">
          <button routerLink="/weekly-quiz" class="menu-btn">QUIZ</button>
          <button routerLink="/login" class="menu-btn">FIFTY+</button>
          <button routerLink="/findavenue" class="menu-btn">FIND A VENUE</button>
          <button routerLink="/fiftyshop" class="menu-btn">SHOP</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
      background-color: var(--fifty-green);
      color: var(--fifty-pink);
      position: relative;
      overflow: hidden;
    }

    /* Navbar */
    .navbar {
      position: absolute;
      top: 0;
      width: 100%;
      display: flex;
      justify-content: flex-end;
      padding: 1rem 2rem;
      z-index: 100;
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

    /* Hero container */
    .hero-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      align-items: center;
      justify-content: flex-start;
      position: relative;
    }

    /* Image strip */
    .image-strip {
      height: 50%;
      width: 100%;
      overflow: hidden;
      display: flex;
      align-items: center;
      filter: brightness(40%);
    }

    .strip-images {
      display: flex;
      height: 100%;
      animation: scrollStrip 40s linear infinite;
    }

    .strip-images img {
      height: 100%;
      width: auto;
      object-fit: cover;
      flex-shrink: 0;
    }

    @keyframes scrollStrip {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    /* Logo */
    .main-logo {
      margin-top: -100px;
      display: flex;
      justify-content: center;
      width: 100%;
      z-index: 10;
    }

    .main-logo img {
      width: 80%;
      height: auto;
    }

    /* Menu wrapper to center vertically in remaining green area */
    /* Menu wrapper to center vertically in remaining green area */
.menu-wrapper {
  display: flex;
  flex: 1 1 auto; /* take remaining space */
  align-items: center; /* vertical center */
  justify-content: center;
  width: 100%;
}

/* Menu buttons container */
.menu-buttons {
  display: flex;
  flex-wrap: nowrap; /* prevent wrapping on larger screens */
  justify-content: center;
  gap: 20px;
  max-width: 600px;
  padding: 0 20px;
  width: 100%;
}

/* Individual buttons */
.menu-btn {
  flex: 1 1 0; /* all buttons share the same space equally */
  min-width: 120px; /* ensures they aren’t too small */
  height: 80px;
  font-size: 2rem;
  font-weight: bold;
  color: var(--fifty-pink);
  background: var(--fifty-green);
  border: 2px solid var(--fifty-pink);
  border-radius: 5px;
  cursor: pointer;
  text-transform: uppercase;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 12px rgba(0,0,0,0.25);
  transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.menu-btn:hover {
  transform: translateY(-5px) scale(1.05);
  background: rgba(255,255,255,0.1);
  box-shadow: 0 12px 20px rgba(0,0,0,0.35);
}

/* Small screens: wrap to 2x2 */
@media (max-width: 480px) {
  .menu-buttons {
    flex-wrap: wrap;
    max-width: 80%;
  }

  .menu-btn {
    flex: 1 1 45%; /* two per row */
  }
}

  `]
})
export class HomePage {}
