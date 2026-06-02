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

  console.log("Mencari daftar produk...");

  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    try {
      const obj = JSON.parse(line);
      const str = JSON.stringify(obj);

      // Cari if it lists products, e.g., print statements or database queries or files containing products
      if (str.includes("Mie Jebew") || str.includes("Es Teh") || str.includes("Dimsum") || str.includes("Lumpia")) {
        // Let's filter out tools execution but search for output or code contents
        if (str.includes("id-ID") || str.includes("sellPrice") || str.includes("sell_price")) {
          // Let's see if we have JSON output of products
          console.log(`\n--- Step ${obj.step_index || idx} (${obj.type}) ---`);
          if (obj.content && obj.content.length > 50) {
            console.log("CONTENT:", obj.content.slice(0, 1500));
          }
          if (obj.tool_calls) {
            obj.tool_calls.forEach(tc => {
              if (tc.args && JSON.stringify(tc.args).includes("products")) {
                console.log("TOOL CALL ARGS:", JSON.stringify(tc.args).slice(0, 1500));
              }
            });
          }
        }
      }
    } catch (e) {
      // ignore
    }
  });
}

main();
