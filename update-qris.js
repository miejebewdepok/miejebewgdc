const { Client } = require('pg');
const fs = require('fs');

async function main() {
  console.log("Starting QRIS image update...");
  
  // 1. Read the uploaded QRIS image and convert to Base64 data URL
  const imagePath = "C:\\Users\\PIQ\\.gemini\\antigravity\\brain\\50a6d631-5d5f-4cbe-96ba-7e94e4f00c8a\\media__1779931386016.png";
  if (!fs.existsSync(imagePath)) {
    console.error("Error: QRIS image not found at path:", imagePath);
    return;
  }
  
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const dataUrl = `data:image/png;base64,${base64Image}`;
  console.log("Converted QRIS image to Base64 data URL (length:", dataUrl.length, ")");
  
  // 2. Connect to the PostgreSQL Supabase database
  const connectionString = "postgresql://postgres.ellodvcrbiaumzvjqeiy:Seloesin1204@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres";
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Connected to Supabase database successfully!");
    
    // 3. Fetch all store profile rows
    const res = await client.query("SELECT user_id, store_name, business_notes FROM store_profiles;");
    if (res.rows.length === 0) {
      console.error("Error: No store profile found in database.");
      return;
    }
    
    console.log(`Found ${res.rows.length} store profile(s). Updating all...`);
    
    for (const row of res.rows) {
      console.log("- Processing profile:", row.store_name, `(user_id: ${row.user_id})`);
      
      // 4. Parse business_notes JSON
      let extra = {};
      if (row.business_notes && row.business_notes.trim().startsWith("{")) {
        try {
          extra = JSON.parse(row.business_notes);
        } catch (e) {
          console.error("  Warning: Failed to parse current business_notes JSON, starting fresh.");
        }
      }
      
      // 5. Update settings
      extra.qrisStaticCodeUrl = dataUrl;
      extra.qrisUploadUrl = dataUrl;
      extra.qrisType = "upload";
      extra.qrisName = "MIE JEBEW GDC";
      
      const updatedBusinessNotes = JSON.stringify(extra);
      
      // 6. Update row in database
      await client.query(
        "UPDATE store_profiles SET business_notes = $1, updated_at = NOW() WHERE user_id = $2;",
        [updatedBusinessNotes, row.user_id]
      );
      
      console.log(`  SUCCESS: Updated profile '${row.store_name}'!`);
    }
  } catch (err) {
    console.error("Error in database operation:", err.message);
  } finally {
    await client.end();
  }
}

main().catch(err => console.error("Script execution failed:", err));
