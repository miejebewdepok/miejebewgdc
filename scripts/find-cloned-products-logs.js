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

  console.log("Searching for 30 products references in the log...");

  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    try {
      const obj = JSON.parse(line);
      const str = JSON.stringify(obj);

      if (str.includes("30 source products") || str.includes("30 products") || str.includes("cloned")) {
        console.log(`\n--- Step ${obj.step_index || idx} (${obj.type}) ---`);
        console.log(str.slice(0, 1500));
      }
    } catch (e) {
      // ignore
    }
  });
}

main();
