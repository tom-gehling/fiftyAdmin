import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, firstValueFrom } from 'rxjs';
import { DailySeedService } from './daily-seed.service';

export interface WordPair {
    start: string;
    end: string;
    path: string[];
}

@Injectable({ providedIn: 'root' })
export class WordListService {
    private http = inject(HttpClient);
    private seed = inject(DailySeedService);

    private words4$: Observable<string[]> = this.http.get<string[]>('/assets/games/words-4.json').pipe(shareReplay(1));

    private words5$: Observable<string[]> = this.http.get<string[]>('/assets/games/words-5.json').pipe(shareReplay(1));

    private wordSet4: Set<string> | null = null;
    private wordSet5: Set<string> | null = null;
    private remoteCache = new Map<string, boolean>();

    async getWordSet(length: 4 | 5): Promise<Set<string>> {
        if (length === 4) {
            if (!this.wordSet4) {
                const words = await firstValueFrom(this.words4$);
                this.wordSet4 = new Set(words);
            }
            return this.wordSet4;
        }
        if (!this.wordSet5) {
            const words = await firstValueFrom(this.words5$);
            this.wordSet5 = new Set(words);
        }
        return this.wordSet5;
    }

    async getWords(length: 4 | 5): Promise<string[]> {
        const set = await this.getWordSet(length);
        return Array.from(set);
    }

    async isValidWord(word: string, length: 4 | 5): Promise<boolean> {
        const set = await this.getWordSet(length);
        return set.has(word.toLowerCase());
    }

    /**
     * Validate a word against the local list first, then fall back to
     * dictionaryapi.dev for words outside our curated set. Lenient on
     * network failure (returns true) so outages don't block gameplay.
     */
    async isValidWordRemote(word: string, length: 4 | 5): Promise<boolean> {
        const lower = word.toLowerCase();
        const set = await this.getWordSet(length);
        if (set.has(lower)) return true;

        if (this.remoteCache.has(lower)) return this.remoteCache.get(lower)!;

        const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lower)}`;
        try {
            await firstValueFrom(this.http.get(url));
            this.remoteCache.set(lower, true);
            return true;
        } catch (err: any) {
            if (err?.status === 404) {
                this.remoteCache.set(lower, false);
                return false;
            }
            console.warn('Dictionary API lookup failed, accepting word leniently:', lower, err);
            return true;
        }
    }

    /**
     * BFS to find the shortest path from start → end, each step changing exactly one letter.
     * Returns null if no path found within maxSteps.
     */
    async findPath(start: string, end: string, maxSteps = 10): Promise<string[] | null> {
        const len = start.length as 4 | 5;
        const wordSet = await this.getWordSet(len);

        const queue: string[][] = [[start]];
        const visited = new Set<string>([start]);

        while (queue.length > 0) {
            const path = queue.shift()!;
            const current = path[path.length - 1];

            if (current === end) return path;
            if (path.length > maxSteps) continue;

            for (const neighbour of getNeighbours(current, wordSet)) {
                if (!visited.has(neighbour)) {
                    visited.add(neighbour);
                    queue.push([...path, neighbour]);
                }
            }
        }
        return null;
    }

    /**
     * Pick a daily word ladder pair for a given date key.
     * Uses seeded PRNG to pick start word, then BFS to find an end word 3–6 steps away.
     * Deterministic — all users get the same pair on the same day.
     */
    async pickDailyPair(dateKey: string, length: 4 | 5 = 5): Promise<WordPair> {
        const words = await this.getWords(length);
        const wordSet = await this.getWordSet(length);
        const rng = this.seed.seededRandom(`chainGame_${dateKey}`);

        // Try up to 50 seeds to find a pair with a path of 3–6 steps
        for (let attempt = 0; attempt < 50; attempt++) {
            const startIdx = Math.floor(rng() * words.length);
            const startWord = words[startIdx];

            // BFS — collect words at depth 3–6
            const reachable = bfsReachable(startWord, wordSet, 6);
            const candidates = reachable.filter(([, depth]) => depth >= 3 && depth <= 6);

            if (candidates.length === 0) continue;

            // Pick an end word from candidates using the same seeded RNG
            const endIdx = Math.floor(rng() * candidates.length);
            const [endWord] = candidates[endIdx];

            const path = await this.findPath(startWord, endWord, 8);
            if (path && path.length >= 4 && path.length <= 7) {
                return { start: startWord, end: endWord, path };
            }
        }

        // Fallback pair if we couldn't find one (very unlikely with a good word list)
        return { start: 'heart', end: 'hands', path: ['heart', 'heard', 'hears', 'heads', 'hands'] };
    }
}

/** Return all words in the set that differ from `word` by exactly one letter */
function getNeighbours(word: string, wordSet: Set<string>): string[] {
    const result: string[] = [];
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i < word.length; i++) {
        for (const c of chars) {
            if (c === word[i]) continue;
            const candidate = word.slice(0, i) + c + word.slice(i + 1);
            if (wordSet.has(candidate)) result.push(candidate);
        }
    }
    return result;
}

/** BFS from start, returning [word, depth] pairs up to maxDepth */
function bfsReachable(start: string, wordSet: Set<string>, maxDepth: number): [string, number][] {
    const result: [string, number][] = [];
    const queue: [string, number][] = [[start, 0]];
    const visited = new Set<string>([start]);

    while (queue.length > 0) {
        const [word, depth] = queue.shift()!;
        if (depth > 0) result.push([word, depth]);
        if (depth >= maxDepth) continue;

        for (const neighbour of getNeighbours(word, wordSet)) {
            if (!visited.has(neighbour)) {
                visited.add(neighbour);
                queue.push([neighbour, depth + 1]);
            }
        }
    }
    return result;
}
