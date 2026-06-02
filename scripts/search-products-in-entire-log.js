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

  console.log("Searching for products arrays in the log file...");

  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    try {
      const obj = JSON.parse(line);
      const str = JSON.stringify(obj);

      // Search for product name keywords that indicate a real product list
      if (str.includes("Mie Angel") || str.includes("Mie Setan") || str.includes("Mie Iblis") || str.includes("Es Genderuwo")) {
        console.log(`\n--- Step ${obj.step_index || idx} (${obj.type}) ---`);
        console.log("FOUND!");
        
        // Print the JSON structure if it contains the products
        if (obj.tool_calls) {
          obj.tool_calls.forEach(tc => {
            if (tc.args && JSON.stringify(tc.args).includes("Mie Setan")) {
              console.log("TOOL CALL ARGS:\n", JSON.stringify(tc.args, null, 2));
            }
          });
        }
        if (obj.content && (obj.content.includes("Mie Setan") || obj.content.includes("Mie Iblis"))) {
          console.log("CONTENT:\n", obj.content.slice(0, 3000));
        }
      }
    } catch (e) {
      // ignore
    }
  });
}

main();
