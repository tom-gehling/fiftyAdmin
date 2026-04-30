/**
 * One-off backfill: ensure every collaborators/{id} doc has a `slug`,
 * a `theme` ({fontColor, backgroundColor, tertiaryColor}), and `isActive`.
 *
 * Run locally:
 *   cd functions
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
 *     npx ts-node scripts/backfill-collaborators.ts
 *
 * Idempotent — re-running skips already-migrated docs.
 */
import * as admin from 'firebase-admin';

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'weeklyfifty-7617b' });
const db = admin.firestore();

const DEFAULT_THEME = {
    fontColor: '#fbe2df',
    backgroundColor: '#677c73',
    tertiaryColor: '#4cfbab'
};

function slugify(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function main(): Promise<void> {
    console.log('Loading collaborators...');
    const snap = await db.collection('collaborators').get();
    console.log(`Found ${snap.size} collaborators.`);

    // Track existing slugs (and any we add this run) to dedup
    const usedSlugs = new Set<string>();
    snap.docs.forEach((d) => {
        const s = (d.data() as any).slug;
        if (typeof s === 'string' && s.trim()) usedSlugs.add(s.trim().toLowerCase());
    });

    let updated = 0;
    let skipped = 0;

    for (const doc of snap.docs) {
        const data = doc.data() as any;
        const update: Record<string, unknown> = {};

        const hasSlug = typeof data.slug === 'string' && data.slug.trim();
        const hasTheme = data.theme && typeof data.theme === 'object' && data.theme.fontColor && data.theme.backgroundColor && data.theme.tertiaryColor;
        const hasIsActive = typeof data.isActive === 'boolean';

        if (!hasSlug) {
            const base = slugify(data.name || doc.id) || doc.id;
            let candidate = base;
            let n = 2;
            while (usedSlugs.has(candidate.toLowerCase())) {
                candidate = `${base}-${n++}`;
            }
            usedSlugs.add(candidate.toLowerCase());
            update.slug = candidate;
        }

        if (!hasTheme) {
            update.theme = { ...DEFAULT_THEME };
        }

        if (!hasIsActive) {
            update.isActive = true;
        }

        if (Object.keys(update).length === 0) {
            skipped++;
            continue;
        }

        update.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        await doc.ref.update(update);
        console.log(`Updated ${doc.id} (${data.name || '<no name>'}):`, Object.keys(update).join(', '));
        updated++;
    }

    console.log(`\nDone. Updated: ${updated}, Skipped (already had everything): ${skipped}`);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Backfill failed:', err);
        process.exit(1);
    });
