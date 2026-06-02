const fs = require('fs');
const path = require('path');

const logTxtPath = 'C:\\Users\\PIQ\\.gemini\\antigravity\\brain\\50a6d631-5d5f-4cbe-96ba-7e94e4f00c8a\\scratch\\log.txt';

function main() {
  if (!fs.existsSync(logTxtPath)) {
    console.log("log.txt tidak ditemukan di:", logTxtPath);
    return;
  }

  const content = fs.readFileSync(logTxtPath, 'utf8');
  const lines = content.split('\n');

  console.log("Mencari data produk di log.txt...");

  let inTable = false;
  let tableLines = [];

  lines.forEach((line, idx) => {
    const l = line.toLowerCase();
    
    // Cari baris yang mengandung nama produk yang sering digunakan
    if (l.includes("mie setan") || l.includes("mie iblis") || l.includes("dimsum") || l.includes("es genderuwo") || l.includes("es pocong") || l.includes("ceker setan")) {
      console.log(`\nLine ${idx}: ${line.trim()}`);
    }

    // Cari format tabel
    if (line.includes("┌") || line.includes("├") || line.includes("│")) {
      tableLines.push({ idx, line });
    }
  });

  console.log("\nMencari tabel produk di log.txt...");
  tableLines.forEach(item => {
    if (item.line.includes("Mie") || item.line.includes("Teh") || item.line.includes("Pangsit") || item.line.includes("Chocolatte") || item.line.includes("Es")) {
      // Print surrounding lines
      const start = Math.max(0, item.idx - 2);
      const end = Math.min(lines.length - 1, item.idx + 10);
      console.log(`\n--- Tabel pada baris ${item.idx} ---`);
      for (let i = start; i <= end; i++) {
        console.log(`${i}: ${lines[i].trim()}`);
      }
    }
  });
}

main();
