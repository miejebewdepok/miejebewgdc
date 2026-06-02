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

  console.log("Mencari hasil query SELECT * FROM products...");

  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    try {
      const obj = JSON.parse(line);
      const str = JSON.stringify(obj);

      // Cari query output dari SELECT * FROM products
      if (str.includes("yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn") && str.includes("buy_price") && str.includes("sell_price")) {
        console.log(`\n--- Step ${obj.step_index || idx} (${obj.type}) ---`);
        // Let's print the entire content or result if it has it
        if (obj.content && obj.content.includes("yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn")) {
          console.log("CONTENT:\n", obj.content.slice(0, 5000));
        }
        if (obj.tool_calls) {
          obj.tool_calls.forEach(tc => {
            if (tc.result && typeof tc.result === 'string') {
              console.log("TOOL RESULT:\n", tc.result.slice(0, 5000));
            }
          });
        }
      }
    } catch (e) {
      // ignore
    }
  });
}

main();
