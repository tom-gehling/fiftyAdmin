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

interface GameCard {
  type: GameType;
  title: string;
  description: string;
  icon: string;
  route: string;
  available: boolean;   // false = coming soon (Phase 2)
  played: boolean;
  scoreLabel?: string;
}

@Component({
  selector: 'app-games-hub',
  standalone: true,
  imports: [CommonModule, RouterModule, CardModule, TagModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 max-w-3xl mx-auto">

      <!-- Header -->
      <div>
        <h2 class="text-3xl font-bold text-surface-900 dark:text-surface-0 m-0">Daily Games</h2>
        <p class="text-surface-500 mt-1 mb-0">{{ todayLabel }} — New puzzles each day</p>
      </div>

      <!-- Progress bar -->
      @if (!loading) {
        <div class="flex items-center gap-3">
          <div class="flex gap-1.5 flex-1">
            @for (card of games; track card.type) {
              @if (card.available) {
                <div class="h-2 flex-1 rounded-full transition-colors"
                     [class]="card.played ? 'bg-green-400' : 'bg-surface-200 dark:bg-surface-700'">
                </div>
              }
            }
          </div>
          <span class="text-sm text-surface-400">{{ playedCount }}/{{ availableCount }} done</span>
        </div>
      }

      <!-- Game cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        @for (game of games; track game.type) {
          <div
            class="relative rounded-xl border transition-all overflow-hidden"
            [class]="!game.played
              ? 'border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 hover:border-primary hover:shadow-md cursor-pointer'
              : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20'">

            @if (game.played) {
              <div class="absolute top-3 right-3">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                  <i class="pi pi-check text-xs"></i> Done
                </span>
              </div>
            }

            <a [routerLink]="game.route"
               class="block p-5 no-underline">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                     [class]="game.played ? 'bg-green-100 dark:bg-green-900/40' : 'bg-primary-50 dark:bg-primary-950/30'">
                  <i [class]="game.icon + (game.played ? ' text-green-500' : ' text-primary')"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-surface-800 dark:text-surface-100 m-0 mb-1">{{ game.title }}</h3>
                  <p class="text-sm text-surface-500 m-0 leading-snug">{{ game.description }}</p>
                  @if (game.played && game.scoreLabel) {
                    <p class="text-xs text-green-600 dark:text-green-400 mt-1 mb-0">{{ game.scoreLabel }}</p>
                  }
                </div>
              </div>
            </a>
          </div>
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

  get playedCount(): number {
    return this.games.filter(g => g.played && g.available).length;
  }

  get availableCount(): number {
    return this.games.filter(g => g.available).length;
  }

  async ngOnInit(): Promise<void> {
    this.dateKey = this.seed.getTodayKey();
    const user = this.auth.user$.value;

    // Define all games
    const definitions: Omit<GameCard, 'played' | 'scoreLabel'>[] = [
      { type: 'makeTen',      title: 'Make 10',        description: 'Use 4 numbers with +, −, ×, ÷ to make 10.',                icon: 'pi pi-calculator',  route: '/fiftyPlus/games/make-ten',      available: true },
      { type: 'chainGame',    title: 'Word Chain',     description: 'Get from one word to another by changing one letter at a time.', icon: 'pi pi-link',    route: '/fiftyPlus/games/chain-game',   available: true },
      { type: 'countryJumble',title: 'Country Jumble', description: 'Unscramble the jumbled country name.',                     icon: 'pi pi-globe',       route: '/fiftyPlus/games/country-jumble',available: true },
      { type: 'movieEmoji',   title: 'Movie Emoji',    description: 'Guess the movie from the emoji clues.',                    icon: 'pi pi-face-smile',  route: '/fiftyPlus/games/movie-emoji',   available: true },
      { type: 'rushHour',     title: 'Puzzle Slide',   description: 'Slide the blocks to free the red piece.',                  icon: 'pi pi-table',       route: '/fiftyPlus/games/rush-hour',     available: true },
      { type: 'tileRun',      title: 'Tile Run',       description: 'Touch every tile once to reach the end.',                  icon: 'pi pi-th-large',    route: '/fiftyPlus/games/tile-run',      available: true },
    ];

    // Load played state for all games in parallel
    if (user) {
      const results = await Promise.all(
        definitions.map(d => this.puzzleResult.getTodayResult(user.uid, d.type, this.dateKey))
      );

      this.games = definitions.map((d, i) => {
        const result = results[i];
        const played = result?.status === 'completed';
        let scoreLabel: string | undefined;
        if (played && result) {
          if (d.type === 'makeTen')       scoreLabel = result.attempts ? `${result.attempts} attempt${result.attempts > 1 ? 's' : ''}` : undefined;
          if (d.type === 'chainGame')     scoreLabel = result.score !== undefined ? `${result.score} steps (par ${result.metadata?.['par'] ?? '?'})` : undefined;
          if (d.type === 'countryJumble') scoreLabel = result.score ? `${(result.score / 1000).toFixed(1)}s` : undefined;
          if (d.type === 'movieEmoji')    scoreLabel = result.score !== undefined ? `${result.score}/100` : undefined;
          if (d.type === 'rushHour')      scoreLabel = result.score !== undefined ? `${result.score} moves` : undefined;
          if (d.type === 'tileRun')       scoreLabel = result.metadata?.['restarts'] === 0 ? 'First try!' : result.score !== undefined ? `${result.score} restart${result.score !== 1 ? 's' : ''}` : undefined;
        }
        return { ...d, played, scoreLabel };
      });
    } else {
      this.games = definitions.map(d => ({ ...d, played: false }));
    }

    this.loading = false;
    this.cdr.markForCheck();
  }
}
