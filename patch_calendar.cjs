const fs = require('fs');
const file = 'src/components/Dashboard.tsx';
let data = fs.readFileSync(file, 'utf8');

// 1. Update getDayFinancials to compute dayReceivables
const getDayFinMatch = `    const expiringServices = digitalServices.filter(s => s.expirationDate === dateStr && !s.deletedFromModule);`;
const dayReceivablesLogic = `    const dayReceivables = receivables.filter(rx => {
      if (rx.isTx) return rx.createdAt && rx.createdAt.startsWith(dateStr);
      if (rx.isTx === false) return rx.expirationDate === dateStr;
      if (rx.isLedger) return rx.dueDate === dateStr || rx.date === dateStr;
      return false;
    });
`;
data = data.replace(getDayFinMatch, getDayFinMatch + '\n' + dayReceivablesLogic);

const returnMatch = `      pendingLedger,
      expiringServices
    };`;
const newReturn = `      pendingLedger,
      expiringServices,
      dayReceivables
    };`;
data = data.replace(returnMatch, newReturn);

// 2. Add visual elements to the day box
const oldDayBox = `{dayFin.pendingPaymentsCount > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" title={\`\${dayFin.pendingPaymentsCount} programados\`} />
                  )}`;

const newDayBox = `{dayFin.pendingPaymentsCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title={\`\${dayFin.pendingPaymentsCount} programados\`} />
                  )}
                </div>
                
                <div className="flex flex-col gap-0.5 mt-1">
                  {dayFin.expiringServices.length > 0 && (
                    <div className="text-[8px] font-bold text-rose-500 bg-rose-500/10 px-1 py-0.5 rounded truncate">
                       {dayFin.expiringServices.length} {dayFin.expiringServices.length === 1 ? 'Corte' : 'Cortes'}
                    </div>
                  )}
                  {dayFin.dayReceivables.length > 0 && (
                    <div className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded truncate" title="Total Cuentas por Cobrar">
                       AR: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dayFin.dayReceivables.reduce((s, rx) => s + (rx.pendingAmount || 0), 0))}
                    </div>
                  )}
`;

data = data.replace(oldDayBox + '\n                </div>', newDayBox);
fs.writeFileSync(file, data);
