import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { GameShellComponent, GameResult } from '../shared/game-shell/game-shell';
import { DailySeedService } from '@/shared/services/daily-seed.service';
import { PuzzleService } from '@/shared/services/puzzle.service';
import { PuzzleResultService } from '@/shared/services/puzzle-result.service';
import { AuthService } from '@/shared/services/auth.service';
import { NotifyService } from '@/shared/services/notify.service';
import { Puzzle } from '@/shared/models/puzzle.model';

// ---------------------------------------------------------------------------
// Fallback puzzle list — used when no Firestore puzzle is scheduled for today
// ---------------------------------------------------------------------------
const FALLBACK_PUZZLES: Omit<Puzzle, 'id' | 'gameType' | 'dateKey' | 'isActive' | 'createdAt' | 'createdBy'>[] = [
  { emojis: ['🦁', '👑'],              answer: 'The Lion King',       alternateAnswers: ['lion king'] },
  { emojis: ['🐠', '🔍'],              answer: 'Finding Nemo',        alternateAnswers: ['nemo'] },
  { emojis: ['🚢', '🧊'],              answer: 'Titanic',             alternateAnswers: [] },
  { emojis: ['🦖', '🌴'],              answer: 'Jurassic Park',       alternateAnswers: [] },
  { emojis: ['🕷️', '🕸️'],            answer: 'Spider-Man',          alternateAnswers: ['spiderman'] },
  { emojis: ['🚀', '🤠'],              answer: 'Toy Story',           alternateAnswers: [] },
  { emojis: ['🧜‍♀️', '🐚'],          answer: 'The Little Mermaid',  alternateAnswers: ['little mermaid'] },
  { emojis: ['🦌', '❄️'],              answer: 'Frozen',              alternateAnswers: [] },
  { emojis: ['🦈', '🏊'],              answer: 'Jaws',                alternateAnswers: [] },
  { emojis: ['⚡', '🧙'],              answer: 'Harry Potter',        alternateAnswers: [] },
  { emojis: ['🤖', '🌐'],              answer: 'The Matrix',          alternateAnswers: ['matrix'] },
  { emojis: ['👻', '🏠'],              answer: 'Ghostbusters',        alternateAnswers: [] },
  { emojis: ['🧙‍♂️', '💍'],          answer: 'The Lord of the Rings', alternateAnswers: ['lord of the rings'] },
  { emojis: ['🦇', '🌃'],              answer: 'Batman',              alternateAnswers: [] },
  { emojis: ['🐼', '🥋'],              answer: 'Kung Fu Panda',       alternateAnswers: [] },
  { emojis: ['🌹', '🐻'],              answer: 'Beauty and the Beast', alternateAnswers: ['beauty and beast'] },
  { emojis: ['🧝‍♀️', '🌲'],          answer: 'Elf',                 alternateAnswers: [] },
  { emojis: ['🐧', '❄️'],              answer: 'Happy Feet',          alternateAnswers: [] },
  { emojis: ['🕴️', '👓'],             answer: 'Men in Black',        alternateAnswers: ['mib'] },
  { emojis: ['🦁', '🔮', '🏰'],       answer: 'The Wizard of Oz',    alternateAnswers: ['wizard of oz'] },
];

