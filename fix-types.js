const fs = require('fs');
const path = require('path');

const dir = 'e:/KASIR MIE JEBEW/warungos/src/components/warung/gdc';

function fixFile(filename) {
    const p = path.join(dir, filename);
    let c = fs.readFileSync(p, 'utf8');
    c = c.replace('../types', '@/lib/types');
    
    // Fix Dashboard
    if (filename === 'Dashboard.tsx') {
        c = c.replace('bill.items.map(it =>', 'bill.items.map((it: any) =>');
        c = c.replace('bill.items.reduce((sum, i) =>', 'bill.items.reduce((sum: number, i: any) =>');
    }
    // Fix FinancialReport
    if (filename === 'FinancialReport.tsx') {
        c = c.replace('topSellingProducts.map((item, idx) =>', 'topSellingProducts.map((item: any, idx: number) =>');
        c = c.replace('hourlyData.map((item) =>', 'hourlyData.map((item: any) =>');
    }
    // Fix SavedBillsModal
    if (filename === 'SavedBillsModal.tsx') {
        c = c.replace('bill.items.reduce((sum, item) =>', 'bill.items.reduce((sum: number, item: any) =>');
        c = c.replace('bill.items.map((item, idx) =>', 'bill.items.map((item: any, idx: number) =>');
    }
    // Fix SettingsPanel
    if (filename === 'SettingsPanel.tsx') {
        c = c.replace('map(n =>', 'map((n: any) =>');
    }
    // Fix TransactionHistory
    if (filename === 'TransactionHistory.tsx') {
        c = c.replace('tx.items.map((item, idx) =>', 'tx.items.map((item: any, idx: number) =>');
    }
    
    fs.writeFileSync(p, c);
}

fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.tsx')) fixFile(file);
});

// Also fix product-card.tsx if needed
console.log('done');
