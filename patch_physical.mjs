import fs from 'fs';

let content = fs.readFileSync('src/components/PhysicalCommerce.tsx', 'utf8');

// Add import
if (!content.includes('CollectionsTab')) {
  content = content.replace('import React', 'import { CollectionsTab } from "./PhysicalCommerceCollections";\nimport React');
}

// Update state
content = content.replace('useState<"inventory" | "sales">("inventory");', 'useState<"inventory" | "sales" | "collections">("inventory");');

// Add tab button
const tabButtonCode = `
          <button
            onClick={() => setActiveTab("collections")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all",
              activeTab === "collections"
                ? isDark
                  ? "bg-slate-700 text-white shadow"
                  : "bg-slate-100 text-slate-900 shadow-sm"
                : isDark
                  ? "text-slate-400 hover:text-slate-300"
                  : "text-slate-500 hover:text-slate-700",
            )}
          >
            <CreditCard className="w-4 h-4" />
            Cobranza
          </button>
        </div>
`;

content = content.replace('        </div>\n      </div>\n      <div className="flex-1 w-full overflow-y-auto p-4 lg:p-8">', tabButtonCode + '      </div>\n      <div className="flex-1 w-full overflow-y-auto p-4 lg:p-8">');

// Render CollectionsTab
const renderCode = `        {activeTab === "inventory" && <InventoryTab user={user} isDark={isDark} />}
        {activeTab === "sales" && <SalesTab user={user} isDark={isDark} />}
        {activeTab === "collections" && <CollectionsTab user={user} isDark={isDark} />}`;

content = content.replace(
  /{activeTab === "inventory"\s*\?\s*\(\s*<InventoryTab user={user} isDark={isDark} \/>\s*\)\s*:\s*\(\s*<SalesTab user={user} isDark={isDark} \/>\s*\)}/,
  renderCode
);

fs.writeFileSync('src/components/PhysicalCommerce.tsx', content);
console.log("Patched PhysicalCommerce.tsx");
