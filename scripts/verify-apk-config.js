const fs = require('fs');
const path = require('path');

const capConfigPath = path.join(__dirname, '../capacitor.config.json');
const workflowPath = path.join(__dirname, '../.github/workflows/build-apk.yml');

function run() {
  console.log('🔍 Checking APK and workflow domain consistency...');

  // 1. Read capacitor.config.json
  if (!fs.existsSync(capConfigPath)) {
    console.error('❌ Error: capacitor.config.json not found!');
    process.exit(1);
  }
  
  const capConfig = JSON.parse(fs.readFileSync(capConfigPath, 'utf8'));
  const capUrl = capConfig?.server?.url;
  
  if (!capUrl) {
    console.error('❌ Error: server.url not found in capacitor.config.json!');
    process.exit(1);
  }

  // 2. Read build-apk.yml
  if (!fs.existsSync(workflowPath)) {
    console.error('❌ Error: .github/workflows/build-apk.yml not found!');
    process.exit(1);
  }

  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  const appUrlMatch = workflowContent.match(/NEXT_PUBLIC_APP_URL:\s*["']([^"']+)["']/);

  if (!appUrlMatch) {
    console.error('❌ Error: NEXT_PUBLIC_APP_URL not found in build-apk.yml!');
    process.exit(1);
  }

  const workflowUrl = appUrlMatch[1];

  console.log(`📍 Capacitor Server URL: "${capUrl}"`);
  console.log(`📍 Workflow App URL:    "${workflowUrl}"`);

  // 3. Compare
  if (capUrl !== workflowUrl) {
    console.error('❌ ERROR: APK domain mismatch! capacitor.config.json and build-apk.yml URLs must match to prevent WebView browser redirect issues.');
    process.exit(1);
  }

  console.log('✅ Success: APK domains are aligned and consistent!');
  process.exit(0);
}

run();
