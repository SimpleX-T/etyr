import fs from 'fs';
import path from 'path';

const tokensPath = path.resolve('src/styles/tokens.css');
const tooltipPath = path.resolve('src/content/styles/tooltip.css');
const outPath = path.resolve('site/tooltip-real.css');

let tokens = fs.readFileSync(tokensPath, 'utf8');
let tooltip = fs.readFileSync(tooltipPath, 'utf8');

// We just need the variable definitions from tokens.css
// But wait, the tokens are defined in :root. We can keep them.
// Replace :host in tooltip.css with .etyr-tooltip-container
tooltip = tooltip.replace(/:host\b/g, '.etyr-tooltip-container');

fs.writeFileSync(outPath, tokens + '\n\n' + tooltip);
console.log('Successfully created site/tooltip-real.css');
