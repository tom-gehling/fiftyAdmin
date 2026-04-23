import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { GameShellComponent, GameResult } from '../shared/game-shell/game-shell';
import { DailySeedService } from '@/shared/services/daily-seed.service';
import { PuzzleResultService } from '@/shared/services/puzzle-result.service';
import { AuthService } from '@/shared/services/auth.service';
import { NotifyService } from '@/shared/services/notify.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Cell {
    row: number;
    col: number;
}

type CellState = 'wall' | 'unvisited' | 'visited' | 'current' | 'end';

// ---------------------------------------------------------------------------
// Grid generation — Hamiltonian path on a 5×5 grid with seeded walls
// ---------------------------------------------------------------------------
const GRID_SIZE = 5;
const TARGET_WALLS = 5;

function key(r: number, c: number): string {
    return `${r},${c}`;
}

function neighbours(r: number, c: number, size: number): Cell[] {
    return [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
    ]
        .map(([dr, dc]) => ({ row: r + dr, col: c + dc }))
        .filter((n) => n.row >= 0 && n.row < size && n.col >= 0 && n.col < size);
}

function isConnected(walls: Set<string>, size: number): boolean {
    const start = findFirstNonWall(walls, size);
    if (!start) return true;
    const visited = new Set<string>([key(start.row, start.col)]);
    const queue = [start];
    while (queue.length) {
        const { row, col } = queue.shift()!;
        for (const n of neighbours(row, col, size)) {
            const k = key(n.row, n.col);
            if (!walls.has(k) && !visited.has(k)) {
                visited.add(k);
                queue.push(n);
            }
        }
    }
    const total = size * size - walls.size;
    return visited.size === total;
}

function findFirstNonWall(walls: Set<string>, size: number): Cell | null {
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!walls.has(key(r, c))) return { row: r, col: c };
    return null;
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/** DFS Hamiltonian path finder. Returns the path or null. */
function findHamiltonianPath(walls: Set<string>, size: number, rng: () => number): { path: Cell[]; found: boolean } {
    const nonWall: Cell[] = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!walls.has(key(r, c))) nonWall.push({ row: r, col: c });

    const total = nonWall.length;
    const startCandidates = seededShuffle(nonWall, rng).slice(0, 8);
    const dirs: Cell[] = [
        { row: -1, col: 0 },
        { row: 1, col: 0 },
        { row: 0, col: -1 },
        { row: 0, col: 1 }
    ];
    let iterLimit = 0;

    for (const start of startCandidates) {
        const visited = new Set<string>([key(start.row, start.col)]);
        const path: Cell[] = [start];

        function dfs(cur: Cell): boolean {
            if (iterLimit++ > 120_000) return false;
            if (visited.size === total) return true;

            // Warnsdorff heuristic: try neighbours with fewest onward moves first
            const ns = seededShuffle(
                neighbours(cur.row, cur.col, size).filter((n) => !walls.has(key(n.row, n.col)) && !visited.has(key(n.row, n.col))),
                rng
            ).sort((a, b) => {
                const aCount = neighbours(a.row, a.col, size).filter((n) => !walls.has(key(n.row, n.col)) && !visited.has(key(n.row, n.col))).length;
                const bCount = neighbours(b.row, b.col, size).filter((n) => !walls.has(key(n.row, n.col)) && !visited.has(key(n.row, n.col))).length;
                return aCount - bCount;
            });

            for (const n of ns) {
                const k = key(n.row, n.col);
                visited.add(k);
                path.push(n);
                if (dfs(n)) return true;
                visited.delete(k);
                path.pop();
            }
            return false;
        }

        iterLimit = 0;
        if (dfs(start)) return { path, found: true };
    }

    return { path: [], found: false };
}

