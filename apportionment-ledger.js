const fs = require('fs');
const path = require('path');
const { computeApportionment } = require('./apportionment-calc');
const { computeMooreMarsden } = require('./moore-marsden');

function readConfig(p) {
  const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function autoSelectRegime(cfg) {
  if (cfg.acquisitionContext) return cfg.acquisitionContext;
  return 'premaritalOwner';
}

function toInputs(cfg) {
  return {
    houseValueAtPurchase: cfg.houseValueAtPurchase,
    appraisedValue: cfg.appraisedValue,
    mortgageAtPurchase: cfg.mortgageAtPurchase,
    mortgageAtSeparation: cfg.mortgageAtSeparation,
    principalPaidDuringMarriage: cfg.principalPaidDuringMarriage,
    yourSeparateInterest: cfg.yourSeparateInterest,
    herSeparateInterest: cfg.herSeparateInterest,
    principalPaidAfterSeparationByYou: cfg.principalPaidAfterSeparationByYou,
    principalPaidAfterSeparationByHer: cfg.principalPaidAfterSeparationByHer,
    monthsSinceSeparation: cfg.monthsSinceSeparation,
    fairMonthlyRentalValue: cfg.fairMonthlyRentalValue,
    occupant: cfg.occupant,
    monthlyMortgageInterest: cfg.monthlyMortgageInterest,
    monthlyPropertyTaxes: cfg.monthlyPropertyTaxes,
    monthlyInsurance: cfg.monthlyInsurance,
    monthlyNecessaryRepairs: cfg.monthlyNecessaryRepairs,
    acquisitionContext: autoSelectRegime(cfg),
    cpImpr: cfg.cpImpr,
    spImprYou: cfg.spImprYou,
    spImprHer: cfg.spImprHer,
  };
}

function computeFromMooreMarsdenConfig(label, cfg) {
  const res = computeMooreMarsden(
    cfg.purchasePrice,
    cfg.downPayment,
    cfg.paymentsWithSeparateFunds,
    cfg.fairMarketAtMarriage,
    cfg.paymentsWithCommunityFunds,
    cfg.fairMarketAtDivision
  );
  const baseline = {
    community: res.cpInterest,
    yourSP: res.spInterest,
    herSP: 0,
    yourBaseline: res.spInterest + res.cpInterest / 2,
    herBaseline: res.cpInterest / 2,
    totalEquity: res.spInterest + res.cpInterest,
  };
  const credits = { watts: { occupant: null, gross: 0, offsets: 0, net: 0 }, epstein: { you: 0, her: 0 } };
  const net = { your: baseline.yourBaseline, her: baseline.herBaseline };
  const buyout = { yourBuyout: net.her, herBuyout: net.your };
  return { label, regime: 'Moore/Marsden (worksheet)', baseline, credits, net, buyout };
}

function summarize(label, result) {
  return {
    label,
    regime: result.regime,
    baseline: result.baseline,
    credits: result.credits,
    net: result.net,
    buyout: result.buyout,
  };
}

function printCombined(assets) {
  console.log('\nCombined SP/CP Ledger for Trial (summary)\n');
  assets.forEach(a => {
    console.log(`Asset: ${a.label}`);
    console.log(`  Regime: ${a.regime}`);
    console.log(`  SP (You): $${a.baseline.yourSP.toFixed(2)} | SP (Her): $${a.baseline.herSP.toFixed(2)} | CP Total: $${a.baseline.community.toFixed(2)} | Total Equity: $${a.baseline.totalEquity.toFixed(2)}`);
    console.log(`  Baseline → You: $${a.baseline.yourBaseline.toFixed(2)} | Her: $${a.baseline.herBaseline.toFixed(2)}`);
    console.log(`  Credits → Watts net: $${a.credits.watts.net.toFixed(2)} | Epstein (You): $${a.credits.epstein.you.toFixed(2)} | Epstein (Her): $${a.credits.epstein.her.toFixed(2)}`);
    console.log(`  Net → You: $${a.net.your.toFixed(2)} | Her: $${a.net.her.toFixed(2)} | Buyout (you→her): $${a.buyout.yourBuyout.toFixed(2)}`);
    console.log('');
  });

  const totals = assets.reduce((acc, a) => {
    acc.spYou += a.baseline.yourSP;
    acc.spHer += a.baseline.herSP;
    acc.cp += a.baseline.community;
    acc.you += a.net.your;
    acc.her += a.net.her;
    return acc;
  }, { spYou:0, spHer:0, cp:0, you:0, her:0 });

  console.log('Totals across assets:');
  console.log(`  SP (You): $${totals.spYou.toFixed(2)} | SP (Her): $${totals.spHer.toFixed(2)} | CP Total: $${totals.cp.toFixed(2)}`);
  console.log(`  Net Positions → You: $${totals.you.toFixed(2)} | Her: $${totals.her.toFixed(2)}`);
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const condoIdx = argv.indexOf('--condo');
  const houseIdx = argv.indexOf('--house');
  if (condoIdx === -1 || !argv[condoIdx + 1] || houseIdx === -1 || !argv[houseIdx + 1]) {
    console.log('\nUsage: node apportionment-ledger.js --condo <path.json> --house <path.json> [--out-json <path>]\n');
    process.exit(1);
  }
  const condoCfg = readConfig(argv[condoIdx + 1]);
  const houseCfg = readConfig(argv[houseIdx + 1]);

  const condoRes = ('purchasePrice' in condoCfg)
    ? computeFromMooreMarsdenConfig('Condo', condoCfg)
    : summarize('Condo', computeApportionment(toInputs(condoCfg)));
  const houseRes = ('purchasePrice' in houseCfg)
    ? computeFromMooreMarsdenConfig('House', houseCfg)
    : summarize('House', computeApportionment(toInputs(houseCfg)));

  const assets = [
    ('label' in condoRes ? condoRes : summarize('Condo', condoRes)),
    ('label' in houseRes ? houseRes : summarize('House', houseRes)),
  ];

  printCombined(assets);

  const outIdx = argv.indexOf('--out-json');
  if (outIdx !== -1 && argv[outIdx + 1]) {
    const outPath = argv[outIdx + 1];
    try {
      fs.writeFileSync(outPath, JSON.stringify({ condo: assets[0], house: assets[1] }, null, 2));
      console.log(`\nWrote combined ledger JSON to ${outPath}`);
    } catch (e) {
      console.error('Failed to write combined JSON:', e.message);
    }
  }
}


