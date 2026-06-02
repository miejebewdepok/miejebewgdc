const fs = require('fs');
const path = require('path');

const dbJsonPath = 'e:\\KASIR MIE JEBEW\\Rania Finance\\db.json';

function main() {
  if (!fs.existsSync(dbJsonPath)) {
    console.log("db.json tidak ditemukan di:", dbJsonPath);
    return;
  }

  const data = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
  const products = data.products || [];
  console.log(`Total produk di db.json: ${products.length}`);
  
  // Tampilkan 10 produk pertama sebagai contoh
  console.log("Contoh 10 produk:");
  console.table(products.slice(0, 10));

  // Hitung kategori
  const categories = {};
  products.forEach(p => {
    categories[p.category] = (categories[p.category] || 0) + 1;
  });
  console.log("\nKategori produk:");
  console.table(categories);
}

main();