@Component({
  selector: 'app-movie-emoji',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, CardModule, GameShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-game-shell
      title="Movie Emoji"
      [loading]="loading"
      [alreadyPlayed]="alreadyPlayed"
      [pastResult]="pastResult"
      [showCompletion]="showCompletion"
      [completionResult]="completionResult"
      (shareCopied)="onShareCopied()">

      @if (!loading) {
        <div class="flex flex-col gap-5"
             [class]="(alreadyPlayed || showCompletion) ? 'pointer-events-none opacity-60 select-none' : ''">

          <p class="text-surface-500 text-base m-0 text-center">
            Guess the movie from the emojis below
          </p>

          <!-- Emoji display -->
          <div class="rounded-2xl border-2 border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-8 text-center">
            <div class="flex justify-center gap-6 flex-wrap">
              @for (emoji of visibleEmojis; track $index) {
                <span class="text-7xl select-none">{{ emoji }}</span>
              }
            </div>
            @if (score < 100) {
              <div class="flex justify-center gap-2 mt-5">
                @for (star of scoreStars; track $index) {
                  <span class="text-xl">{{ star ? '⭐' : '☆' }}</span>
                }
              </div>
            }
          </div>
          @if (puzzle && puzzle.emojis && puzzle.emojis.length > 2 && !hintShown) {
            <button pButton
              label="Show hint emoji"
              icon="pi pi-lightbulb"
              severity="secondary"
              size="small"
              class="self-center"
              (click)="showHint()">
            </button>
          }

          <!-- Answer input -->
          <div class="flex flex-col gap-2">
            <label class="text-base font-medium text-surface-700 dark:text-surface-200">Your answer</label>
            <div class="flex gap-2">
              <input pInputText
                [(ngModel)]="userAnswer"
                placeholder="Movie title..."
                class="flex-1"
                [class.ng-invalid]="showError"
                (keydown.enter)="submit()"
                autocomplete="off"
                spellcheck="false" />
              <button pButton
                label="Submit"
                icon="pi pi-check"
                (click)="submit()"
                [disabled]="!userAnswer.trim()">
              </button>
            </div>
            @if (showError) {
              <p class="text-red-500 text-base m-0">
                <i class="pi pi-times-circle mr-1"></i>Not quite! Try again.
              </p>
            }
            @if (wrongAttempts > 0) {
              <p class="text-surface-400 text-sm m-0">{{ wrongAttempts }} wrong attempt{{ wrongAttempts > 1 ? 's' : '' }}</p>
            }
          </div>

        </div>
      }

    </app-game-shell>
  `
})
export class MovieEmojiComponent implements OnInit {
  private seedSvc = inject(DailySeedService);
  private puzzleSvc = inject(PuzzleService);
  private puzzleResult = inject(PuzzleResultService);
  private auth = inject(AuthService);
  private notify = inject(NotifyService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  alreadyPlayed = false;
  showCompletion = false;
  pastResult: GameResult | null = null;
  completionResult: GameResult | null = null;

  puzzle: Partial<Puzzle> | null = null;
  visibleEmojis: string[] = [];
  userAnswer = '';
  showError = false;
  hintShown = false;
  wrongAttempts = 0;
  score = 100;

  private dateKey = '';
  private puzzleId = '';

  get scoreStars(): boolean[] {
    const filled = Math.max(0, Math.round(this.score / 20));
    return Array.from({ length: 5 }, (_, i) => i < filled);
  }

  async ngOnInit(): Promise<void> {
    this.dateKey = this.seedSvc.getTodayKey();
    const user = this.auth.user$.value;
    if (!user) return;

    const existing = await this.puzzleResult.getTodayResult(user.uid, 'movieEmoji', this.dateKey);
    if (existing?.status === 'completed') {
      this.alreadyPlayed = true;
      this.pastResult = {
        scoreLabel: existing.score !== undefined ? `Score: ${existing.score}/100` : undefined,
        usedHint: existing.usedHint,
        shareText: this.buildShareText(existing.score ?? 0, existing.usedHint),
      };
    }

    const firestorePuzzle = await firstValueFrom(this.puzzleSvc.getTodayPuzzle('movieEmoji', this.dateKey));
    if (firestorePuzzle) {
      this.puzzle = firestorePuzzle;
      this.puzzleId = firestorePuzzle.id ?? this.dateKey;
    } else {
      const picked = this.seedSvc.pickFromArray(FALLBACK_PUZZLES, `movieEmoji_${this.dateKey}`);
      this.puzzle = picked;
      this.puzzleId = this.dateKey;
    }

    this.visibleEmojis = (this.puzzle.emojis ?? []).slice(0, 2);
    this.loading = false;
    this.cdr.markForCheck();
  }

  showHint(): void {
    this.hintShown = true;
    this.score = Math.max(0, this.score - 20);
    this.visibleEmojis = this.puzzle?.emojis ?? [];
    this.cdr.markForCheck();
  }

  async submit(): Promise<void> {
    const answer = this.userAnswer.trim();
    if (!answer || !this.puzzle?.answer) return;

    if (isCorrectAnswer(answer, this.puzzle.answer, this.puzzle.alternateAnswers ?? [])) {
      await this.handleSuccess();
    } else {
      this.wrongAttempts++;
      this.score = Math.max(0, 100 - (this.wrongAttempts * 10) - (this.hintShown ? 20 : 0));
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
    const user = this.auth.user$.value;
    if (!user) return;

    await this.puzzleResult.saveResult({
      userId: user.uid,
      gameType: 'movieEmoji',
      dateKey: this.dateKey,
      puzzleId: this.puzzleId,
      status: 'completed',
      startedAt: new Date(),
      completedAt: new Date(),
      score: this.score,
      attempts: this.wrongAttempts + 1,
      usedHint: this.hintShown,
      metadata: { answer: this.puzzle?.answer },
    });

    this.completionResult = {
      scoreLabel: `Score: ${this.score}/100`,
      usedHint: this.hintShown,
      shareText: this.buildShareText(this.score, this.hintShown),
    };
    this.showCompletion = true;
  }

  private buildShareText(score: number, usedHint: boolean | undefined): string {
    const stars = Math.round(score / 20);
    const starStr = '⭐'.repeat(stars) + '✩'.repeat(5 - stars);
    const hint = usedHint ? ' 💡' : '';
    return `Movie Emoji ${this.dateKey}\n${starStr}${hint} ${score}/100\nPlay at fiftyplus.com.au`;
  }
}

// ---------------------------------------------------------------------------
// Answer matching helpers
// ---------------------------------------------------------------------------

function normalise(s: string): string {
  return s.toLowerCase()
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[a.length][b.length];
}

function isCorrectAnswer(input: string, answer: string, alternates: string[]): boolean {
  const norm = normalise(input);
  return [answer, ...alternates].map(normalise).some(t => t === norm || levenshtein(norm, t) <= 2);
}
