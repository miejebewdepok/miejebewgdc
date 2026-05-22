const fs = require('fs');

const cssPath = 'e:/KASIR MIE JEBEW/warungos/src/app/globals.css';
let css = fs.readFileSync(cssPath, 'utf8');

// Replace glow-pulse with spicy-glow
css = css.replace(/@keyframes glow-pulse[\s\S]*?\}\n\}/g, `/* Fire glow pulsing animations - Red/Yellow combination */
@keyframes spicy-glow {
  0%, 100% {
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.25);
    border-color: rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 0 30px rgba(234, 179, 8, 0.55);
    border-color: rgba(234, 179, 8, 0.7);
  }
}

.glow-active {
  animation: spicy-glow 2.5s infinite;
}`);

// Replace scrollbar thumb with red
css = css.replace(/rgba\(255, 255, 255, 0\.12\)/g, 'rgba(239, 68, 68, 0.2)');
css = css.replace(/rgba\(255, 255, 255, 0\.25\)/g, 'rgba(234, 179, 8, 0.4)');

// Override body background to be pure #09090b like GDC NEW in dark mode
css = css.replace(/linear-gradient\(180deg, #09090b 0%, #18181b 42%, #09090b 100%\);/g, '#09090b;');
css = css.replace(/linear-gradient\(180deg, #fef2f2 0%, #fff1f2 40%, #fef2f2 100%\);/g, '#f1f5f9;');

fs.writeFileSync(cssPath, css);
console.log('done');
