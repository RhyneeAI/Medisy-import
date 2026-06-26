#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const STATEMENT_RE = /^(CREATE|INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|RENAME)\b/i;
const INSERT_RE = /^INSERT\b/i;

function parseSize(val) {
  const m = String(val).match(/^(\d+)\s*(kb|mb)?$/i);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  const unit = (m[2] || 'mb').toLowerCase();
  return unit === 'kb' ? num * 1024 : num * 1024 * 1024;
}

// node scripts/split-sql.js input.sql ./chunks 300
// node scripts/split-sql.js /home/luhung/Downloads/permata-db.sql ./chunks --size 1mb
function usage() {
  console.log(`
Usage:
  node scripts/split-sql.js <input.sql> [output-dir] [limit]
  node scripts/split-sql.js <input.sql> [output-dir] --size <size>

Split a large SQL dump into smaller chunks.

  input.sql         Path to the SQL dump file
  output-dir        Output directory (default: ./sql-chunks)
  limit             Max statements per chunk (default: 2000)
  --size <size>     Split INSERTs by file size (e.g., 1mb, 500kb).
                    Non-INSERT statements go into ddl.sql, then each
                    INSERT chunk is at most <size>.
`);
  process.exit(1);
}

async function byStatementCount(inputFile, outputDir, limit) {
  fs.mkdirSync(outputDir, { recursive: true });

  const rl = readline.createInterface({
    input: fs.createReadStream(inputFile, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let chunkIndex = 1;
  let stmtCount = 0;
  let currentChunk = [];
  let totalStatements = 0;

  function flush() {
    if (!currentChunk.length) return;
    const name = `chunk-${String(chunkIndex).padStart(4, '0')}.sql`;
    fs.writeFileSync(path.join(outputDir, name), currentChunk.join(''), 'utf8');
    console.log(`  ${name}  (≈${stmtCount} statements)`);
    chunkIndex++;
    stmtCount = 0;
    currentChunk = [];
  }

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed && STATEMENT_RE.test(trimmed)) {
      if (stmtCount >= limit) flush();
      stmtCount++;
      totalStatements++;
    }
    currentChunk.push(line + '\n');
  }

  flush();
  console.log(`\nDone. ${totalStatements} statements → ${chunkIndex - 1} files in ${outputDir}`);
}

async function byInsertSize(inputFile, outputDir, maxBytes) {
  fs.mkdirSync(outputDir, { recursive: true });

  const rl = readline.createInterface({
    input: fs.createReadStream(inputFile, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let ddlLines = [];
  let insertLines = [];
  let insertSize = 0;
  let chunkIndex = 1;
  let totalInserts = 0;
  let inInsert = false;

  function flushInsert() {
    if (!insertLines.length) return;
    const name = `insert-${String(chunkIndex).padStart(4, '0')}.sql`;
    const content = insertLines.join('');
    fs.writeFileSync(path.join(outputDir, name), content, 'utf8');
    const sizeKb = (Buffer.byteLength(content, 'utf8') / 1024).toFixed(1);
    console.log(`  ${name}  (${sizeKb} KB)`);
    chunkIndex++;
    insertLines = [];
    insertSize = 0;
  }

  for await (const line of rl) {
    const trimmed = line.trim();

    if (trimmed && INSERT_RE.test(trimmed)) {
      if (insertSize >= maxBytes) {
        flushInsert();
      }
      inInsert = true;
      totalInserts++;
    } else if (trimmed && STATEMENT_RE.test(trimmed)) {
      if (inInsert) inInsert = false;
    }

    const lineBytes = Buffer.byteLength(line + '\n', 'utf8');

    if (inInsert) {
      insertLines.push(line + '\n');
      insertSize += lineBytes;
    } else {
      ddlLines.push(line + '\n');
    }
  }

  flushInsert();

  // write DDL
  if (ddlLines.length) {
    fs.writeFileSync(path.join(outputDir, 'ddl.sql'), ddlLines.join(''), 'utf8');
    const sizeKb = (Buffer.byteLength(ddlLines.join(''), 'utf8') / 1024).toFixed(1);
    console.log(`  ddl.sql  (${sizeKb} KB)`);
  }

  console.log(`\nDone. ${totalInserts} INSERTs → ${chunkIndex - 1} insert files in ${outputDir}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) usage();

  const inputFile = path.resolve(args[0]);

  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }

  // detect --size flag
  const sizeIdx = args.findIndex(a => a === '--size');
  if (sizeIdx !== -1) {
    const sizeVal = args[sizeIdx + 1];
    if (!sizeVal) { console.error('Missing size value'); process.exit(1); }
    const maxBytes = parseSize(sizeVal);
    if (!maxBytes) { console.error('Invalid size:', sizeVal); process.exit(1); }
    const outputDir = path.resolve(args[1] && args[1] !== '--size' ? args[1] : 'sql-chunks');
    await byInsertSize(inputFile, outputDir, maxBytes);
  } else {
    const outputDir = path.resolve(args[1] || 'sql-chunks');
    const limit = parseInt(args[2], 10) || 2000;
    await byStatementCount(inputFile, outputDir, limit);
  }
}

main().catch(console.error);
