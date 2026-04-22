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
const LOCATION = process.env.BQ_LOCATION || 'australia-southeast1';
const SQL_ROOT = path.resolve(__dirname, '..', '..', 'sql', 'bigquery');

async function runFile(bq: BigQuery, filePath: string): Promise<void> {
    const sql = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(SQL_ROOT, filePath);
    process.stdout.write(`→ ${relPath} ... `);
    const [job] = await bq.createQueryJob({ query: sql, location: LOCATION });
    await job.getQueryResults();
    process.stdout.write(`ok\n`);
}

function sqlFilesIn(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.sql'))
        .sort()
        .map((f) => path.join(dir, f));
}

async function main(): Promise<void> {
    const bq = new BigQuery({ projectId: PROJECT_ID, location: LOCATION });

    const tableFiles = sqlFilesIn(path.join(SQL_ROOT, 'tables'));
    const procedureFiles = sqlFilesIn(path.join(SQL_ROOT, 'procedures'));

    if (tableFiles.length === 0 && procedureFiles.length === 0) {
        console.error(`No .sql files found under ${SQL_ROOT}`);
        process.exit(1);
    }

    console.log(`Deploying to ${PROJECT_ID} (${LOCATION})`);
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
