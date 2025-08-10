const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('../utils/pdf', () => ({
  parsePdf: jest.fn(async () => {
    // Should not be called when using --use-txt or env override
    return '';
  }),
}));

describe('paylocity CLI', () => {
  const cliPath = path.resolve(__dirname, '..', 'paylocity.js');

  test('writes a CSV with one row per input (txt fallback)', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ofw-paylocity-'));
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir);
    // Create a .txt file containing normalized paystub text
    const txt = [
      'Direct Deposit Advice',
      'Check Date August 1, 2025',
      'Period Beginning July 19, 2025',
      'Period Ending August 1, 2025',
      'Net Pay 4,000.00',
      'FITWS 7,000.00 1,500.00',
      'CAS- 7,000.00 600.00',
      'SS 7,000.00 500.00',
      'MED 7,000.00 100.00',
      'Gross Earnings 80.00 8,000.00',
    ].join('\n');
    const txtPath = path.join(srcDir, 'stub1.txt');
    fs.writeFileSync(txtPath, txt);

    // Also create an unrelated file to ensure filter works
    fs.writeFileSync(path.join(srcDir, 'ignore.pdf'), '');

    // Run CLI in a child process with --use-txt
    const { spawnSync } = require('node:child_process');
    const res = spawnSync(process.execPath, [cliPath, srcDir, '--use-txt'], { encoding: 'utf8' });
    expect(res.status).toBe(0);

    const outCsv = path.join(srcDir, 'paychecks.csv');
    const csv = fs.readFileSync(outCsv, 'utf8').trim();
    const lines = csv.split('\n');
    expect(lines[0]).toMatch(/^File,Pay Date,Period Start,Period End,/);
    expect(lines.length).toBe(2);
    expect(lines[1]).toMatch(/^stub1\.txt,08\/01\/2025,07\/19\/2025,08\/01\/2025,8000(?:\.00)?,4000(?:\.00)?/);
  });
});


