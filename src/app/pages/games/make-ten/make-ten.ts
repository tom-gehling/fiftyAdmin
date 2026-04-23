import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { GameShellComponent, GameResult } from '../shared/game-shell/game-shell';
import { DailySeedService } from '@/shared/services/daily-seed.service';
import { PuzzleResultService } from '@/shared/services/puzzle-result.service';
import { AuthService } from '@/shared/services/auth.service';
import { NotifyService } from '@/shared/services/notify.service';

type Op = '+' | '-' | '*' | '/';

interface ExprToken {
    type: 'digit' | 'op' | 'lparen' | 'rparen';
    value: string;
    id?: number; // for digit tiles — tracks which slot
}

@Component({
    selector: 'app-make-ten',
    standalone: true,
    imports: [CommonModule, ButtonModule, CardModule, GameShellComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-game-shell title="Make 10" [gameType]="'makeTen'" [loading]="loading" [alreadyPlayed]="alreadyPlayed" [pastResult]="pastResult" [showCompletion]="showCompletion" [completionResult]="completionResult" (shareCopied)="onShareCopied()">
            @if (!loading) {
                <div class="flex flex-col gap-5" [class]="alreadyPlayed || showCompletion ? 'pointer-events-none opacity-60 select-none' : ''">
                    <!-- Instructions -->
                    <p class="text-surface-500 text-base m-0 text-center">Use all 4 numbers with +, −, ×, ÷ (and brackets) to make <strong class="text-surface-800 dark:text-surface-100">10</strong></p>

                    <!-- Expression display -->
                    <div class="min-h-24 flex items-center justify-center flex-nowrap gap-1.5 sm:gap-2 py-5 px-3 rounded-2xl border-2 border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 overflow-x-auto">
                        @if (expression.length === 0) {
                            <span class="text-surface-400 text-base">Tap digits and operators below</span>
                        }
                        @for (token of expression; track $index) {
                            @if (token.type === 'digit') {
                                <div class="game-tile game-tile--md game-tile--solid game-tile--enter cursor-pointer hover:opacity-70 flex-shrink-0" (click)="removeToken($index)" title="Click to remove">
                                    {{ token.value }}
                                </div>
                            } @else {
                                <span
                                    class="inline-flex items-center justify-center text-3xl sm:text-4xl font-black cursor-pointer hover:opacity-70 select-none flex-shrink-0 game-tile--enter"
                                    [class]="token.type === 'op' ? 'text-surface-700 dark:text-surface-200' : 'text-surface-400 dark:text-surface-500'"
                                    (click)="removeToken($index)"
                                    title="Click to remove"
                                >
                                    {{ tokenDisplay(token) }}
                                </span>
                            }
                        }
                    </div>

                    <!-- Number tiles -->
                    <div>
                        <p class="text-sm text-surface-400 mb-3 text-center uppercase tracking-widest">Your numbers</p>
                        <div class="flex justify-center gap-3" [class.just-solved]="showCompletion">
                            @for (d of digits; track $index) {
                                <button
                                    class="game-tile game-tile--lg shadow-md text-3xl"
                                    [class]="
                                        usedDigitIndices.has($index)
                                            ? 'bg-surface-100 dark:bg-surface-800 text-surface-300 dark:text-surface-600 border-surface-200 dark:border-surface-700 cursor-not-allowed opacity-40'
                                            : 'game-tile--solid cursor-pointer hover:brightness-110'
                                    "
                                    [style.--i]="$index"
                                    [disabled]="usedDigitIndices.has($index)"
                                    (click)="addDigit(d, $index)"
                                >
                                    {{ d }}
                                </button>
                            }
                        </div>
                    </div>

                    <!-- Operators and brackets -->
                    <div>
                        <p class="text-xs text-surface-400 mb-3 text-center uppercase tracking-widest">Operators &amp; brackets</p>
                        <div class="flex justify-center gap-2 flex-wrap">
                            @for (op of ops; track op) {
                                <button
                                    class="game-tile game-tile--md bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 border-surface-300 dark:border-surface-600 cursor-pointer hover:brightness-95 dark:hover:brightness-110"
                                    (click)="addOp(op)"
                                >
                                    {{ opDisplay(op) }}
                                </button>
                            }
                            <button
                                class="game-tile game-tile--sm bg-surface-50 dark:bg-surface-900 text-surface-500 dark:text-surface-300 border-surface-200 dark:border-surface-700 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800"
                                (click)="addParen('(')"
                            >
                                (
                            </button>
                            <button
                                class="game-tile game-tile--sm bg-surface-50 dark:bg-surface-900 text-surface-500 dark:text-surface-300 border-surface-200 dark:border-surface-700 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800"
                                (click)="addParen(')')"
                            >
                                )
                            </button>
                        </div>
                    </div>

                    <!-- Controls -->
                    <div class="flex justify-center gap-3 flex-wrap">
                        <button pButton icon="pi pi-delete-left" class="game-action-secondary" [disabled]="expression.length === 0" (click)="backspace()" title="Backspace"></button>
                        <button pButton label="Clear" icon="pi pi-trash" class="game-action-secondary" [disabled]="expression.length === 0" (click)="clearExpression()"></button>
                        <button pButton label="Submit" icon="pi pi-check" class="game-action" [disabled]="!canSubmit" (click)="submit()"></button>
                    </div>

                    @if (submitError) {
                        <p class="text-red-500 text-base text-center m-0"><i class="pi pi-times-circle mr-1"></i>{{ submitError }}</p>
                    }

                    @if (attempts > 0) {
                        <p class="text-surface-400 text-sm text-center m-0">{{ attempts }} attempt{{ attempts > 1 ? 's' : '' }}</p>
                    }
                </div>
            }
        </app-game-shell>
    `,
    styles: [
        `
            .just-solved .game-tile {
                animation: solveBounce 0.5s ease-out both;
                animation-delay: calc(var(--i, 0) * 100ms);
                opacity: 1 !important;
            }
        `
    ]
})
export class MakeTenComponent implements OnInit {
    private seedSvc = inject(DailySeedService);
    private puzzleResult = inject(PuzzleResultService);
    private auth = inject(AuthService);
    private notify = inject(NotifyService);
    private cdr = inject(ChangeDetectorRef);

    loading = true;
    alreadyPlayed = false;
    showCompletion = false;
    pastResult: GameResult | null = null;
    completionResult: GameResult | null = null;

    digits: number[] = [];
    expression: ExprToken[] = [];
    usedDigitIndices = new Set<number>();
    ops: Op[] = ['+', '-', '*', '/'];
    attempts = 0;
    submitError = '';

    private dateKey = '';

    async ngOnInit(): Promise<void> {
        this.dateKey = this.seedSvc.getTodayKey();
        const user = this.auth.user$.value;
        if (!user) return;

        const existing = await this.puzzleResult.getTodayResult(user.uid, 'makeTen', this.dateKey);
        if (existing?.status === 'completed') {
            this.alreadyPlayed = true;
            this.pastResult = {
                scoreLabel: existing.attempts ? `Solved in ${existing.attempts} attempt${existing.attempts > 1 ? 's' : ''}` : undefined,
                shareText: this.buildShareText(existing.attempts ?? 1)
            };
        }

        this.digits = this.generateDigits(this.dateKey);
        this.loading = false;
        this.cdr.markForCheck();
    }

    get canSubmit(): boolean {
        return this.usedDigitIndices.size === 4 && this.expression.length > 0;
    }

    opDisplay(op: Op): string {
        return op === '*' ? '×' : op === '/' ? '÷' : op;
    }

    tokenDisplay(token: ExprToken): string {
        if (token.type === 'op') return this.opDisplay(token.value as Op);
        return token.value;
    }

    addDigit(d: number, idx: number): void {
        if (this.usedDigitIndices.has(idx)) return;
        this.usedDigitIndices = new Set(this.usedDigitIndices);
        this.usedDigitIndices.add(idx);
        this.expression = [...this.expression, { type: 'digit', value: String(d), id: idx }];
        this.submitError = '';
        this.cdr.markForCheck();
    }

    addOp(op: Op): void {
        this.expression = [...this.expression, { type: 'op', value: op }];
        this.submitError = '';
        this.cdr.markForCheck();
    }

    addParen(p: '(' | ')'): void {
        this.expression = [...this.expression, { type: p === '(' ? 'lparen' : 'rparen', value: p }];
        this.cdr.markForCheck();
    }

    removeToken(index: number): void {
        const token = this.expression[index];
        if (token.type === 'digit' && token.id !== undefined) {
            this.usedDigitIndices = new Set(this.usedDigitIndices);
            this.usedDigitIndices.delete(token.id);
        }
        this.expression = this.expression.filter((_, i) => i !== index);
        this.cdr.markForCheck();
    }

    backspace(): void {
        if (this.expression.length === 0) return;
        this.removeToken(this.expression.length - 1);
        this.submitError = '';
    }

    clearExpression(): void {
        this.expression = [];
        this.usedDigitIndices = new Set();
        this.submitError = '';
        this.cdr.markForCheck();
    }

    async submit(): Promise<void> {
        if (!this.canSubmit) return;

        const expr = this.expression.map((t) => t.value).join(' ');
        const result = safeEval(expr);

        this.attempts++;

        if (result === null) {
            this.submitError = 'Invalid expression — check your brackets.';
            this.cdr.markForCheck();
            return;
        }
        if (Math.abs(result - 10) < 0.0001) {
            await this.handleSuccess();
        } else {
            this.submitError = `That equals ${result.toFixed(4).replace(/\.?0+$/, '')}, not 10. Try again!`;
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
            gameType: 'makeTen',
            dateKey: this.dateKey,
            puzzleId: this.dateKey,
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            attempts: this.attempts,
            metadata: { digits: this.digits }
        });

        this.completionResult = {
            scoreLabel: `Solved in ${this.attempts} attempt${this.attempts > 1 ? 's' : ''}`,
            shareText: this.buildShareText(this.attempts)
        };
        this.showCompletion = true;
    }

    private generateDigits(dateKey: string): number[] {
        // Try seeded sets until we find one with a solution
        for (let salt = 0; salt < 100; salt++) {
            const rng = this.seedSvc.seededRandom(`makeTen_${dateKey}_${salt}`);
            const candidates = Array.from({ length: 4 }, () => Math.floor(rng() * 9) + 1);
            if (hasMakeTenSolution(candidates)) return candidates;
        }
        return [1, 2, 3, 4]; // guaranteed fallback
    }

    private buildShareText(attempts: number): string {
        const emoji = attempts === 1 ? '🎯' : attempts <= 3 ? '✅' : '💪';
        return `Make 10 ${this.dateKey}\n${emoji} ${attempts} attempt${attempts > 1 ? 's' : ''}\nNumbers: ${this.digits.join(', ')}\nPlay at fiftyplus.com.au`;
    }
}

// ---------------------------------------------------------------------------
// Safe expression evaluator — recursive descent parser
// Supports: integers, +, -, *, /, parentheses
// Returns null on parse/eval error
// ---------------------------------------------------------------------------

function safeEval(input: string): number | null {
    const tokens = tokenise(input);
    if (!tokens) return null;
    try {
        const [result, pos] = parseExpr(tokens, 0);
        return pos === tokens.length ? result : null;
    } catch {
        return null;
    }
}

function tokenise(input: string): string[] | null {
    const raw = input.replace(/×/g, '*').replace(/÷/g, '/');
    const tokens: string[] = [];
    for (const ch of raw.split('')) {
        if (' '.includes(ch)) continue;
        if ('0123456789'.includes(ch)) {
            if (tokens.length && /^\d+$/.test(tokens[tokens.length - 1])) {
                tokens[tokens.length - 1] += ch;
            } else {
                tokens.push(ch);
            }
        } else if ('+-*/()'.includes(ch)) {
            tokens.push(ch);
        } else {
            return null;
        }
    }
    return tokens;
}

function parseExpr(tokens: string[], pos: number): [number, number] {
    let [left, p] = parseTerm(tokens, pos);
    while (p < tokens.length && (tokens[p] === '+' || tokens[p] === '-')) {
        const op = tokens[p++];
        const [right, np] = parseTerm(tokens, p);
        left = op === '+' ? left + right : left - right;
        p = np;
    }
    return [left, p];
}

function parseTerm(tokens: string[], pos: number): [number, number] {
    let [left, p] = parseFactor(tokens, pos);
    while (p < tokens.length && (tokens[p] === '*' || tokens[p] === '/')) {
        const op = tokens[p++];
        const [right, np] = parseFactor(tokens, p);
        if (op === '/' && right === 0) throw new Error('Division by zero');
        left = op === '*' ? left * right : left / right;
        p = np;
    }
    return [left, p];
}

function parseFactor(tokens: string[], pos: number): [number, number] {
    if (pos >= tokens.length) throw new Error('Unexpected end');
    if (tokens[pos] === '(') {
        const [val, p] = parseExpr(tokens, pos + 1);
        if (tokens[p] !== ')') throw new Error('Missing )');
        return [val, p + 1];
    }
    const n = Number(tokens[pos]);
    if (isNaN(n)) throw new Error(`Not a number: ${tokens[pos]}`);
    return [n, pos + 1];
}

// ---------------------------------------------------------------------------
// Backtracking solver — checks whether 4 digits can make 10
// ---------------------------------------------------------------------------

function hasMakeTenSolution(nums: number[]): boolean {
    return checkPerms(nums);
}

function checkPerms(nums: number[]): boolean {
    // Try all permutations
    const perms = permutations(nums);
    const opCombos = cartesian(['+', '-', '*', '/'], 3);

    for (const perm of perms) {
        for (const ops of opCombos) {
            // All ways to parenthesise 4 numbers with 3 operators:
            // ((a op b) op c) op d
            // (a op (b op c)) op d
            // (a op b) op (c op d)
            // a op ((b op c) op d)
            // a op (b op (c op d))
            const [a, b, c, d] = perm;
            const [o1, o2, o3] = ops;

            const tries = [
                applyOp(applyOp(applyOp(a, o1, b), o2, c), o3, d),
                applyOp(applyOp(a, o1, applyOp(b, o2, c)), o3, d),
                applyOp(applyOp(a, o1, b), o2, applyOp(c, o3, d)),
                applyOp(a, o1, applyOp(applyOp(b, o2, c), o3, d)),
                applyOp(a, o1, applyOp(b, o2, applyOp(c, o3, d)))
            ];

            if (tries.some((v) => v !== null && Math.abs(v - 10) < 0.0001)) return true;
        }
    }
    return false;
}

function applyOp(a: number | null, op: string, b: number | null): number | null {
    if (a === null || b === null) return null;
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    if (op === '*') return a * b;
    if (op === '/') return b === 0 ? null : a / b;
    return null;
}

function permutations<T>(arr: T[]): T[][] {
    if (arr.length <= 1) return [arr];
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i++) {
        const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
        for (const perm of permutations(rest)) result.push([arr[i], ...perm]);
    }
    return result;
}

function cartesian<T>(arr: T[], count: number): T[][] {
    if (count === 1) return arr.map((x) => [x]);
    const result: T[][] = [];
    for (const x of arr) for (const rest of cartesian(arr, count - 1)) result.push([x, ...rest]);
    return result;
}
