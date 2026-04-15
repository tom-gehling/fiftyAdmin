import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

export interface GameResult {
  score?: number;
  scoreLabel?: string;    // e.g. '3 attempts', '7 steps', '12.4s'
  attempts?: number;
  usedHint?: boolean;
  completedAt?: Date;
  shareText?: string;     // Optional Wordle-style share string
}

@Component({
  selector: 'app-game-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, CardModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-4 max-w-2xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-0 m-0">{{ title }}</h2>
          <p class="text-surface-500 text-sm mt-1 mb-0">{{ todayLabel }}</p>
        </div>
        <div class="flex items-center gap-2">
          @if (alreadyPlayed) {
            <p-tag severity="success" value="Completed today" icon="pi pi-check" />
          }
          <a routerLink="/fiftyPlus/games" class="text-surface-400 hover:text-primary transition-colors">
            <i class="pi pi-arrow-left text-lg"></i>
          </a>
        </div>
      </div>

      <!-- Already played state -->
      @if (alreadyPlayed && pastResult) {
        <p-card styleClass="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
          <div class="flex flex-col items-center gap-3 py-4 text-center">
            <i class="pi pi-check-circle text-green-500 text-5xl"></i>
            <div>
              <p class="font-semibold text-lg text-surface-800 dark:text-surface-100 m-0">You've completed today's puzzle!</p>
              @if (pastResult.scoreLabel) {
                <p class="text-surface-500 mt-1 mb-0">{{ pastResult.scoreLabel }}</p>
              }
              @if (pastResult.usedHint) {
                <p class="text-yellow-600 dark:text-yellow-400 text-sm mt-1 mb-0">
                  <i class="pi pi-lightbulb mr-1"></i>Hint used
                </p>
              }
            </div>
            @if (pastResult.shareText) {
              <button pButton
                label="Copy result"
                icon="pi pi-copy"
                severity="secondary"
                size="small"
                (click)="copyShareText(pastResult!.shareText!)">
              </button>
            }
            <p class="text-surface-400 text-xs mb-0">Come back tomorrow for a new puzzle</p>
          </div>
        </p-card>
      }

      <!-- Loading state -->
      @if (loading) {
        <div class="flex justify-center items-center py-16">
          <i class="pi pi-spin pi-spinner text-3xl text-primary"></i>
        </div>
      }

      <!-- Game content -->
      @if (!alreadyPlayed && !loading) {
        <ng-content></ng-content>
      }

      <!-- Completion overlay (shown after finishing) -->
      @if (showCompletion && completionResult) {
        <p-card styleClass="border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950/30">
          <div class="flex flex-col items-center gap-3 py-4 text-center">
            <i class="pi pi-trophy text-yellow-500 text-5xl"></i>
            <div>
              <p class="font-bold text-xl text-surface-800 dark:text-surface-100 m-0">Puzzle complete!</p>
              @if (completionResult.scoreLabel) {
                <p class="text-surface-600 dark:text-surface-300 mt-1 mb-0 text-lg">{{ completionResult.scoreLabel }}</p>
              }
              @if (completionResult.usedHint) {
                <p class="text-yellow-600 dark:text-yellow-400 text-sm mt-1 mb-0">
                  <i class="pi pi-lightbulb mr-1"></i>Hint used
                </p>
              }
            </div>
            @if (completionResult.shareText) {
              <button pButton
                label="Share result"
                icon="pi pi-share-alt"
                (click)="copyShareText(completionResult!.shareText!)">
              </button>
            }
            <a routerLink="/fiftyPlus/games">
              <button pButton label="Back to games" icon="pi pi-bolt" severity="secondary" size="small"></button>
            </a>
          </div>
        </p-card>
      }

    </div>
  `
})
export class GameShellComponent {
  @Input() title = '';
  @Input() loading = false;
  @Input() alreadyPlayed = false;
  @Input() pastResult: GameResult | null = null;
  @Input() showCompletion = false;
  @Input() completionResult: GameResult | null = null;
  @Output() shareCopied = new EventEmitter<void>();

  get todayLabel(): string {
    return new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  async copyShareText(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.shareCopied.emit();
    } catch {
      // Clipboard not available — silently ignore
    }
  }
}
