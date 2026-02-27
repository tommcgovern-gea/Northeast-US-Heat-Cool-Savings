/**
 * Generates docs/MILESTONE_1_CLIENT_TESTING.html for editing in Google Docs and adding screenshots.
 * Run: npm run generate:ms1-html
 *
 * Client: Upload the HTML to Google Drive → Right-click → Open with → Google Docs.
 * Then edit and use Insert → Image to add screenshots.
 */

import { marked } from 'marked';
import * as fs from 'fs';
import * as path from 'path';

const mdPath = path.join(process.cwd(), 'docs', 'MILESTONE_1_CLIENT_TESTING.md');
const outPath = path.join(process.cwd(), 'docs', 'MILESTONE_1_CLIENT_TESTING.html');

const template = (body: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Milestone 1 — Testing Guide for Client</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #222; }
    .instructions { background: #f0f7ff; border: 1px solid #b3d9ff; border-radius: 6px; padding: 1rem 1.25rem; margin-bottom: 2rem; font-size: 0.95rem; }
    .instructions strong { display: block; margin-bottom: 0.5rem; }
    h1 { font-size: 1.75rem; margin-top: 2rem; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
    h2 { font-size: 1.25rem; margin-top: 1.5rem; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; }
    pre { background: #f4f4f4; padding: 1rem; overflow-x: auto; border-radius: 4px; }
    pre code { background: none; padding: 0; }
    hr { border: none; border-top: 1px solid #ddd; margin: 2rem 0; }
    strong { font-weight: 600; }
  </style>
</head>
<body>
  <div class="instructions">
    <strong>To edit and add screenshots:</strong>
    Upload this file to Google Drive → right-click the file → Open with → Google Docs.
    The document will open as an editable Doc where you can add screenshots via Insert → Image.
  </div>
${body}
</body>
</html>
`;

async function main() {
  const md = fs.readFileSync(mdPath, 'utf-8');
  const body = marked.parse(md, { gfm: true }) as string;
  const html = template(body);
  fs.writeFileSync(outPath, html);
  console.log('Written:', outPath);
  console.log('Upload to Google Drive → Open with Google Docs to edit and add screenshots.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
