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

  console.log("Mencari daftar 30 produk asli di log (sebelum step 9600)...");

  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    try {
      const obj = JSON.parse(line);
      const str = JSON.stringify(obj);

      // Kita cari step index kecil (misal di bawah 9600)
      const stepIdx = obj.step_index || idx;
      if (stepIdx < 9600) {
        // Cari jika mengandung query select pada products atau rows database
        if (str.includes("yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn") && (str.includes("Mie") || str.includes("Dimsum") || str.includes("Es"))) {
          console.log(`\n--- Step ${stepIdx} (${obj.type}) ---`);
          // Print 3000 chars of content
          if (obj.content) console.log("CONTENT:\n", obj.content.slice(0, 3000));
          if (obj.tool_calls) {
            obj.tool_calls.forEach(tc => {
              if (tc.result && typeof tc.result === 'string') {
                console.log("RESULT:\n", tc.result.slice(0, 3000));
              }
              if (tc.args) {
                console.log("ARGS:\n", JSON.stringify(tc.args).slice(0, 3000));
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
