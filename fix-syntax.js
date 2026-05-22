const fs = require('fs');
const path = require('path');

const dir = 'e:/KASIR MIE JEBEW/warungos/src/components/warung/gdc';

function fixFile(filename) {
    const p = path.join(dir, filename);
    let c = fs.readFileSync(p, 'utf8');
    
    // Fix invalid syntax created by previous regex
    c = c.replace(/\.\(stock > 0\)/g, '?.stock > 0');
    
    fs.writeFileSync(p, c);
}

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.tsx')) fixFile(file);
});
console.log('done');
