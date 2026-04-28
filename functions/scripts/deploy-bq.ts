// Deploys BigQuery DDL from ../sql/bigquery/ to the weeklyfifty_analytics dataset.
//
// Usage:   npm run deploy:bq
//
// Auth:    picks up Application Default Credentials. Either:
//            gcloud auth application-default login
//          or set GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
//
// Order of execution:
//   1. sql/bigquery/tables/*.sql          — bootstrap the flat tables once
//   2. sql/bigquery/procedures/*.sql      — create/replace all stored procedures
//
// Safe to re-run: every statement is CREATE OR REPLACE.

import { BigQuery } from '@google-cloud/bigquery';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ID = process.env.BQ_PROJECT_ID || 'weeklyfifty-7617b';
const LOCATION = process.env.BQ_LOCATION || 'US';
const SQL_ROOT = path.resolve(__dirname, '..', '..', 'sql', 'bigquery');

async function runFile(bq: BigQuery, filePath: string): Promise<void> {
    const sql = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(SQL_ROOT, filePath);
    process.stdout.write(`→ ${relPath} ... `);
    const [job] = await bq.createQueryJob({ query: sql, location: LOCATION });
    await job.getQueryResults();
    process.stdout.write(`ok\n`);
}

// Tables have a dependency chain (CTAS joins) so order matters.
// Procedures are independent — alphabetical is fine.
const TABLE_ORDER = ['users_flat.sql', 'quizzes_flat.sql', 'quiz_results_flat.sql', 'quiz_answers_flat.sql'];

// Procedures that reference tables not yet provisioned. Skipped until the source extension lands.
const SKIP_PROCEDURES = new Set(['sp_user_daily_games.sql']);

function sqlFilesIn(dir: string, opts: { ordered?: string[]; skip?: Set<string> } = {}): string[] {
    if (!fs.existsSync(dir)) return [];
    const all = fs.readdirSync(dir).filter((f) => f.endsWith('.sql'));
    const filtered = opts.skip ? all.filter((f) => !opts.skip!.has(f)) : all;
    if (opts.ordered) {
        const missing = filtered.filter((f) => !opts.ordered!.includes(f));
        if (missing.length) throw new Error(`Unordered .sql files in ${dir}: ${missing.join(', ')}. Add them to TABLE_ORDER.`);
        return opts.ordered.map((f) => path.join(dir, f));
    }
    return filtered.sort().map((f) => path.join(dir, f));
}

async function main(): Promise<void> {
    const bq = new BigQuery({ projectId: PROJECT_ID, location: LOCATION });

    const udfFiles = sqlFilesIn(path.join(SQL_ROOT, 'udfs'));
    const tableFiles = sqlFilesIn(path.join(SQL_ROOT, 'tables'), { ordered: TABLE_ORDER });
    const procedureFiles = sqlFilesIn(path.join(SQL_ROOT, 'procedures'), { skip: SKIP_PROCEDURES });

    if (tableFiles.length === 0 && procedureFiles.length === 0) {
        console.error(`No .sql files found under ${SQL_ROOT}`);
        process.exit(1);
    }

    console.log(`Deploying to ${PROJECT_ID} (${LOCATION})`);
    if (udfFiles.length > 0) {
        console.log(`UDFs (${udfFiles.length}):`);
        for (const f of udfFiles) await runFile(bq, f);
    }
    console.log(`Tables (${tableFiles.length}):`);
    for (const f of tableFiles) await runFile(bq, f);
    console.log(`Procedures (${procedureFiles.length}):`);
    for (const f of procedureFiles) await runFile(bq, f);
    console.log('Done.');
}

main().catch((err) => {
    console.error('Deploy failed:', err);
    process.exit(1);
});
