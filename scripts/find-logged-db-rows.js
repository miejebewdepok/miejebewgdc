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

  console.log("Mencari hasil query database products di log...");

  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    try {
      const obj = JSON.parse(line);
      const str = JSON.stringify(obj);

      // Cari if there is output containing product records
      if (str.includes("select") && str.includes("products") && (str.includes("rows") || str.includes("output"))) {
        if (str.includes("name") && (str.includes("Jebew") || str.includes("Es") || str.includes("Spaghetti"))) {
          console.log(`\n--- Step ${obj.step_index || idx} (${obj.type}) ---`);
          if (obj.content && obj.content.length > 50) {
            console.log("CONTENT:", obj.content.slice(0, 2000));
          }
          if (obj.tool_calls) {
            console.log("TOOL CALLS:", JSON.stringify(obj.tool_calls, null, 2));
          }
        }
      }
    } catch (e) {
      // ignore
    }
  });
}

main();
