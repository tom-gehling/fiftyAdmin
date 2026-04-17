import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { GameShellComponent, GameResult } from '../shared/game-shell/game-shell';
import { DailySeedService } from '@/shared/services/daily-seed.service';
import { WordListService, WordPair } from '@/shared/services/word-list.service';
import { PuzzleResultService } from '@/shared/services/puzzle-result.service';
import { AuthService } from '@/shared/services/auth.service';
import { NotifyService } from '@/shared/services/notify.service';

@Component({
  selector: 'app-chain-game',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, CardModule, TagModule, GameShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-game-shell
      title="Word Chain"
      [loading]="loading"
      [alreadyPlayed]="alreadyPlayed"
      [pastResult]="pastResult"
      [showCompletion]="showCompletion"
      [completionResult]="completionResult"
      (shareCopied)="onShareCopied()">

      @if (!loading) {
        <div class="flex flex-col gap-4"
             [class]="(alreadyPlayed || showCompletion) ? 'pointer-events-none opacity-60 select-none' : ''">

          <!-- Goal display -->
          <div class="flex items-center justify-between gap-4 rounded-2xl border-2 border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-5">
            <div class="text-center flex-1">
              <p class="text-sm text-surface-400 mb-2 m-0 uppercase tracking-widest">Start</p>
              <span class="game-title text-3xl text-primary uppercase">{{ pair?.start }}</span>
            </div>
            <div class="flex flex-col items-center gap-1 text-surface-400">
              <span class="text-xl">→</span>
              <span class="text-sm">{{ chain.length - 1 }} / {{ par }}</span>
            </div>
            <div class="text-center flex-1">
              <p class="text-sm text-surface-400 mb-2 m-0 uppercase tracking-widest">Goal</p>
              <span class="game-title text-3xl text-primary-700 dark:text-primary-300 uppercase">{{ pair?.end }}</span>
            </div>
          </div>

          <!-- Instructions -->
          <p class="text-surface-500 text-base m-0 text-center">
            Change one letter at a time to reach the goal word. Each word must be valid.
          </p>

          <!-- Chain so far -->
          <div class="flex flex-col gap-2">
            @for (word of chain; track $index) {
              <div class="flex items-center gap-3">
                <span class="text-surface-400 text-sm w-5 text-right flex-shrink-0">{{ $index }}</span>
                <div class="flex gap-1.5">
                  @for (letter of word.split(''); track $index) {
                    <div class="game-tile w-10 h-10 text-base"
                         [class]="$index === 0
                           ? 'bg-primary text-white border-primary-600'
                           : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 border-surface-300 dark:border-surface-600'">
                      {{ letter.toUpperCase() }}
                    </div>
                  }
                </div>
                @if ($index === 0) {
                  <span class="text-sm font-bold text-primary ml-1">START</span>
                }
              </div>
            }
          </div>

          <!-- Input -->
          <div class="flex flex-col gap-2">
            <div class="flex gap-2">
              <input pInputText
                [(ngModel)]="currentInput"
                [maxlength]="wordLength"
                placeholder="Next word..."
                class="flex-1 font-mono tracking-widest uppercase"
                [class.ng-invalid]="showError"
                autocomplete="off"
                autocorrect="off"
                spellcheck="false"
                (input)="onInput()"
                (keydown.enter)="addWord()" />
              <button pButton
                label="Add"
                icon="pi pi-plus"
                (click)="addWord()"
                [disabled]="currentInput.length !== wordLength">
              </button>
            </div>
            @if (showError) {
              <p class="text-red-500 text-base m-0">
                <i class="pi pi-times-circle mr-1"></i>{{ errorMessage }}
              </p>
            }
            @if (diffWarning) {
              <p class="text-yellow-600 dark:text-yellow-400 text-base m-0">
                <i class="pi pi-exclamation-triangle mr-1"></i>{{ diffWarning }}
              </p>
            }
          </div>

          <!-- Hint: suggest next word -->
          @if (!hintShown) {
            <button pButton
              label="Show a hint"
              icon="pi pi-lightbulb"
              severity="secondary"
              size="small"
              class="w-fit self-center"
              (click)="showHint()">
            </button>
          } @else {
            <div class="text-sm text-yellow-700 dark:text-yellow-400 text-center">
              <i class="pi pi-lightbulb mr-1"></i>
              Try: <strong class="tracking-widest uppercase">{{ hintWord }}</strong>
            </div>
          }

          <button pButton
            label="Start over"
            icon="pi pi-replay"
            severity="secondary"
            size="small"
            class="w-fit self-center"
            (click)="restart()">
          </button>

        </div>
      }

    </app-game-shell>
  `
})
export class ChainGameComponent implements OnInit {
  private seedSvc = inject(DailySeedService);
  private wordList = inject(WordListService);
  private puzzleResult = inject(PuzzleResultService);
  private auth = inject(AuthService);
  private notify = inject(NotifyService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  alreadyPlayed = false;
  showCompletion = false;
  pastResult: GameResult | null = null;
  completionResult: GameResult | null = null;

  pair: WordPair | null = null;
  chain: string[] = [];
  currentInput = '';
  showError = false;
  errorMessage = '';
  diffWarning = '';
  hintShown = false;
  hintWord = '';
  wordLength = 5;
  par = 5;

  private dateKey = '';
  private startTime = 0;

  async ngOnInit(): Promise<void> {
    this.dateKey = this.seedSvc.getTodayKey();
    const user = this.auth.user$.value;
    if (!user) return;

    const existing = await this.puzzleResult.getTodayResult(user.uid, 'chainGame', this.dateKey);
    if (existing?.status === 'completed') {
      this.alreadyPlayed = true;
      const steps = existing.score ?? 0;
      this.pastResult = {
        scoreLabel: `Solved in ${steps} step${steps !== 1 ? 's' : ''} (par ${existing.metadata?.['par'] ?? '?'})`,
        usedHint: existing.usedHint,
        shareText: this.buildShareText(steps, existing.metadata?.['par'] as number, existing.usedHint),
      };
    }

    this.pair = await this.wordList.pickDailyPair(this.dateKey);
    this.wordLength = this.pair.start.length as 4 | 5;
    this.par = this.pair.path.length - 1;
    this.chain = [this.pair.start];
    if (!this.alreadyPlayed) this.startTime = Date.now();
    this.loading = false;
    this.cdr.markForCheck();
  }

  onInput(): void {
    this.currentInput = this.currentInput.toLowerCase().replace(/[^a-z]/g, '');
    this.showError = false;
    this.diffWarning = '';

    if (this.currentInput.length === this.wordLength && this.chain.length > 0) {
      const last = this.chain[this.chain.length - 1];
      const diff = countDiff(last, this.currentInput);
      if (diff === 0) {
        this.diffWarning = 'Same as the previous word.';
      } else if (diff > 1) {
        this.diffWarning = `${diff} letters differ — you can only change one.`;
      }
    }
    this.cdr.markForCheck();
  }

  async addWord(): Promise<void> {
    const word = this.currentInput.toLowerCase().trim();
    if (word.length !== this.wordLength || !this.pair) return;

    const last = this.chain[this.chain.length - 1];

    // Validate: exactly one letter different
    if (countDiff(last, word) !== 1) {
      this.errorMessage = 'Must change exactly one letter from the previous word.';
      this.showError = true;
      this.cdr.markForCheck();
      return;
    }

    // Validate: in dictionary
    const valid = await this.wordList.isValidWord(word, this.wordLength as 4 | 5);
    if (!valid) {
      this.errorMessage = `"${word.toUpperCase()}" is not a recognised word.`;
      this.showError = true;
      this.cdr.markForCheck();
      return;
    }

    // Prevent revisiting
    if (this.chain.includes(word)) {
      this.errorMessage = 'You\'ve already used that word.';
      this.showError = true;
      this.cdr.markForCheck();
      return;
    }

    this.chain = [...this.chain, word];
    this.currentInput = '';
    this.showError = false;
    this.diffWarning = '';
    if (this.hintShown) this.hintWord = this.computeHintWord();

    if (word === this.pair.end) {
      await this.handleSuccess();
    }
    this.cdr.markForCheck();
  }

  showHint(): void {
    this.hintShown = true;
    this.hintWord = this.computeHintWord();
    this.cdr.markForCheck();
  }

  private computeHintWord(): string {
    if (!this.pair) return '';
    const path = this.pair.path;
    const currentWord = this.chain[this.chain.length - 1];
    // Find where the user currently is in the reference path
    const idx = path.indexOf(currentWord);
    if (idx !== -1 && idx < path.length - 1) {
      return path[idx + 1];
    }
    // User went off-path — suggest the first step of the reference path
    return path[1] ?? '';
  }

  restart(): void {
    if (this.pair) {
      this.chain = [this.pair.start];
      this.currentInput = '';
      this.showError = false;
      this.diffWarning = '';
      this.cdr.markForCheck();
    }
  }

  onShareCopied(): void {
    this.notify.success('Result copied to clipboard!');
  }

  private async handleSuccess(): Promise<void> {
    const user = this.auth.user$.value;
    if (!user || !this.pair) return;

    const steps = this.chain.length - 1;

    await this.puzzleResult.saveResult({
      userId: user.uid,
      gameType: 'chainGame',
      dateKey: this.dateKey,
      puzzleId: this.dateKey,
      status: 'completed',
      startedAt: new Date(this.startTime),
      completedAt: new Date(),
      score: steps,
      usedHint: this.hintShown,
      metadata: { par: this.par, start: this.pair.start, end: this.pair.end, chain: this.chain },
    });

    this.completionResult = {
      scoreLabel: `${steps} step${steps !== 1 ? 's' : ''} (par ${this.par})`,
      usedHint: this.hintShown,
      shareText: this.buildShareText(steps, this.par, this.hintShown),
    };
    this.showCompletion = true;
  }

  private buildShareText(steps: number, par: number, usedHint: boolean | undefined): string {
    const diff = steps - par;
    const emoji = diff <= 0 ? '🎯' : diff === 1 ? '✅' : '💪';
    const hint = usedHint ? ' 💡' : '';
    return `Word Chain ${this.dateKey}\n${emoji} ${steps} steps (par ${par})${hint}\n${this.pair?.start?.toUpperCase()} → ${this.pair?.end?.toUpperCase()}\nPlay at fiftyplus.com.au`;
  }
}

function countDiff(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let count = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) count++;
  return count;
}
