import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { PuzzleResultService } from '@/shared/services/puzzle-result.service';
import { DailySeedService } from '@/shared/services/daily-seed.service';
import { AuthService } from '@/shared/services/auth.service';
import { GameType } from '@/shared/models/puzzle.model';
import { getGameTheme } from '../shared/game-theme';

interface GameCard {
    type: GameType;
    title: string;
    description: string;
    icon: string;
    route: string;
    available: boolean; // false = coming soon (Phase 2)
    played: boolean;
    scoreLabel?: string;
}

@Component({
    selector: 'app-games-hub',
    standalone: true,
    imports: [CommonModule, RouterModule, CardModule, TagModule, ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex flex-col gap-6 max-w-2xl mx-auto py-2">
            <!-- Header -->
            <div class="text-center pb-5 border-b border-surface-200 dark:border-surface-700">
                <h1 class="game-title text-4xl sm:text-5xl text-surface-900 dark:text-surface-0 m-0 mb-2">Daily Games</h1>
                <p class="game-eyebrow m-0">{{ todayLabel }}</p>
            </div>

            <!-- Progress pills -->
            @if (!loading) {
                <div class="flex items-center justify-center gap-3">
                    <div class="flex gap-2">
                        @for (card of games; track card.type) {
                            @if (card.available) {
                                <div class="h-3 w-10 rounded-full transition-all duration-300" [style]="card.played ? 'background-color: ' + gameColor(card.type) : ''" [class]="card.played ? '' : 'bg-surface-200 dark:bg-surface-700'"></div>
                            }
                        }
                    </div>
                    <span class="text-base font-semibold text-surface-500">{{ playedCount }}/{{ availableCount }}</span>
                </div>
            }

            <!-- Game cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                @for (game of games; track game.type) {
                    <a [routerLink]="game.route" class="block no-underline group">
                        <div
                            class="rounded-2xl border-2 overflow-hidden transition-all duration-200"
                            [class]="
                                game.played ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20' : 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 group-hover:shadow-lg group-hover:-translate-y-0.5'
                            "
                        >
                            <!-- Color accent stripe -->
                            <div class="h-1.5" [style]="'background-color: ' + gameColor(game.type)"></div>

                            <div class="p-5">
                                <!-- Emoji + completed badge -->
                                <div class="flex items-start justify-between mb-3">
                                    <span class="text-4xl">{{ gameEmoji(game.type) }}</span>
                                    @if (game.played) {
                                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-bold bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"> ✓ Done </span>
                                    }
                                </div>

                                <h3 class="game-title text-xl text-surface-800 dark:text-surface-100 m-0 mb-1">{{ game.title }}</h3>
                                <p class="text-base text-surface-500 m-0 leading-snug">{{ game.description }}</p>

                                @if (game.played && game.scoreLabel) {
                                    <p class="text-sm font-semibold mt-3 mb-0" [style]="'color: ' + gameColor(game.type)">
                                        {{ game.scoreLabel }}
                                    </p>
                                }
                                @if (!game.played) {
                                    <p class="text-base font-bold mt-3 mb-0 transition-colors" [style]="'color: ' + gameColor(game.type)">Play →</p>
                                }
                            </div>
                        </div>
                    </a>
                }
            </div>

            @if (loading) {
                <div class="flex justify-center py-12">
                    <i class="pi pi-spin pi-spinner text-3xl text-primary"></i>
                </div>
            }
        </div>
    `
})
export class GamesHubComponent implements OnInit {
    private puzzleResult = inject(PuzzleResultService);
    private seed = inject(DailySeedService);
    private auth = inject(AuthService);
    private cdr = inject(ChangeDetectorRef);

    loading = true;
    games: GameCard[] = [];
    dateKey = '';

    get todayLabel(): string {
        return new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    gameEmoji(type: GameType): string {
        const map: Record<GameType, string> = {
            makeTen: '🔢',
            chainGame: '🔗',
            countryJumble: '🌍',
            movieEmoji: '🎬',
            rushHour: '🧩',
            tileRun: '🏃'
        };
        return map[type] ?? '🎮';
    }

    gameColor(type: GameType): string {
        return getGameTheme(type).color;
    }

    get playedCount(): number {
        return this.games.filter((g) => g.played && g.available).length;
    }

    get availableCount(): number {
        return this.games.filter((g) => g.available).length;
    }

    async ngOnInit(): Promise<void> {
        this.dateKey = this.seed.getTodayKey();
        const user = this.auth.user$.value;

        // Define all games
        const definitions: Omit<GameCard, 'played' | 'scoreLabel'>[] = [
            { type: 'makeTen', title: 'Make 10', description: 'Use 4 numbers with +, −, ×, ÷ to make 10.', icon: 'pi pi-calculator', route: '/fiftyPlus/games/make-ten', available: true },
            { type: 'chainGame', title: 'Word Chain', description: 'Get from one word to another by changing one letter at a time.', icon: 'pi pi-link', route: '/fiftyPlus/games/chain-game', available: true },
            { type: 'countryJumble', title: 'Country Jumble', description: 'Unscramble the jumbled country name.', icon: 'pi pi-globe', route: '/fiftyPlus/games/country-jumble', available: true },
            { type: 'movieEmoji', title: 'Movie Emoji', description: 'Guess the movie from the emoji clues.', icon: 'pi pi-face-smile', route: '/fiftyPlus/games/movie-emoji', available: true },
            { type: 'rushHour', title: 'Puzzle Slide', description: 'Slide the blocks to free the red piece.', icon: 'pi pi-table', route: '/fiftyPlus/games/rush-hour', available: true },
            { type: 'tileRun', title: 'Tile Run', description: 'Touch every tile once to reach the end.', icon: 'pi pi-th-large', route: '/fiftyPlus/games/tile-run', available: true }
        ];

        // Load played state for all games in parallel
        if (user) {
            const results = await Promise.all(definitions.map((d) => this.puzzleResult.getTodayResult(user.uid, d.type, this.dateKey)));

            this.games = definitions.map((d, i) => {
                const result = results[i];
                const played = result?.status === 'completed';
                let scoreLabel: string | undefined;
                if (played && result) {
                    if (d.type === 'makeTen') scoreLabel = result.attempts ? `${result.attempts} attempt${result.attempts > 1 ? 's' : ''}` : undefined;
                    if (d.type === 'chainGame') scoreLabel = result.score !== undefined ? `${result.score} steps (par ${result.metadata?.['par'] ?? '?'})` : undefined;
                    if (d.type === 'countryJumble') scoreLabel = result.score ? `${(result.score / 1000).toFixed(1)}s` : undefined;
                    if (d.type === 'movieEmoji') scoreLabel = result.score !== undefined ? `${result.score}/100` : undefined;
                    if (d.type === 'rushHour') scoreLabel = result.score !== undefined ? `${result.score} moves` : undefined;
                    if (d.type === 'tileRun') scoreLabel = result.metadata?.['restarts'] === 0 ? 'First try!' : result.score !== undefined ? `${result.score} restart${result.score !== 1 ? 's' : ''}` : undefined;
                }
                return { ...d, played, scoreLabel };
            });
        } else {
            this.games = definitions.map((d) => ({ ...d, played: false }));
        }

        this.loading = false;
        this.cdr.markForCheck();
    }
}
