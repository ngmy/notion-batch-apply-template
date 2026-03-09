#!/usr/bin/env node

import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

function extractUuid(str) {
  const m = String(str).match(
    /\b[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}\b/
  );
  if (!m) {
    throw new Error(`No UUID found in input: ${str}`);
  }
  return m[0];
}

function parseArgs(argv) {
  const args = { db: null, template: null, delayMs: 150 };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--db') {
      args.db = argv[++i];
    } else if (a === '--template') {
      args.template = argv[++i];
    } else if (a === '--delay') {
      args.delayMs = Number(argv[++i] ?? '150');
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }

  if (!args.db) {
    throw new Error('Missing required argument: --db');
  }
  if (Number.isNaN(args.delayMs) || args.delayMs < 0) {
    throw new Error('Invalid value for --delay (must be a non-negative number)');
  }

  return args;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function listAllPagesInDataSource(data_source_id) {
  const pages = [];
  let cursor = undefined;

  while (true) {
    const res = await notion.dataSources.query({
      data_source_id,
      start_cursor: cursor,
      page_size: 100,
    });

    pages.push(...res.results);
    if (!res.has_more) {
      break;
    }
    cursor = res.next_cursor;
  }

  return pages;
}

async function applyTemplateToPage({ page_id, templateId }) {
  const template = templateId
    ? { type: 'template_id', template_id: templateId }
    : { type: 'default' };

  return notion.pages.update({
    page_id,
    erase_content: true,
    template,
  });
}

async function main() {
  if (!process.env.NOTION_TOKEN) {
    throw new Error('Missing environment variable: NOTION_TOKEN');
  }

  const { db, template, delayMs } = parseArgs(process.argv);

  const database_id = extractUuid(db);
  const template_id = template ? extractUuid(template) : null;

  const dbObj = await notion.databases.retrieve({ database_id });

  // Field names can differ depending on SDK/API versions.
  const dataSources =
    dbObj.data_sources ||
    dbObj.dataSources ||
    (dbObj.data_source ? [dbObj.data_source] : null);

  if (!dataSources || dataSources.length === 0) {
    throw new Error(
      'Could not determine data sources for this database. This may be due to an SDK/API version mismatch.'
    );
  }

  console.log(`Database: ${database_id}`);
  console.log(`Template: ${template_id ? `template_id=${template_id}` : 'default'}`);
  console.log(`Delay: ${delayMs} ms`);
  console.log(`Data sources: ${dataSources.length}`);

  for (const ds of dataSources) {
    const data_source_id = ds.id || (ds.url ? extractUuid(ds.url) : null);
    if (!data_source_id) {
      throw new Error('Could not determine data_source_id from database response.');
    }

    const pages = await listAllPagesInDataSource(data_source_id);
    console.log(`Data source: ${data_source_id} | Pages: ${pages.length}`);

    for (let i = 0; i < pages.length; i++) {
      const page_id = pages[i].id;

      try {
        await applyTemplateToPage({ page_id, templateId: template_id });
        console.log(`[${i + 1}/${pages.length}] OK: ${page_id}`);
      } catch (e) {
        const details = e?.body ? JSON.stringify(e.body) : String(e);
        console.error(`[${i + 1}/${pages.length}] FAILED: ${page_id} | ${details}`);
      }

      await sleep(delayMs);
    }
  }
}

main().catch((e) => {
  console.error(e?.message ? `ERROR: ${e.message}` : `ERROR: ${String(e)}`);
  process.exit(1);
});
