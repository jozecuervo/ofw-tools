const mockFs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('../utils/pdf', () => {
  return {
    parsePdf: jest.fn(async (filePath) => {
      const fs = require('fs');
      const txtPath = filePath.replace(/\.pdf$/i, '.txt');
      if (fs.existsSync(txtPath)) {
        return fs.readFileSync(txtPath, 'utf8');
      }
      return '';
    }),
  };
});

describe('paylocity summary CLI', () => {
  const cliPath = path.resolve(__dirname, '..', 'paylocity-summary.js');

  test('writes a CSV for a directory of PDFs (or paired .txt with --use-txt)', () => {
    const tmpDir = mockFs.mkdtempSync(path.join(os.tmpdir(), 'ofw-paylocity-summary-'));
    const srcDir = path.join(tmpDir, 'src');
    mockFs.mkdirSync(srcDir);

    // Create a placeholder PDF and a .txt with corresponding text
    const pdfPath = path.join(srcDir, 'PrintCheckHistorySummary 2025.pdf');
    mockFs.writeFileSync(pdfPath, '');
    const text = [
      'Print Check History Summary',
      'Check Date Gross Net Taxes Deductions FIT SIT SS MED',
      'July 19, 2025 8,000.00 4,000.00 3,000.00 1,000.00 1,500.00 600.00 500.00 100.00',
      'August 1, 2025 7,500.00 3,900.00 2,900.00 700.00 1,300.00 600.00 800.00 200.00',
    ].join('\n');
    mockFs.writeFileSync(pdfPath.replace(/\.pdf$/i, '.txt'), text);

    const { spawnSync } = require('node:child_process');
    const res = spawnSync(process.execPath, [cliPath, srcDir, '--use-txt'], { encoding: 'utf8', cwd: tmpDir });
    expect(res.status).toBe(0);

    const outCsv = path.join(tmpDir, 'output', 'paychecks_summary.csv');
    const csv = mockFs.readFileSync(outCsv, 'utf8').trim();
    const lines = csv.split('\n');
    expect(lines[0]).toMatch(/^Source,Check Date,Gross Pay,Net Pay,Total Taxes,Total Deductions,Federal Income Tax,State Income Tax,Social Security,Medicare$/);
    expect(lines.length).toBe(3);
    expect(lines[1]).toContain('07/19/2025');
    expect(lines[2]).toContain('08/01/2025');
  });
});


