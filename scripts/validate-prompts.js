#!/usr/bin/env node
/*
 Validate prompt files for required YAML front matter fields.
 - Checks .github/prompts/ and .github/prompt-snippets/
 - Required: description
 - Optional: applyTo, tools, tags, risks, escalateWhen
 Exits non-zero on failure and prints concise diagnostics.
*/
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIRS = [
  path.join(ROOT, '.github', 'prompts'),
  path.join(ROOT, '.github', 'prompt-snippets'),
];

function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((ent) => {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) return listMarkdownFiles(p);
      if (ent.isFile() && ent.name.endsWith('.md')) return [p];
      return [];
    });
}

function parseFrontMatter(contents) {
  // Expect front matter at the top delimited by --- lines
  if (!contents.startsWith('---')) return null;
  const end = contents.indexOf('\n---', 3);
  if (end === -1) return null;
  const yaml = contents.slice(3, end + 1).trim();
  const body = contents.slice(end + 4);
  const lines = yaml.split(/\r?\n/);
  const data = {};
  for (const line of lines) {
    const m = line.match(/^([A-Za-z0-9_\-]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    // Remove surrounding quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    data[key] = val;
  }
  return { data, body };
}

function validateFile(filePath) {
  const contents = fs.readFileSync(filePath, 'utf8');
  const fm = parseFrontMatter(contents);
  const errors = [];
  if (!fm) {
    errors.push('missing YAML front matter');
    return { ok: false, errors };
  }
  if (!fm.data.description || String(fm.data.description).trim().length === 0) {
    errors.push('missing required field: description');
  }
  // Optional informational warnings
  const hasApplyTo = Object.prototype.hasOwnProperty.call(fm.data, 'applyTo');
  if (!hasApplyTo && filePath.includes(path.sep + 'prompts' + path.sep)) {
    // prompts (not snippets) benefit from applyTo globs
    errors.push('recommend adding applyTo glob');
  }
  return { ok: errors.length === 0, errors };
}

function main() {
  const files = TARGET_DIRS.flatMap(listMarkdownFiles);
  if (files.length === 0) {
    console.log('No prompt files found.');
    return;
  }
  let failed = 0;
  for (const f of files) {
    const { ok, errors } = validateFile(f);
    if (!ok) {
      failed += 1;
      console.error(`[INVALID] ${path.relative(ROOT, f)}:\n - ${errors.join('\n - ')}`);
    }
  }
  if (failed > 0) {
    console.error(`\n${failed} file(s) failed validation.`);
    process.exit(1);
  }
  console.log('All prompt files valid.');
}

main();


