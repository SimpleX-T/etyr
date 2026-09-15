const fs = require('fs');
let css = fs.readFileSync('src/content/styles/tooltip.css', 'utf8');

// Replace `#etyr-tooltip-root` with `:host`
css = css.replace(/#etyr-tooltip-root/g, ':host');

// Fix :host[attr=val] syntax to :host([attr=val])
css = css.replace(/:host\[(.*?)\]/g, ':host([$1])');

fs.writeFileSync('src/content/styles/tooltip.css', css);
console.log('Done replacing!');
