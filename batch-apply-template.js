#!/usr/bin/env node

import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });

function normalizeUuid(uuid) {
  const hex = uuid.replace(/-/g, '');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function extractUuid(str) {
  const m = String(str).match(
    /\b[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}\b/
  );
  if (!m) {
    throw new Error(`No UUID found in input: ${str}`);
  }
  return normalizeUuid(m[0]);
}

function parseArgs(argv) {
  const args = {
    dataSource: null,
    template: null,
    delayMs: 150,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--data-source' || a === '--ds') {
      args.dataSource = argv[++i];
    } else if (a === '--template') {
      args.template = argv[++i];
    } else if (a === '--delay') {
      args.delayMs = Number(argv[++i] ?? '150');
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }

  if (!args.dataSource) {
    throw new Error('Missing required argument: --data-source (or --ds)');
  }
  if (Number.isNaN(args.delayMs) || args.delayMs < 0) {
    throw new Error('Invalid value for --delay (must be a non-negative number)');
  }

  return args;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function listAllPagesInDataSource(dataSourceId) {
  const pages = [];
  let cursor = undefined;

  while (true) {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
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

async function applyTemplateToPage(pageId, templateId) {
  const template = templateId
    ? { type: 'template_id', template_id: templateId }
    : { type: 'default' };

  return notion.pages.update({
    page_id: pageId,
    erase_content: true,
    template: template,
  });
}

async function main() {
  if (!process.env.NOTION_TOKEN) {
    throw new Error('Missing environment variable: NOTION_TOKEN');
  }

  const { dataSource, template, delayMs } = parseArgs(process.argv);

  const dataSourceId = extractUuid(dataSource);
  const templateId = template ? extractUuid(template) : null;

  console.log(`Data source: ${dataSourceId}`);
  console.log(`Template: ${templateId ?? 'default'}`);
  console.log(`Delay: ${delayMs} ms`);

  const pages = await listAllPagesInDataSource(dataSourceId);
  console.log(`Pages: ${pages.length}`);

  for (let i = 0; i < pages.length; i++) {
    const pageId = pages[i].id;

    try {
      await applyTemplateToPage(pageId, templateId);
      console.log(`[${i + 1}/${pages.length}] OK: ${pageId}`);
    } catch (e) {
      const details = e?.body ? JSON.stringify(e.body) : String(e);
      console.error(`[${i + 1}/${pages.length}] FAILED: ${pageId} | ${details}`);
    }

    await sleep(delayMs);
  }
}

main().catch((e) => {
  console.error(e?.message ? `ERROR: ${e.message}` : `ERROR: ${String(e)}`);
  process.exit(1);
});
