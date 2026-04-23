import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef, HostBinding, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { GameType } from '@/shared/models/puzzle.model';
import { getGameTheme } from '../game-theme';

export interface GameResult {
    score?: number;
    scoreLabel?: string; // e.g. '3 attempts', '7 steps', '12.4s'
    attempts?: number;
    usedHint?: boolean;
    completedAt?: Date;
    shareText?: string; // Optional Wordle-style share string
}

@Component({
    selector: 'app-game-shell',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule, CardModule, TagModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex flex-col gap-5 max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 w-full">
            <!-- Header -->
            <div>
                <div class="flex items-center pb-3">
                    <a
                        routerLink="/fiftyPlus/games"
                        class="w-11 h-11 flex items-center justify-center rounded-xl text-surface-500 hover:text-surface-900 dark:hover:text-surface-0 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all flex-shrink-0"
                    >
                        <i class="pi pi-arrow-left text-lg"></i>
                    </a>
                    <h2 class="game-title text-3xl sm:text-4xl m-0 flex-1 text-center" style="color: var(--game-color)">{{ title }}</h2>
                    <div class="w-11 flex-shrink-0">
                        @if (alreadyPlayed || showCompletion) {
                            <span class="flex items-center justify-center w-9 h-9 rounded-full" style="background-color: var(--game-color)">
                                <i class="pi pi-check text-sm font-bold text-white"></i>
                            </span>
                        }
                    </div>
                </div>
                <div class="game-color-bar h-1.5 w-full mb-3"></div>
                <p class="game-eyebrow text-center m-0">{{ todayLabel }}</p>
            </div>

            <!-- Loading state -->
            @if (loading) {
                <div class="flex justify-center items-center py-16">
                    <i class="pi pi-spin pi-spinner text-3xl" style="color: var(--game-color)"></i>
                </div>
            }

            <!-- Game content — always visible once loaded -->
            @if (!loading) {
                <ng-content></ng-content>
            }
        </div>

        <!-- Modal overlay — completion or already-played -->
        @if (showModal && !loading) {
            @if ((showCompletion && completionResult) || (alreadyPlayed && pastResult)) {
                <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-6" (click)="dismissModal()">
                    <div class="rounded-2xl border-2 max-w-sm w-full p-6 sm:p-8 text-center shadow-2xl bg-white dark:bg-surface-900 max-h-[90dvh] overflow-y-auto" style="border-color: var(--game-color)" (click)="$event.stopPropagation()">
                        @if (showCompletion && completionResult) {
                            <div class="text-5xl mb-4">🎉</div>
                            <p class="game-title text-3xl text-surface-800 dark:text-surface-100 m-0">Puzzle complete!</p>
                            @if (completionResult.scoreLabel) {
                                <p class="text-surface-600 dark:text-surface-300 text-2xl font-bold mt-2 mb-0">{{ completionResult.scoreLabel }}</p>
                            }
                            @if (completionResult.usedHint) {
                                <p class="text-yellow-600 dark:text-yellow-400 text-base mt-2 mb-0">💡 Hint used</p>
                            }
                            <div class="flex flex-col items-center gap-3 mt-6">
                                @if (completionResult.shareText) {
                                    <button pButton label="Share result" icon="pi pi-share-alt" class="game-action w-full" (click)="copyShareText(completionResult!.shareText!)"></button>
                                }
                                <button pButton label="View puzzle" icon="pi pi-eye" severity="secondary" class="w-full" (click)="dismissModal()"></button>
                                <a routerLink="/fiftyPlus/games" class="w-full">
                                    <button pButton label="All games" icon="pi pi-th-large" severity="secondary" class="w-full"></button>
                                </a>
                            </div>
                            <p class="text-surface-400 text-sm mt-4 mb-0">New puzzle tomorrow</p>
                        }

                        @if (!showCompletion && alreadyPlayed && pastResult) {
                            <div class="text-5xl mb-4">✅</div>
                            <p class="game-title text-2xl text-surface-800 dark:text-surface-100 m-0 mb-2">Already solved!</p>
                            @if (pastResult.scoreLabel) {
                                <p class="text-surface-500 text-lg mt-1 mb-0">{{ pastResult.scoreLabel }}</p>
                            }
                            @if (pastResult.usedHint) {
                                <p class="text-yellow-600 dark:text-yellow-400 text-base mt-2 mb-0">💡 Hint used</p>
                            }
                            <div class="flex flex-col items-center gap-3 mt-6">
                                @if (pastResult.shareText) {
                                    <button pButton label="Copy result" icon="pi pi-copy" class="game-action w-full" (click)="copyShareText(pastResult!.shareText!)"></button>
                                }
                                <button pButton label="View puzzle" icon="pi pi-eye" severity="secondary" class="w-full" (click)="dismissModal()"></button>
                                <a routerLink="/fiftyPlus/games" class="w-full">
                                    <button pButton label="All games" icon="pi pi-th-large" severity="secondary" class="w-full"></button>
                                </a>
                            </div>
                            <p class="text-surface-400 text-sm mt-4 mb-0">New puzzle tomorrow</p>
                        }
                    </div>
                </div>
            }
        }
    `
})
export class GameShellComponent implements OnChanges {
    private cdr = inject(ChangeDetectorRef);

    @Input() title = '';
    @Input() loading = false;
    @Input() alreadyPlayed = false;
    @Input() pastResult: GameResult | null = null;
    @Input() showCompletion = false;
    @Input() completionResult: GameResult | null = null;
    @Input() gameType?: GameType;
    @Input() completionModalDelayMs = 1000;
    @Output() shareCopied = new EventEmitter<void>();

    showModal = true;
    private modalTimer: ReturnType<typeof setTimeout> | null = null;

    @HostBinding('style.--game-color') get gameColorVar(): string {
        return getGameTheme(this.gameType).color;
    }
    @HostBinding('style.--game-color-soft') get gameColorSoftVar(): string {
        return getGameTheme(this.gameType).colorSoft;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['alreadyPlayed']?.currentValue === true) {
            this.showModal = true;
            this.cdr.markForCheck();
        }
        if (changes['showCompletion']?.currentValue === true) {
            this.showModal = false;
            this.cdr.markForCheck();
            if (this.modalTimer) clearTimeout(this.modalTimer);
            this.modalTimer = setTimeout(() => {
                this.showModal = true;
                this.cdr.markForCheck();
            }, this.completionModalDelayMs);
        }
    }

    dismissModal(): void {
        this.showModal = false;
        this.cdr.markForCheck();
    }

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
