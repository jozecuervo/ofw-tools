# Mocks Folder - Comprehensive Testing and Demo Data

This folder contains sample data files, demo scripts, test fixtures, and documentation examples for the OFW Tools apportionment system. All scenarios are educational and designed to help users understand Moore/Marsden and Family Code §2640 calculations.

## ⚠️ LEGAL DISCLAIMER
All mock data and scenarios in this folder are for educational and testing purposes only. They do not constitute legal advice and should not be used for actual property division decisions without consulting a qualified family law attorney.

## Folder Structure

### `/data/` - Sample Property Data
- **Moore/Marsden scenarios**: Properties acquired before marriage with clear separate property interests
- **Family Code §2640 scenarios**: Properties acquired during marriage with traceable separate contributions  
- **Edge cases**: Negative appreciation, complex refinancing scenarios
- **Real-world inspired**: Based on anonymized case patterns (not actual cases)

### `/demos/` - Interactive Demo Scripts
- **Comparison demos**: Side-by-side Moore/Marsden vs §2640 calculations
- **Step-by-step walkthroughs**: Educational examples with detailed explanations
- **Common mistakes**: Examples showing pitfalls and how to avoid them

### `/fixtures/` - Test Data for Unit Tests
- **Boundary conditions**: Zero appreciation, negative values, edge cases
- **Performance data**: Large datasets for testing computation efficiency
- **Validation scenarios**: Input combinations for testing validation logic

### `/docs/` - Documentation Examples
- **Annotated examples**: JSON/YAML files with explanatory comments
- **Scenario explanations**: Detailed breakdowns of legal reasoning for each case
- **Usage guides**: How to apply different mock scenarios

## Quick Start

1. **Basic Moore/Marsden Demo**:
   ```bash
   npm run apportionment -- --config ./mocks/data/moore-marsden-basic.json
   ```

2. **Family Code §2640 Demo**:
   ```bash
   npm run apportionment -- --config ./mocks/data/section-2640-basic.json
   ```

3. **Interactive Comparison**:
   ```bash
   node ./mocks/demos/regime-comparison.js
   ```

4. **Dry Run Validation**:
   ```bash
   npm run apportionment -- --config ./mocks/data/edge-case-negative-appreciation.json --dry-run
   ```

## Legal Context References

Each mock scenario includes:
- **Case citations**: Relevant appellate decisions
- **Statutory basis**: Applicable Family Code sections  
- **Factual assumptions**: What makes this scenario appropriate for the chosen regime
- **Limitations**: What the mock doesn't account for (transmutations, refinances, etc.)

## Contributing New Scenarios

When adding new mock scenarios:
1. Follow the naming convention: `[regime]-[scenario-type]-[description].json`
2. Include comprehensive documentation in the corresponding `/docs/` file
3. Add legal disclaimers and appropriate case citations
4. Test the scenario for mathematical consistency
5. Consider edge cases and validation requirements

## Educational Use

These mocks are designed for:
- **Learning legal concepts**: Understanding Moore/Marsden vs §2640 differences
- **Testing calculations**: Verifying tool accuracy with known scenarios
- **Training purposes**: Teaching property division principles
- **Code validation**: Ensuring the tool handles various inputs correctly

Remember: Real property division cases involve complex facts and legal nuances that cannot be fully captured in mock scenarios. Always consult qualified legal counsel for actual cases.