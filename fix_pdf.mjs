import fs from 'fs';

let content = fs.readFileSync('src/components/PhysicalCommerceCollections.tsx', 'utf8');

content = content.replace('import "jspdf-autotable";', 'import autoTable from "jspdf-autotable";');
content = content.replace('(doc as any).autoTable({', 'autoTable(doc, {');

fs.writeFileSync('src/components/PhysicalCommerceCollections.tsx', content);
