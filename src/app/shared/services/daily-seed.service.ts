import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DailySeedService {
    /** Returns today's date key as 'YYYY-MM-DD' in local time */
    getTodayKey(): string {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /**
     * Deterministic PRNG seeded from a string.
     * Uses mulberry32 — fast, good quality, browser-safe.
     * Returns a function that yields numbers in [0, 1) each call.
     */
    seededRandom(seed: string): () => number {
        let h = this.hashString(seed);
        return () => {
            h |= 0;
            h = (h + 0x6d2b79f5) | 0;
            let t = Math.imul(h ^ (h >>> 15), 1 | h);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /** Pick a random element from an array using a string seed */
    pickFromArray<T>(arr: T[], seed: string): T {
        const rng = this.seededRandom(seed);
        const idx = Math.floor(rng() * arr.length);
        return arr[idx];
    }

    /**
     * Fisher-Yates shuffle using a seeded PRNG.
     * Returns a new shuffled array, original is unmodified.
     */
    shuffleArray<T>(arr: T[], seed: string): T[] {
        const rng = this.seededRandom(seed);
        const result = [...arr];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    /** djb2 hash of a string → 32-bit int seed for mulberry32 */
    private hashString(str: string): number {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) + hash + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }
}
