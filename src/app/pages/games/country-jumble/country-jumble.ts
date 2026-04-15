import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { GameShellComponent, GameResult } from '../shared/game-shell/game-shell';
import { DailySeedService } from '@/shared/services/daily-seed.service';
import { PuzzleResultService } from '@/shared/services/puzzle-result.service';
import { AuthService } from '@/shared/services/auth.service';
import { NotifyService } from '@/shared/services/notify.service';

interface Country { name: string; continent: string; }

@Component({
  selector: 'app-country-jumble',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, CardModule, TagModule, GameShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-game-shell
      title="Country Jumble"
      [loading]="loading"
      [alreadyPlayed]="alreadyPlayed"
      [pastResult]="pastResult"
      [showCompletion]="showCompletion"
      [completionResult]="completionResult"
      (shareCopied)="onShareCopied()">

      @if (!loading && !alreadyPlayed && !showCompletion) {
        <div class="flex flex-col gap-4">

          <!-- Streak banner -->
          @if (currentStreak > 1) {
            <div class="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
              <i class="pi pi-fire text-orange-500"></i>
              <span class="text-sm text-orange-700 dark:text-orange-300 font-medium">
                {{ currentStreak }}-day streak! Keep it going.
              </span>
            </div>
          }

          <!-- Jumbled letters -->
          <p-card>
            <div class="flex flex-col items-center gap-4 py-2">
              <p class="text-surface-500 text-sm m-0">Unscramble this country name</p>
              <div class="flex flex-wrap justify-center gap-2">
                @for (letter of jumbledLetters; track $index) {
                  <div class="w-10 h-10 flex items-center justify-center rounded-lg
                              bg-primary text-white font-bold text-lg shadow-sm">
                    {{ letter }}
                  </div>
                }
              </div>
            </div>
          </p-card>

          <!-- Hint -->
          @if (!hintShown) {
            <button pButton
              label="Reveal continent hint"
              icon="pi pi-lightbulb"
              severity="secondary"
              size="small"
              class="w-fit self-center"
              (click)="showHint()">
            </button>
          } @else {
            <div class="flex items-center justify-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
              <i class="pi pi-lightbulb"></i>
              <span>This country is in <strong>{{ todayCountry?.continent }}</strong></span>
            </div>
          }

          <!-- Answer input -->
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-surface-700 dark:text-surface-200">Your answer</label>
            <div class="flex gap-2">
              <input pInputText
                [(ngModel)]="userAnswer"
                placeholder="Type the country name..."
                class="flex-1"
                [class.ng-invalid]="showError"
                (keydown.enter)="submit()"
                autocomplete="off"
                autocorrect="off"
                spellcheck="false" />
              <button pButton
                label="Submit"
                icon="pi pi-check"
                (click)="submit()"
                [disabled]="!userAnswer.trim()">
              </button>
            </div>
            @if (showError) {
              <p class="text-red-500 text-sm m-0">
                <i class="pi pi-times-circle mr-1"></i>Not quite! Try again.
              </p>
            }
            @if (attempts > 1) {
              <p class="text-surface-400 text-xs m-0">{{ attempts }} attempts so far</p>
            }
          </div>

        </div>
      }

    </app-game-shell>
  `
})
export class CountryJumbleComponent implements OnInit {
  private http = inject(HttpClient);
  private seed = inject(DailySeedService);
  private puzzleResult = inject(PuzzleResultService);
  private auth = inject(AuthService);
  private notify = inject(NotifyService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  alreadyPlayed = false;
  showCompletion = false;
  pastResult: GameResult | null = null;
  completionResult: GameResult | null = null;

  todayCountry: Country | null = null;
  jumbledLetters: string[] = [];
  userAnswer = '';
  hintShown = false;
  showError = false;
  attempts = 0;
  currentStreak = 0;

  private dateKey = '';
  private startTime = 0;

  async ngOnInit(): Promise<void> {
    this.dateKey = this.seed.getTodayKey();
    const user = this.auth.user$.value;
    if (!user) return;

    // Check if already played
    const existing = await this.puzzleResult.getTodayResult(user.uid, 'countryJumble', this.dateKey);
    if (existing?.status === 'completed') {
      this.alreadyPlayed = true;
      this.pastResult = {
        scoreLabel: existing.score ? `Solved in ${(existing.score / 1000).toFixed(1)}s` : undefined,
        usedHint: existing.usedHint,
        shareText: this.buildShareText(existing.score, existing.usedHint),
      };
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    // Load streak
    const stats = await this.puzzleResult.getUserGameStats(user.uid);
    this.currentStreak = stats?.currentStreak ?? 0;

    // Load countries and pick today's
    const countries = await firstValueFrom(this.http.get<Country[]>('/assets/games/countries.json'));
    this.todayCountry = this.seed.pickFromArray(countries, `countryJumble_${this.dateKey}`);
    this.jumbledLetters = this.buildJumble(this.todayCountry.name);
    this.startTime = Date.now();
    this.loading = false;
    this.cdr.markForCheck();
  }

  showHint(): void {
    this.hintShown = true;
    this.cdr.markForCheck();
  }

  async submit(): Promise<void> {
    const answer = this.userAnswer.trim();
    if (!answer || !this.todayCountry) return;

    this.attempts++;
    if (answer.toLowerCase() === this.todayCountry.name.toLowerCase()) {
      await this.handleSuccess();
    } else {
      this.showError = true;
      this.userAnswer = '';
      setTimeout(() => { this.showError = false; this.cdr.markForCheck(); }, 2000);
    }
    this.cdr.markForCheck();
  }

  onShareCopied(): void {
    this.notify.success('Result copied to clipboard!');
  }

  private async handleSuccess(): Promise<void> {
    const elapsed = Date.now() - this.startTime;
    const user = this.auth.user$.value;
    if (!user) return;

    const result = {
      userId: user.uid,
      gameType: 'countryJumble' as const,
      dateKey: this.dateKey,
      puzzleId: this.dateKey,
      status: 'completed' as const,
      startedAt: new Date(this.startTime),
      completedAt: new Date(),
      score: elapsed,
      attempts: this.attempts,
      usedHint: this.hintShown,
    };

    await this.puzzleResult.saveResult(result);
    const stats = await this.puzzleResult.updateStreak(user.uid, this.dateKey);
    this.currentStreak = stats.currentStreak;

    this.completionResult = {
      scoreLabel: `Solved in ${(elapsed / 1000).toFixed(1)}s${this.hintShown ? ' (hint used)' : ''}`,
      usedHint: this.hintShown,
      shareText: this.buildShareText(elapsed, this.hintShown),
    };
    this.showCompletion = true;
  }

  private buildJumble(name: string): string[] {
    // Preserve spaces, only shuffle alphabetic letters
    const letters = name.replace(/\s/g, '').toUpperCase().split('');
    const shuffled = this.seed.shuffleArray(letters, `countryJumble_shuffle_${this.dateKey}`);
    // Reinsert spaces at original positions
    const result: string[] = [];
    let si = 0;
    for (let i = 0; i < name.length; i++) {
      if (name[i] === ' ') {
        result.push(' ');
      } else {
        result.push(shuffled[si++]);
      }
    }
    return result;
  }

  private buildShareText(score: number | undefined, usedHint: boolean | undefined): string {
    const timeStr = score ? `${(score / 1000).toFixed(1)}s` : '?';
    const hint = usedHint ? ' 💡' : '';
    return `Country Jumble ${this.dateKey}\n⏱ ${timeStr}${hint}\nPlay at fiftyplus.com.au`;
  }
}
