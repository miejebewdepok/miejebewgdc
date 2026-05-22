const fs = require('fs');
const path = require('path');

const dir = 'e:/KASIR MIE JEBEW/warungos/src/components/warung/gdc';

function fixFile(filename) {
    const p = path.join(dir, filename);
    let c = fs.readFileSync(p, 'utf8');
    
    // Type name fixes
    c = c.replace(/AppSettings/g, 'Settings');
    
    // Product properties
    c = c.replace(/\.price/g, '.sellPrice');
    c = c.replace(/\.image/g, '.imageUrl');
    c = c.replace(/\.isAvailable/g, '.(stock > 0)');
    c = c.replace(/!p\.isAvailable/g, 'p.stock === 0');
    c = c.replace(/product\.isAvailable/g, '(product.stock > 0)');
    c = c.replace(/p\.isAvailable/g, '(p.stock > 0)');
    c = c.replace(/prod\.isAvailable/g, '(prod.stock > 0)');
    
    // Transaction properties
    c = c.replace(/\.invoiceNo/g, '.id');
    c = c.replace(/\.date/g, '.createdAt');
    c = c.replace(/tx\.subtotal/g, 'tx.total');
    c = c.replace(/tx\.tax/g, '0');
    c = c.replace(/tx\.amountPaid/g, 'tx.total');
    c = c.replace(/tx\.change/g, '0');
    c = c.replace(/tx\.customerName/g, '"Umum"');
    
    // Transaction Item properties
    c = c.replace(/item\.product\.name/g, 'item.productName');
    c = c.replace(/item\.product\.price/g, 'item.unitPrice');
    c = c.replace(/item\.product/g, 'item');
    c = c.replace(/item\.notes/g, '""');
    
    // Dashboard fixes
    if (filename === 'Dashboard.tsx') {
        c = c.replace("import { Product, Transaction, SavedBill }", "import { Product, Transaction, SavedBill }");
    }
    
    // Category fixes (string -> ProductCategory)
    c = c.replace(/category: string/g, 'category: ProductCategory');
    c = c.replace(/category === 'Mie Pedas'/g, 'category === "Makanan"');
    c = c.replace(/category === 'Dimsum'/g, 'category === "Makanan"');
    c = c.replace(/category === 'Minuman Dingin'/g, 'category === "Minuman"');
    c = c.replace(/category === 'Snack'/g, 'category === "Sembako"');

    fs.writeFileSync(p, c);
}

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.tsx')) fixFile(file);
});
console.log('done');
