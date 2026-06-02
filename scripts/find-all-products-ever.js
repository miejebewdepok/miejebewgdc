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

  console.log("Mencari semua nama produk yang pernah tercatat di log...");

  const allProducts = new Map();

  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    try {
      const obj = JSON.parse(line);
      const str = JSON.stringify(obj);

      // Cari pattern "name":"..." dan "sell_price":...
      const matches = str.match(/"name"\s*:\s*"([^"]+)"/g);
      if (matches) {
        matches.forEach(m => {
          const name = m.replace(/"name"\s*:\s*"/, '').replace(/"/, '');
          
          // Filter out tool names, filenames, page names, or common code keywords
          if (
            name !== "view_file" && name !== "list_dir" && name !== "grep_search" && 
            name !== "write_to_file" && name !== "replace_file_content" && 
            name !== "run_command" && name !== "multi_replace_file_content" && 
            name !== "ask_permission" && name !== "generate_image" && 
            name !== "invoke_subagent" && name !== "ask_question" &&
            name !== "store_profiles" && name !== "products" && name !== "transactions" &&
            name !== "transaction_items" && name !== "user" && name !== "session" &&
            name !== "account" && name !== "verification" && name !== "ai_chats" &&
            name !== "ai_messages" && name !== "saved_bills" && name !== "expenses" &&
            name !== "debts" && name !== "customer_promo_claims" && !name.endsWith(".js") &&
            !name.endsWith(".ts") && !name.endsWith(".tsx") && !name.includes("/")
          ) {
            allProducts.set(name, (allProducts.get(name) || 0) + 1);
          }
        });
      }
    } catch (e) {
      // ignore
    }
  });

  console.log("=== SEMUA NAMA PRODUK UNIK DI LOG ===");
  const sorted = Array.from(allProducts.entries()).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([name, count]) => {
    console.log(`- ${name} (muncul ${count} kali)`);
  });
}

main();
