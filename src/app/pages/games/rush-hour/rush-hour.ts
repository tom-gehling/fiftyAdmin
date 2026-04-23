import { Component, OnInit, inject, ChangeDetectorRef, ChangeDetectionStrategy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { GameShellComponent, GameResult } from '../shared/game-shell/game-shell';
import { DailySeedService } from '@/shared/services/daily-seed.service';
import { PuzzleService } from '@/shared/services/puzzle.service';
import { PuzzleResultService } from '@/shared/services/puzzle-result.service';
import { AuthService } from '@/shared/services/auth.service';
import { NotifyService } from '@/shared/services/notify.service';
import { RushHourBlock } from '@/shared/models/puzzle.model';

// ---------------------------------------------------------------------------
// Fallback puzzles — playable without Firestore admin data
// ---------------------------------------------------------------------------
interface BoardConfig {
    gridSize: number;
    blocks: RushHourBlock[];
    exitSide: 'right' | 'left' | 'top' | 'bottom';
    minMoves: number;
}

const FALLBACK_BOARDS: BoardConfig[] = [
    {
        // Puzzle 1 — Easy (3 moves): move B1 left, move A down, target slides right
        gridSize: 6,
        exitSide: 'right',
        minMoves: 3,
        blocks: [
            { id: 'T', row: 2, col: 0, length: 2, direction: 'h', isTarget: true },
            { id: 'A', row: 0, col: 2, length: 3, direction: 'v', isTarget: false }, // blocks col 2, rows 0-2
            { id: 'B', row: 3, col: 1, length: 2, direction: 'h', isTarget: false },
            { id: 'C', row: 0, col: 4, length: 2, direction: 'h', isTarget: false },
            { id: 'D', row: 4, col: 3, length: 2, direction: 'v', isTarget: false }
        ]
    },
    {
        // Puzzle 2 — Medium (4 moves)
        gridSize: 6,
        exitSide: 'right',
        minMoves: 4,
        blocks: [
            { id: 'T', row: 2, col: 0, length: 2, direction: 'h', isTarget: true },
            { id: 'A', row: 0, col: 2, length: 3, direction: 'v', isTarget: false },
            { id: 'B', row: 2, col: 4, length: 2, direction: 'v', isTarget: false },
            { id: 'C', row: 0, col: 4, length: 2, direction: 'h', isTarget: false },
            { id: 'D', row: 4, col: 0, length: 2, direction: 'h', isTarget: false },
            { id: 'E', row: 5, col: 2, length: 2, direction: 'h', isTarget: false }
        ]
    },
    {
        // Puzzle 3 — Medium
        gridSize: 6,
        exitSide: 'right',
        minMoves: 5,
        blocks: [
            { id: 'T', row: 2, col: 0, length: 2, direction: 'h', isTarget: true },
            { id: 'A', row: 0, col: 2, length: 2, direction: 'v', isTarget: false },
            { id: 'B', row: 2, col: 3, length: 3, direction: 'v', isTarget: false },
            { id: 'C', row: 0, col: 4, length: 2, direction: 'h', isTarget: false },
            { id: 'D', row: 3, col: 1, length: 2, direction: 'h', isTarget: false },
            { id: 'E', row: 5, col: 3, length: 3, direction: 'h', isTarget: false }
        ]
    }
];

const BLOCK_COLORS = [
    'bg-blue-400 dark:bg-blue-600',
    'bg-emerald-400 dark:bg-emerald-600',
    'bg-violet-400 dark:bg-violet-600',
    'bg-orange-400 dark:bg-orange-600',
    'bg-teal-400 dark:bg-teal-600',
    'bg-pink-400 dark:bg-pink-600',
    'bg-yellow-400 dark:bg-yellow-600',
    'bg-cyan-400 dark:bg-cyan-600'
];

@Component({
    selector: 'app-rush-hour',
    standalone: true,
    imports: [CommonModule, ButtonModule, CardModule, TagModule, GameShellComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-game-shell
            title="Puzzle Slide"
            [gameType]="'rushHour'"
            [loading]="loading"
            [alreadyPlayed]="alreadyPlayed"
            [pastResult]="pastResult"
            [showCompletion]="showCompletion"
            [completionResult]="completionResult"
            (shareCopied)="onShareCopied()"
        >
            @if (!loading) {
                <div class="flex flex-col gap-4" [class]="alreadyPlayed || showCompletion ? 'pointer-events-none opacity-60 select-none' : ''">
                    <p class="text-surface-500 text-base m-0 text-center">Slide the <span class="font-semibold text-red-500">red block</span> to the right exit. Click a block to select it, then use the arrows to slide.</p>

                    <!-- Stats bar -->
                    <div class="flex items-center justify-between text-base">
                        <span class="text-surface-500"
                            >Moves: <strong class="text-surface-800 dark:text-surface-100">{{ moveCount }}</strong></span
                        >
                        <button pButton label="Reset" icon="pi pi-replay" class="game-action-secondary" (click)="resetBoard()"></button>
                    </div>

                    <!-- Grid -->
                    <div #gridEl class="relative w-full aspect-square rounded-xl border-2 border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800 overflow-hidden" style="max-width: 360px; margin: 0 auto;">
                        <!-- Grid lines -->
                        <div class="absolute inset-0 pointer-events-none" [style]="'display:grid;grid-template-columns:repeat(' + gridSize + ',1fr);grid-template-rows:repeat(' + gridSize + ',1fr)'">
                            @for (cell of gridCells; track $index) {
                                <div class="border border-surface-200 dark:border-surface-700"></div>
                            }
                        </div>

                        <!-- Exit arrow -->
                        <div class="absolute right-0 top-0 h-full flex items-center pointer-events-none" [style]="'top:' + exitTopPct + '%;height:' + 100 / gridSize + '%;'">
                            <div class="w-4 h-full bg-green-400 dark:bg-green-600 flex items-center justify-center">
                                <i class="pi pi-angle-right text-white text-xs"></i>
                            </div>
                        </div>

                        <!-- Blocks -->
                        @for (block of blocks; track block.id; let blockIndex = $index) {
                            <div
                                class="absolute rounded-lg border-2 flex items-center justify-center transition-all duration-150 cursor-grab select-none"
                                [class.cursor-grabbing]="dragging?.id === block.id"
                                [class.just-solved-target]="showCompletion && block.isTarget"
                                [class.just-solved-other]="showCompletion && !block.isTarget"
                                [ngStyle]="getBlockStyle(block)"
                                [class]="getBlockClass(block)"
                                [style.--i]="blockIndex"
                                style="touch-action: none;"
                                (pointerdown)="onBlockPointerDown($event, block)"
                                (click)="selectBlock(block.id)"
                            >
                                @if (block.isTarget) {
                                    <i class="pi pi-arrow-right text-white text-lg font-bold"></i>
                                }
                                @if (selectedBlockId === block.id) {
                                    <div class="absolute inset-0 rounded-md ring-2 ring-white ring-offset-1 ring-offset-transparent pointer-events-none"></div>
                                }
                            </div>
                        }
                    </div>

                    <!-- Move controls -->
                    <div class="flex flex-col items-center gap-1">
                        @if (selectedBlockId) {
                            <p class="text-sm text-surface-400 m-0 mb-1">
                                Moving: <strong class="text-surface-700 dark:text-surface-200 uppercase">{{ selectedBlockId }}</strong>
                            </p>
                        } @else {
                            <p class="text-sm text-surface-400 m-0 mb-1">Tap a block to select it</p>
                        }
                        <div class="grid grid-cols-3 gap-1 w-32">
                            <div></div>
                            <button pButton icon="pi pi-arrow-up" severity="secondary" size="small" [disabled]="!canMove('up')" (click)="move('up')"></button>
                            <div></div>
                            <button pButton icon="pi pi-arrow-left" severity="secondary" size="small" [disabled]="!canMove('left')" (click)="move('left')"></button>
                            <div class="w-10 h-10 flex items-center justify-center">
                                <i class="pi pi-stop text-surface-300 text-lg"></i>
                            </div>
                            <button pButton icon="pi pi-arrow-right" severity="secondary" size="small" [disabled]="!canMove('right')" (click)="move('right')"></button>
                            <div></div>
                            <button pButton icon="pi pi-arrow-down" severity="secondary" size="small" [disabled]="!canMove('down')" (click)="move('down')"></button>
                            <div></div>
                        </div>
                    </div>
                </div>
            }
        </app-game-shell>
    `,
    styles: [
        `
            .just-solved-target {
                animation: solveSlideOut 0.9s cubic-bezier(0.5, 0, 0.75, 0) 0.15s both;
                z-index: 10;
            }
            .just-solved-other {
                animation: solvePulse 0.4s ease-in-out both;
                animation-delay: calc(var(--i, 0) * 60ms);
                opacity: 0.55;
            }
        `
    ]
})
export class RushHourComponent implements OnInit {
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

    blocks: RushHourBlock[] = [];
    gridSize = 6;
    exitSide: 'right' | 'left' | 'top' | 'bottom' = 'right';
    moveCount = 0;
    selectedBlockId: string | null = null;

    @ViewChild('gridEl') gridEl?: ElementRef<HTMLElement>;
    dragging: { id: string; axis: 'h' | 'v'; startClient: number; cellPx: number; lastSteps: number } | null = null;

    private dateKey = '';
    private puzzleId = '';
    private blockColorMap = new Map<string, string>();

    get gridCells(): number[] {
        return Array(this.gridSize * this.gridSize).fill(0);
    }
    get exitTopPct(): number {
        return (this.targetBlock?.row ?? 0) * (100 / this.gridSize);
    }
    private get targetBlock(): RushHourBlock | undefined {
        return this.blocks.find((b) => b.isTarget);
    }

    async ngOnInit(): Promise<void> {
        this.dateKey = this.seedSvc.getTodayKey();
        const user = this.auth.user$.value;
        if (!user) return;

        const existing = await this.puzzleResult.getTodayResult(user.uid, 'rushHour', this.dateKey);
        if (existing?.status === 'completed') {
            this.alreadyPlayed = true;
            const moves = existing.score ?? 0;
            this.pastResult = {
                scoreLabel: `${moves} move${moves !== 1 ? 's' : ''}`,
                shareText: this.buildShareText(moves)
            };
        }

        // Try Firestore, fall back to seeded hardcoded board
        const firestorePuzzle = await firstValueFrom(this.puzzleSvc.getTodayPuzzle('rushHour', this.dateKey));
        let board: BoardConfig;
        if (firestorePuzzle?.blocks) {
            board = {
                gridSize: firestorePuzzle.gridSize ?? 6,
                blocks: firestorePuzzle.blocks,
                exitSide: (firestorePuzzle.exitSide as 'right') ?? 'right',
                minMoves: firestorePuzzle.minMoves ?? 0
            };
            this.puzzleId = firestorePuzzle.id ?? this.dateKey;
        } else {
            board = this.seedSvc.pickFromArray(FALLBACK_BOARDS, `rushHour_${this.dateKey}`);
            this.puzzleId = this.dateKey;
        }

        this.loadBoard(board);
        this.loading = false;
        this.cdr.markForCheck();
    }

    private loadBoard(board: BoardConfig): void {
        this.gridSize = board.gridSize;
        this.exitSide = board.exitSide;
        // Deep clone blocks so reset works
        this.blocks = board.blocks.map((b) => ({ ...b }));
        this.moveCount = 0;
        this.selectedBlockId = null;
        this.assignColors(board.blocks);
    }

    private assignColors(blocks: RushHourBlock[]): void {
        this.blockColorMap.clear();
        let ci = 0;
        for (const b of blocks) {
            if (!b.isTarget) {
                this.blockColorMap.set(b.id, BLOCK_COLORS[ci % BLOCK_COLORS.length]);
                ci++;
            }
        }
    }

    selectBlock(id: string): void {
        // Suppress the synthetic click that follows a drag
        if (this.suppressNextClick) {
            this.suppressNextClick = false;
            return;
        }
        this.selectedBlockId = this.selectedBlockId === id ? null : id;
        this.cdr.markForCheck();
    }

    private suppressNextClick = false;

    onBlockPointerDown(ev: PointerEvent, block: RushHourBlock): void {
        if (!this.gridEl || this.alreadyPlayed || this.showCompletion) return;
        // Mouse left-button only; touch and pen always allowed
        if (ev.pointerType === 'mouse' && ev.button !== 0) return;

        this.selectedBlockId = block.id;
        const target = ev.target as HTMLElement;
        try {
            target.setPointerCapture(ev.pointerId);
        } catch {
            /* not capturable, ignore */
        }

        const rect = this.gridEl.nativeElement.getBoundingClientRect();
        const cellPx = rect.width / this.gridSize;
        const axis: 'h' | 'v' = block.direction;
        this.dragging = {
            id: block.id,
            axis,
            startClient: axis === 'h' ? ev.clientX : ev.clientY,
            cellPx,
            lastSteps: 0
        };
        this.cdr.markForCheck();
    }

    @HostListener('window:pointermove', ['$event'])
    onWindowPointerMove(ev: PointerEvent): void {
        const drag = this.dragging;
        if (!drag) return;
        const client = drag.axis === 'h' ? ev.clientX : ev.clientY;
        const delta = client - drag.startClient;
        const steps = Math.round(delta / drag.cellPx);
        if (steps === drag.lastSteps) return;

        const diff = steps - drag.lastSteps;
        const dir: 'up' | 'down' | 'left' | 'right' = drag.axis === 'h' ? (diff > 0 ? 'right' : 'left') : diff > 0 ? 'down' : 'up';

        // Advance one cell at a time, respecting canMove
        const cellsToMove = Math.abs(diff);
        let actuallyMoved = 0;
        for (let i = 0; i < cellsToMove; i++) {
            if (!this.canMove(dir)) break;
            this.move(dir);
            actuallyMoved++;
        }
        drag.lastSteps += diff > 0 ? actuallyMoved : -actuallyMoved;
    }

    @HostListener('window:pointerup')
    @HostListener('window:pointercancel')
    onWindowPointerUp(): void {
        if (!this.dragging) return;
        if (this.dragging.lastSteps !== 0) this.suppressNextClick = true;
        this.dragging = null;
        this.cdr.markForCheck();
    }

    canMove(dir: 'up' | 'down' | 'left' | 'right'): boolean {
        if (!this.selectedBlockId) return false;
        const block = this.blocks.find((b) => b.id === this.selectedBlockId);
        if (!block) return false;

        // Horizontal blocks can only move left/right; vertical only up/down
        if (block.direction === 'h' && (dir === 'up' || dir === 'down')) return false;
        if (block.direction === 'v' && (dir === 'left' || dir === 'right')) return false;

        const occupied = this.getOccupied(block.id);

        if (dir === 'left') {
            if (block.col <= 0) return false;
            for (let r = block.row; r < block.row + (block.direction === 'v' ? block.length : 1); r++) if (occupied.has(`${r},${block.col - 1}`)) return false;
            return true;
        }
        if (dir === 'right') {
            const edge = block.col + block.length;
            // Target block can exit right when at the rightmost movable position
            if (block.isTarget && this.exitSide === 'right' && edge >= this.gridSize) return false; // already at edge
            if (edge >= this.gridSize) return false;
            for (let r = block.row; r < block.row + (block.direction === 'v' ? block.length : 1); r++) if (occupied.has(`${r},${edge}`)) return false;
            return true;
        }
        if (dir === 'up') {
            if (block.row <= 0) return false;
            for (let c = block.col; c < block.col + (block.direction === 'h' ? block.length : 1); c++) if (occupied.has(`${block.row - 1},${c}`)) return false;
            return true;
        }
        if (dir === 'down') {
            const edge = block.row + block.length;
            if (edge >= this.gridSize) return false;
            for (let c = block.col; c < block.col + (block.direction === 'h' ? block.length : 1); c++) if (occupied.has(`${edge},${c}`)) return false;
            return true;
        }
        return false;
    }

    async move(dir: 'up' | 'down' | 'left' | 'right'): Promise<void> {
        if (!this.canMove(dir)) return;
        const block = this.blocks.find((b) => b.id === this.selectedBlockId)!;

        if (dir === 'left') block.col--;
        if (dir === 'right') block.col++;
        if (dir === 'up') block.row--;
        if (dir === 'down') block.row++;

        this.moveCount++;

        // Win check: target block's right edge reaches the grid edge → success
        if (block.isTarget && this.exitSide === 'right' && block.col + block.length >= this.gridSize) {
            await this.handleWin();
        }

        this.cdr.markForCheck();
    }

    resetBoard(): void {
        // Re-run ngOnInit equivalent (just reload from the stored config)
        this.loading = true;
        this.showCompletion = false;
        this.cdr.markForCheck();
        // Reload
        this.ngOnInit();
    }

    getBlockStyle(block: RushHourBlock): Record<string, string> {
        const pct = 100 / this.gridSize;
        const gap = 3;
        return {
            top: `calc(${block.row * pct}% + ${gap}px)`,
            left: `calc(${block.col * pct}% + ${gap}px)`,
            width: `calc(${(block.direction === 'h' ? block.length : 1) * pct}% - ${gap * 2}px)`,
            height: `calc(${(block.direction === 'v' ? block.length : 1) * pct}% - ${gap * 2}px)`
        };
    }

    getBlockClass(block: RushHourBlock): string {
        const selected = this.selectedBlockId === block.id;
        if (block.isTarget) {
            return `bg-red-500 border-red-700 text-white ${selected ? 'ring-2 ring-white shadow-lg scale-105' : 'shadow-md'}`;
        }
        const color = this.blockColorMap.get(block.id) ?? BLOCK_COLORS[0];
        return `${color} border-black/10 text-white ${selected ? 'ring-2 ring-white shadow-lg scale-105' : 'shadow-sm'}`;
    }

    onShareCopied(): void {
        this.notify.success('Result copied to clipboard!');
    }

    private getOccupied(excludeId?: string): Set<string> {
        const s = new Set<string>();
        for (const b of this.blocks) {
            if (b.id === excludeId) continue;
            if (b.direction === 'h') {
                for (let c = b.col; c < b.col + b.length; c++) s.add(`${b.row},${c}`);
            } else {
                for (let r = b.row; r < b.row + b.length; r++) s.add(`${r},${b.col}`);
            }
        }
        return s;
    }

    private async handleWin(): Promise<void> {
        const user = this.auth.user$.value;
        if (!user) return;

        await this.puzzleResult.saveResult({
            userId: user.uid,
            gameType: 'rushHour',
            dateKey: this.dateKey,
            puzzleId: this.puzzleId,
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            score: this.moveCount
        });

        this.completionResult = {
            scoreLabel: `${this.moveCount} move${this.moveCount !== 1 ? 's' : ''}`,
            shareText: this.buildShareText(this.moveCount)
        };
        this.showCompletion = true;
    }

    private buildShareText(moves: number): string {
        return `Puzzle Slide ${this.dateKey}\n✅ ${moves} move${moves !== 1 ? 's' : ''}\nPlay at fiftyplus.com.au`;
    }
}
