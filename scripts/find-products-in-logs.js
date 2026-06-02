const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\PIQ\\.gemini\\antigravity\\brain\\50a6d631-5d5f-4cbe-96ba-7e94e4f00c8a\\.system_generated\\logs\\transcript.jsonl';

function main() {
  if (!fs.existsSync(logPath)) {
    console.log("Log file tidak ditemukan di:", logPath);
    return;
  }

  const fileContent = fs.readFileSync(logPath, 'utf8');
  const lines = fileContent.split('\n');

  console.log("Mencari entri produk di log...");
  
  const foundKeywords = new Set();
  
  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    try {
      const obj = JSON.parse(line);
      const str = JSON.stringify(obj);
      
      // Cari keywords produk mie jebew yang umum
      if (str.toLowerCase().includes("mie jebew") || 
          str.toLowerCase().includes("mie tek tek") || 
          str.toLowerCase().includes("pangsit") ||
          str.toLowerCase().includes("lumpia beef") ||
          str.toLowerCase().includes("kebab") ||
          str.toLowerCase().includes("es teh") ||
          str.toLowerCase().includes("dimsum") ||
          str.toLowerCase().includes("delight")) {
        
        // Coba cari pola array produk
        const matches = str.match(/"name"\s*:\s*"[^"]+"/g);
        if (matches) {
          matches.forEach(m => foundKeywords.add(m));
        }
      }
    } catch (e) {
      // ignore JSON parse error for incomplete lines
    }
  });

  console.log("=== PRODUK-PRODUK YANG DITEMUKAN DI LOG HISTORI ===");
  foundKeywords.forEach(k => console.log(k));
}

main();
