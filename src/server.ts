import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';
import fs from 'fs';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use('/**', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

const auth = new google.auth.GoogleAuth({
  keyFile: resolve(serverDistFolder, 'service-account.json'), // path to JSON key
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

// app.get('/api/sheet/:sheetId', async (req, res) => {
//     const sheetId = req.params.sheetId;
//     const range = (req.query['range'] as string) || 'Sheet1!A:B'; 
//     try {
//         const sheets = google.sheets({ version: 'v4', auth });
//         const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range });

//         const rows = response.data.values?.map(row => ({
//             question: row[0] || '',
//             answer: row[1] || '',
//         })) || [];

//         res.json(rows);
//     } catch (err) {
//         console.error('Error fetching Google Sheet:', err);
//         res.status(500).send('Failed to fetch sheet');
//     }
// });
/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
