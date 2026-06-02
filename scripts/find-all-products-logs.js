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

  console.log("Mencari tabel cetak database di log...");

  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    try {
      const obj = JSON.parse(line);
      const str = JSON.stringify(obj);

      // Cari if there is table character in the log
      if (str.includes("┌") || str.includes("├") || str.includes("│")) {
        // Let's see if it has columns related to products
        if (str.includes("category") || str.includes("sell_price") || str.includes("name")) {
          console.log(`\n--- Step ${obj.step_index || idx} (${obj.type}) ---`);
          if (obj.content) console.log("CONTENT:", obj.content.slice(0, 1000));
          
          // Print the tool result if it exists and contains table format
          if (obj.tool_calls) {
            obj.tool_calls.forEach(tc => {
              if (tc.result && typeof tc.result === 'string') {
                console.log("RESULT TABLE:\n", tc.result);
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