/** Generate daily puzzle — walls first, then find Hamiltonian path, fall back to fewer walls. */
function generatePuzzle(
    dateKey: string,
    seedSvc: DailySeedService
): {
    walls: Set<string>;
    start: Cell;
    end: Cell;
    totalTiles: number;
} {
    for (let wallCount = TARGET_WALLS; wallCount >= 0; wallCount--) {
        const rng = seedSvc.seededRandom(`tileRun_${dateKey}_w${wallCount}`);

        const allCells: Cell[] = [];
        for (let r = 0; r < GRID_SIZE; r++) for (let c = 0; c < GRID_SIZE; c++) allCells.push({ row: r, col: c });

        const shuffled = seededShuffle(allCells, rng);
        const walls = new Set<string>();

        for (const cell of shuffled) {
            if (walls.size >= wallCount) break;
            walls.add(key(cell.row, cell.col));
            if (!isConnected(walls, GRID_SIZE)) walls.delete(key(cell.row, cell.col));
        }

        const { path, found } = findHamiltonianPath(walls, GRID_SIZE, rng);
        if (found && path.length > 1) {
            return {
                walls,
                start: path[0],
                end: path[path.length - 1],
                totalTiles: path.length
            };
        }
    }

    // Absolute fallback — snake pattern on full grid
    const path: Cell[] = [];
    for (let r = 0; r < GRID_SIZE; r++) for (let c = r % 2 === 0 ? 0 : GRID_SIZE - 1; r % 2 === 0 ? c < GRID_SIZE : c >= 0; r % 2 === 0 ? c++ : c--) path.push({ row: r, col: c });
    return { walls: new Set(), start: path[0], end: path[path.length - 1], totalTiles: path.length };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
@Component({
    selector: 'app-tile-run',
    standalone: true,
    imports: [CommonModule, ButtonModule, CardModule, GameShellComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [
        `
            .tile-grid {
                display: grid;
                gap: 4px;
            }
            .tile {
                border-radius: 6px;
                aspect-ratio: 1;
                transition:
                    background-color 0.15s,
                    transform 0.1s;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.65rem;
                font-weight: 600;
            }
            .just-solved .path-tile {
                animation: solveGlow 0.6s ease-out both;
                animation-delay: calc(var(--i, 0) * 40ms);
            }
        `
    ],
    template: `
        <app-game-shell title="Tile Run" [gameType]="'tileRun'" [loading]="loading" [alreadyPlayed]="alreadyPlayed" [pastResult]="pastResult" [showCompletion]="showCompletion" [completionResult]="completionResult" [completionModalDelayMs]="1800" (shareCopied)="onShareCopied()">
            @if (!loading) {
                <div class="flex flex-col gap-4 items-center" [class]="alreadyPlayed || showCompletion ? 'pointer-events-none opacity-60 select-none' : failing ? 'pointer-events-none select-none' : ''">
                    <p class="text-surface-500 text-base m-0 text-center">Step through every tile <strong>exactly once</strong> to reach the <span class="text-orange-500 font-semibold">end</span>.</p>

                    <!-- Stats -->
                    <div class="flex items-center justify-between w-full max-w-xs text-base">
                        <span class="text-surface-500">
                            Visited: <strong class="text-surface-800 dark:text-surface-100">{{ visitedCount }}/{{ totalTiles }}</strong>
                        </span>
                        <span class="text-surface-500">
                            Restarts: <strong class="text-surface-800 dark:text-surface-100">{{ restarts }}</strong>
                        </span>
                    </div>

                    <!-- Grid -->
                    <div class="tile-grid w-full" style="max-width:320px; touch-action: none;" [class.just-solved]="showCompletion" [style.grid-template-columns]="'repeat(' + gridSize + ', 1fr)'" (pointerdown)="onGridPointerDown($event)" (pointerup)="onGridPointerUp($event)">
                        @for (cell of flatCells; track cellKey(cell.row, cell.col)) {
                            <div class="tile" [class]="getTileClass(cell.row, cell.col)" [class.path-tile]="isVisited(cell.row, cell.col)" [style.--i]="visitIndex(cell.row, cell.col)">
                                @if (isEnd(cell.row, cell.col) && !isVisited(cell.row, cell.col)) {
                                    <i class="pi pi-flag-fill text-orange-500" style="font-size:0.8rem"></i>
                                }
                                @if (isCurrent(cell.row, cell.col)) {
                                    <div class="w-3 h-3 rounded-full bg-white/70"></div>
                                }
                            </div>
                        }
                    </div>

                    <!-- Arrow controls -->
                    <div class="grid grid-cols-3 gap-2" style="width:130px">
                        <div></div>
                        <button pButton icon="pi pi-arrow-up" severity="secondary" [disabled]="!canStep('up')" (click)="step('up')"></button>
                        <div></div>
                        <button pButton icon="pi pi-arrow-left" severity="secondary" [disabled]="!canStep('left')" (click)="step('left')"></button>
                        <div class="flex items-center justify-center">
                            <i class="pi pi-circle text-surface-300 text-xl"></i>
                        </div>
                        <button pButton icon="pi pi-arrow-right" severity="secondary" [disabled]="!canStep('right')" (click)="step('right')"></button>
                        <div></div>
                        <button pButton icon="pi pi-arrow-down" severity="secondary" [disabled]="!canStep('down')" (click)="step('down')"></button>
                        <div></div>
                    </div>

                    @if (isStuck && !failing) {
                        <div class="text-center">
                            <p class="text-red-500 text-base m-0 mb-2"><i class="pi pi-times-circle mr-1"></i>No valid moves left — restart and try a different path!</p>
                        </div>
                    }

                    <button pButton label="Restart" icon="pi pi-replay" class="game-action-secondary" (click)="restart()"></button>
                </div>
            }
        </app-game-shell>
    `
})
export class TileRunComponent implements OnInit, OnDestroy {
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

    gridSize = GRID_SIZE;
    walls = new Set<string>();
    start!: Cell;
    end!: Cell;
    totalTiles = 0;
    current!: Cell;
    visited = new Set<string>();
    visitOrder = new Map<string, number>();
    restarts = 0;
    failing = false;
    private failTimer: ReturnType<typeof setTimeout> | null = null;

    private dateKey = '';

    get flatCells(): Cell[] {
        const cells: Cell[] = [];
        for (let r = 0; r < this.gridSize; r++) for (let c = 0; c < this.gridSize; c++) cells.push({ row: r, col: c });
        return cells;
    }

    get visitedCount(): number {
        return this.visited.size;
    }

    get isStuck(): boolean {
        if (!this.current) return false;
        const moveable = ['up', 'down', 'left', 'right'].some((d) => this.canStep(d as Direction));
        return !moveable && this.visitedCount < this.totalTiles;
    }

    async ngOnInit(): Promise<void> {
        this.dateKey = this.seedSvc.getTodayKey();
        const user = this.auth.user$.value;
        if (!user) return;

        const existing = await this.puzzleResult.getTodayResult(user.uid, 'tileRun', this.dateKey);
        if (existing?.status === 'completed') {
            this.alreadyPlayed = true;
            const restarts = existing.metadata?.['restarts'] as number | undefined;
            this.pastResult = {
                scoreLabel: `Completed${restarts ? ` — ${restarts} restart${restarts > 1 ? 's' : ''}` : ' first try!'}`,
                shareText: this.buildShareText(restarts ?? 0)
            };
        }

        const puzzle = generatePuzzle(this.dateKey, this.seedSvc);
        this.walls = puzzle.walls;
        this.start = puzzle.start;
        this.end = puzzle.end;
        this.totalTiles = puzzle.totalTiles;
        this.resetPosition();
        this.loading = false;
        this.cdr.markForCheck();
    }

    cellKey(r: number, c: number): string {
        return key(r, c);
    }
    isWall(r: number, c: number): boolean {
        return this.walls.has(key(r, c));
    }
    isCurrent(r: number, c: number): boolean {
        return this.current?.row === r && this.current?.col === c;
    }
    isEnd(r: number, c: number): boolean {
        return this.end?.row === r && this.end?.col === c;
    }
    isStart(r: number, c: number): boolean {
        return this.start?.row === r && this.start?.col === c;
    }
    isVisited(r: number, c: number): boolean {
        return this.visited.has(key(r, c));
    }

    getTileClass(r: number, c: number): string {
        if (this.isWall(r, c)) return 'bg-surface-800 dark:bg-surface-950';
        if (this.failing && this.isVisited(r, c)) return this.isCurrent(r, c) ? 'bg-red-400 dark:bg-red-600 scale-95 shadow-md' : 'bg-red-400 dark:bg-red-600';
        if (this.isCurrent(r, c)) return 'bg-primary scale-95 shadow-md';
        if (this.isEnd(r, c) && !this.isVisited(r, c)) return 'bg-orange-100 dark:bg-orange-950 border-2 border-orange-400';
        if (this.isStart(r, c) && this.isVisited(r, c) && !this.isCurrent(r, c)) return 'bg-primary-200 dark:bg-primary-900';
        if (this.isVisited(r, c)) return 'bg-primary-200 dark:bg-primary-900';
        return 'bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600';
    }

    canStep(dir: Direction): boolean {
        if (!this.current) return false;
        if (this.failing) return false;
        const next = this.getNext(dir);
        if (!next) return false;
        if (this.walls.has(key(next.row, next.col))) return false;
        // End tile locked unless it's the last unvisited tile
        if (this.isEnd(next.row, next.col) && this.visited.size < this.totalTiles - 1) return false;
        return true;
    }

    private swipeStart: { x: number; y: number } | null = null;
    private readonly SWIPE_THRESHOLD = 24;

    onGridPointerDown(ev: PointerEvent): void {
        if (this.alreadyPlayed || this.showCompletion || this.failing) return;
        this.swipeStart = { x: ev.clientX, y: ev.clientY };
    }

    onGridPointerUp(ev: PointerEvent): void {
        if (!this.swipeStart) return;
        const dx = ev.clientX - this.swipeStart.x;
        const dy = ev.clientY - this.swipeStart.y;
        this.swipeStart = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < this.SWIPE_THRESHOLD) return;
        const dir: Direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        this.step(dir);
    }

    @HostListener('window:keydown', ['$event'])
    onKeydown(ev: KeyboardEvent): void {
        if (this.loading || this.alreadyPlayed || this.showCompletion || this.failing) return;
        const map: Record<string, Direction> = {
            ArrowUp: 'up',
            ArrowDown: 'down',
            ArrowLeft: 'left',
            ArrowRight: 'right'
        };
        const dir = map[ev.key];
        if (!dir) return;
        ev.preventDefault();
        this.step(dir);
    }

    async step(dir: Direction): Promise<void> {
        if (this.failing) return;
        if (!this.current) return;
        const next = this.getNext(dir);
        if (!next) return;
        if (this.walls.has(key(next.row, next.col))) return;
        if (this.isEnd(next.row, next.col) && this.visited.size < this.totalTiles - 1) return;

        if (this.visited.has(key(next.row, next.col))) {
            this.failing = true;
            this.failTimer = setTimeout(() => this.failRestart(), 2000);
            this.cdr.markForCheck();
            return;
        }

        this.current = next;
        const k = key(next.row, next.col);
        this.visited.add(k);
        if (!this.visitOrder.has(k)) this.visitOrder.set(k, this.visitOrder.size);

        if (this.isEnd(next.row, next.col) && this.visited.size === this.totalTiles) {
            await this.handleWin();
        }
        this.cdr.markForCheck();
    }

    restart(): void {
        if (this.failTimer) {
            clearTimeout(this.failTimer);
            this.failTimer = null;
        }
        this.failing = false;
        this.restarts++;
        this.resetPosition();
        this.cdr.markForCheck();
    }

    private failRestart(): void {
        this.failTimer = null;
        this.failing = false;
        this.restarts++;
        this.resetPosition();
        this.cdr.markForCheck();
    }

    ngOnDestroy(): void {
        if (this.failTimer) {
            clearTimeout(this.failTimer);
            this.failTimer = null;
        }
    }

    onShareCopied(): void {
        this.notify.success('Result copied to clipboard!');
    }

    private resetPosition(): void {
        this.current = { ...this.start };
        const startKey = key(this.start.row, this.start.col);
        this.visited = new Set([startKey]);
        this.visitOrder = new Map([[startKey, 0]]);
    }

    visitIndex(r: number, c: number): number {
        return this.visitOrder.get(key(r, c)) ?? 0;
    }

    private getNext(dir: Direction): Cell | null {
        const { row, col } = this.current;
        const map: Record<Direction, Cell> = {
            up: { row: row - 1, col },
            down: { row: row + 1, col },
            left: { row, col: col - 1 },
            right: { row, col: col + 1 }
        };
        const n = map[dir];
        if (n.row < 0 || n.row >= this.gridSize || n.col < 0 || n.col >= this.gridSize) return null;
        return n;
    }

    private async handleWin(): Promise<void> {
        const user = this.auth.user$.value;
        if (!user) return;

        await this.puzzleResult.saveResult({
            userId: user.uid,
            gameType: 'tileRun',
            dateKey: this.dateKey,
            puzzleId: this.dateKey,
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            score: this.restarts,
            metadata: { restarts: this.restarts, totalTiles: this.totalTiles }
        });

        this.completionResult = {
            scoreLabel: this.restarts === 0 ? 'Solved first try!' : `${this.restarts} restart${this.restarts > 1 ? 's' : ''}`,
            shareText: this.buildShareText(this.restarts)
        };
        this.showCompletion = true;
    }

    private buildShareText(restarts: number): string {
        const emoji = restarts === 0 ? '🎯' : restarts <= 2 ? '✅' : '💪';
        return `Tile Run ${this.dateKey}\n${emoji} ${restarts === 0 ? 'First try!' : `${restarts} restart${restarts > 1 ? 's' : ''}`}\nPlay at fiftyplus.com.au`;
    }
}

type Direction = 'up' | 'down' | 'left' | 'right';
