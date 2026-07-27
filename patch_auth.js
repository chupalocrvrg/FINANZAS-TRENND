const fs = require('fs');
let content = fs.readFileSync('src/lib/AuthContext.tsx', 'utf8');
if (!content.includes('commerceMarginPVP')) {
  content = content.replace('commerceLateFeePercentage?: number;', 'commerceLateFeePercentage?: number;\n  commerceMarginPVP?: number;\n  commerceMargin3M?: number;\n  commerceMargin6M?: number;');
  fs.writeFileSync('src/lib/AuthContext.tsx', content);
  console.log('patched AuthContext.tsx');
}
