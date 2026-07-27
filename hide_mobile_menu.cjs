const fs = require('fs');
const file = 'src/App.tsx';
let data = fs.readFileSync(file, 'utf8');

// We can just find the start of the submenu drawer and the mobile bottom navigation bar and add 'hidden' to their root elements, or comment them out.
// Wait, the easiest way is to add "hidden " to the start of className string in these elements.

data = data.replace(
  'className={cn(\n                "fixed bottom-18 left-4 right-4 rounded-2xl p-4 z-40 lg:hidden shadow-[0_-8px_32px_rgba(0,0,0,0.3)] border flex flex-col gap-1.5",',
  'className={cn(\n                "hidden fixed bottom-18 left-4 right-4 rounded-2xl p-4 z-40 lg:hidden shadow-[0_-8px_32px_rgba(0,0,0,0.3)] border flex flex-col gap-1.5",'
);

data = data.replace(
  '      {/* Mobile Bottom Navigation Bar */}\n      <div className={cn(\n        "fixed bottom-0 left-0 right-0 h-16 border-t flex items-center justify-around px-2 z-40 lg:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.15)] pb-safe",',
  '      {/* Mobile Bottom Navigation Bar */}\n      <div className={cn(\n        "hidden fixed bottom-0 left-0 right-0 h-16 border-t flex items-center justify-around px-2 z-40 lg:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.15)] pb-safe",'
);

// We should also remove pb-24 lg:pb-32 in main and replace with pb-28
data = data.replace(
  '      <main className="flex-1 flex flex-col relative overflow-y-auto max-h-screen pb-24 lg:pb-32">',
  '      <main className="flex-1 flex flex-col relative overflow-y-auto max-h-screen pb-32">'
);

fs.writeFileSync(file, data);
