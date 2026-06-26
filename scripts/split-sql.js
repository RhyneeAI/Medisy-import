#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const STATEMENT_RE = /^(CREATE|INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|RENAME)\b/i;

function usage() {
  console.log(`
Usage: node scripts/split-sql.js <input.sql> [output-dir] [limit]

Split a large SQL dump into smaller chunks of at most <limit> statements.

  input.sql     Path to the SQL dump file
  output-dir    Directory for output chunks (default: ./sql-chunks)
  limit         Max statements per chunk (default: 2000)
`);
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) usage();

  const inputFile = path.resolve(args[0]);
  const outputDir = path.resolve(args[1] || 'sql-chunks');
  const limit = parseInt(args[2], 10) || 2000;

  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }

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

main().catch(console.error);
