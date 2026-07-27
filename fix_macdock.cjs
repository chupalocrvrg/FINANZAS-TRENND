const fs = require('fs');
const file = 'src/components/MacDock.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  '    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 hidden lg:flex items-end h-24">',
  '    <div className="fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-end h-24 max-w-[100vw] overflow-x-auto overflow-y-visible px-4 pb-2 scrollbar-hide">'
);

fs.writeFileSync(file, data);
