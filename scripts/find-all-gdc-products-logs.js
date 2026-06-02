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

  console.log("Mencari referensi user_id GDC...");

  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    try {
      const obj = JSON.parse(line);
      const str = JSON.stringify(obj);

      // Cari user ID GDC
      if (str.includes("yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn")) {
        // Cek apakah berisi produk
        if (str.includes("buy_price") || str.includes("sell_price") || str.includes("name") || str.includes("stock")) {
          console.log(`\n--- Step ${obj.step_index || idx} (${obj.type}) ---`);
          // Tampilkan 1500 karakter pertama dari string JSON-nya
          console.log(str.slice(0, 2000));
        }
      }
    } catch (e) {
      // ignore
    }
  });
}

main();
