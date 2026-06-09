import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from './firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { formatCurrency } from './utils';
import { Wallet } from '../types';

interface ExpenseRow {
  date: string;
  category: string;
  description: string;
  status: string;
  amount: number;
}

export const generateBalanceSheetPDF = async (userId: string, companyName: string, startDate?: string, endDate?: string) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('ESTADO DE CUENTA DETALLADO', 14, 22);
  doc.setFontSize(12);
  doc.text(`Empresa: ${companyName}`, 14, 30);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 36);

  let periodText = 'Período: Reporte Completo';
  if (startDate && endDate) {
    periodText = `Período: ${startDate} al ${endDate}`;
  } else if (startDate) {
    periodText = `Período: Desde ${startDate}`;
  } else if (endDate) {
    periodText = `Período: Hasta ${endDate}`;
  }
  doc.text(periodText, 14, 42);

  // 1. Fetch Wallets
  const walletsRef = await getDocs(query(collection(db, 'wallets'), where('ownerId', '==', userId)));
  const wallets = walletsRef.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Wallet, 'id'>) } as Wallet));

  // Filter credit cards out of cash balances as bank credit != our owned cash assets
  const cashWallets = wallets.filter(w => w.type !== 'credit_card');
  const creditCardWallets = wallets.filter(w => w.type === 'credit_card');
  
  const cashBalance = cashWallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const creditBalance = creditCardWallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  // 2. Fetch Transactions
  const txRef = await getDocs(query(collection(db, 'transactions'), where('ownerId', '==', userId)));
  let transactions = txRef.docs.map(d => d.data() as any);

  // 3. Fetch Digital Services
  const dsRef = await getDocs(query(collection(db, 'digital_services'), where('ownerId', '==', userId)));
  let digitalServices = dsRef.docs.map(d => d.data() as any);

  // 4. Fetch Ledger
  const ledgerRef = await getDocs(query(collection(db, 'ledger'), where('ownerId', '==', userId), orderBy('date', 'desc')));
  let ledgerEntries = ledgerRef.docs.map(d => d.data() as any);

  // Apply optional inputs date filtering
  if (startDate) {
    transactions = transactions.filter((tx: any) => {
      const txDate = tx.billingDate || tx.date || '';
      return txDate >= startDate;
    });
    digitalServices = digitalServices.filter((ds: any) => {
      const dsDate = ds.createdAt ? ds.createdAt.split('T')[0] : (ds.expirationDate || '');
      return dsDate >= startDate;
    });
    ledgerEntries = ledgerEntries.filter((e: any) => (e.date || '') >= startDate);
  }
  if (endDate) {
    transactions = transactions.filter((tx: any) => {
      const txDate = tx.billingDate || tx.date || '';
      return txDate <= endDate;
    });
    digitalServices = digitalServices.filter((ds: any) => {
      const dsDate = ds.createdAt ? ds.createdAt.split('T')[0] : (ds.expirationDate || '');
      return dsDate <= endDate;
    });
    ledgerEntries = ledgerEntries.filter((e: any) => (e.date || '') <= endDate);
  }

  // Calculated Metrics
  // Receivables (Cuentas por Cobrar)
  const pendingTxReceivables = transactions
    .filter((tx: any) => !tx.isPaid)
    .reduce((sum: number, tx: any) => sum + ((tx.chargedRate || 0) - (tx.amountPaid || 0)), 0);

  const pendingDsReceivables = digitalServices
    .filter((ds: any) => !ds.isPaid)
    .reduce((sum: number, ds: any) => sum + ((ds.revenue || 0) - (ds.amountPaid || 0)), 0);

  const totalReceivables = pendingTxReceivables + pendingDsReceivables;

  // Payables (Cuentas por Pagar & Costos Pendientes)
  const pendingTxPayables = transactions
    .filter((tx: any) => !tx.isCostPaid)
    .reduce((sum: number, tx: any) => {
      const costVal = tx.baseCost !== undefined ? tx.baseCost : 5.0;
      return sum + (costVal - (tx.costPaid || 0));
    }, 0);

  const pendingDsPayables = digitalServices
    .filter((ds: any) => !ds.isCostPaid)
    .reduce((sum: number, ds: any) => sum + ((ds.cost || 0) - (ds.costPaid || 0)), 0);

  const pendingLedgerPayables = ledgerEntries
    .filter((e: any) => e.isPending && e.amount < 0)
    .reduce((sum: number, e: any) => sum + Math.abs(e.amount), 0);

  const totalPayables = pendingTxPayables + pendingDsPayables + pendingLedgerPayables;

  // Realized income vs expenses
  const totalRealizedIncome = ledgerEntries
    .filter((e: any) => !e.isPending && e.amount > 0)
    .reduce((sum: number, e: any) => sum + e.amount, 0);

  const totalRealizedExpense = ledgerEntries
    .filter((e: any) => !e.isPending && e.amount < 0)
    .reduce((sum: number, e: any) => sum + Math.abs(e.amount), 0);

  // Grouped Categories for Page 1 Overview
  const incomeByCategory: { [cat: string]: number } = {};
  ledgerEntries
    .filter((e: any) => !e.isPending && e.amount > 0)
    .forEach((e: any) => {
      const cat = e.category || 'Otros Ingresos';
      incomeByCategory[cat] = (incomeByCategory[cat] || 0) + e.amount;
    });

  const expenseByCategory: { [cat: string]: number } = {};
  ledgerEntries
    .filter((e: any) => !e.isPending && e.amount < 0)
    .forEach((e: any) => {
      const cat = e.category || 'Gasto General';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Math.abs(e.amount);
    });

  doc.setFontSize(14);
  doc.text('1. Resumen General Financiero', 14, 50);
  
  autoTable(doc, {
    startY: 55,
    head: [['Indicador / Concepto', 'Monto']],
    body: [
      ['Total Efectivo y Bancos (Caja Real Propia)', formatCurrency(cashBalance)],
      ['Tarjetas de Crédito (Cupo Total Disponible - *No cuenta como Efectivo*)', formatCurrency(creditBalance)],
      ['Ingresos Totales Reales (Asentados)', formatCurrency(totalRealizedIncome)],
      ['Gastos Totales Reales (Asentados)', formatCurrency(-totalRealizedExpense)],
      ['Cuentas por Cobrar (Ingresos Pendientes)', formatCurrency(totalReceivables)],
      ['Cuentas por Pagar (Gastos Programados / Proveedores)', formatCurrency(-totalPayables)],
      ['Balance Neto Estimado (Caja Real + Cobros - Pagos)', formatCurrency(cashBalance + totalReceivables - totalPayables)]
    ],
    theme: 'grid',
    headStyles: { fillColor: [67, 56, 202] }, // Deep indigo
    columnStyles: {
      1: { halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: function(data) {
      if (data.section === 'body') {
        const valText = String(data.cell.raw);
        const valNum = parseFloat(valText.replace(/[^0-9.-]+/g, ""));
        if (!isNaN(valNum)) {
          if (valNum < 0) {
            data.cell.styles.textColor = [225, 29, 72]; // Soft rose for negative
          } else if (valNum > 0 && [0, 2, 4, 6].includes(data.row.index)) {
            data.cell.styles.textColor = [16, 185, 129]; // Emerald for assets/income
          }
        }
      }
    }
  });

  const walletsY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(13);
  doc.text('2. Cuentas y Saldos (Efectivo vs. Tarjetas de Banco)', 14, walletsY);
  
  if (wallets.length > 0) {
    autoTable(doc, {
      startY: walletsY + 4,
      head: [['Billetera/Cuenta', 'Clasificación', 'Estado de Fondos']],
      body: wallets.map(w => {
        let displayType: string = w.type;
        if (w.type === 'credit_card') displayType = 'Tarjeta de Crédito (Línea de Crédito)';
        if (w.type === 'cash') displayType = 'Efectivo Cash';
        if (w.type === 'bank') displayType = 'Banco / Cuenta de Ahorro';
        if (w.type === 'digital_wallet') displayType = 'Billetera Digital';
        
        return [w.name, displayType, formatCurrency(w.balance)];
      }),
      theme: 'striped',
      columnStyles: {
        2: { halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: function(data) {
        if (data.section === 'body') {
          const typeVal = String(data.row.raw[1]);
          if (typeVal.includes('Tarjeta')) {
            data.cell.styles.textColor = [109, 40, 217]; // Violet for credit cards
          }
        }
      }
    });
  }

  // Grouped breakdown of Revenues & General Expenses on Page 1
  const categoriesY = (doc as any).lastAutoTable.finalY + 10;
  
  if (categoriesY < 240) {
    doc.setFontSize(13);
    doc.text('3. Valores Generales de Ingresos y Gastos por Categoría', 14, categoriesY);
    
    const catRows: any[] = [];
    Object.entries(incomeByCategory).forEach(([cat, amt]) => {
      catRows.push([`Ingreso: ${cat}`, 'Ingreso Neto', formatCurrency(amt)]);
    });
    Object.entries(expenseByCategory).forEach(([cat, amt]) => {
      catRows.push([`Gasto: ${cat}`, 'Gasto General', formatCurrency(-amt)]);
    });

    if (catRows.length > 0) {
      autoTable(doc, {
        startY: categoriesY + 4,
        head: [['Categoría / Concepto', 'Tipo de Cuenta', 'Monto Acumulado']],
        body: catRows,
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85] },
        columnStyles: {
          2: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: function(data) {
          if (data.section === 'body') {
            const rowVal = String(data.cell.raw);
            if (rowVal.startsWith('-')) {
              data.cell.styles.textColor = [225, 29, 72];
            } else if (data.column.index === 2 && !rowVal.startsWith('-')) {
              data.cell.styles.textColor = [16, 185, 129];
            }
          }
        }
      });
    }
  } else {
    // If we've run out of space on Page 1, we add a page for the general categories so it stays spacious
    doc.addPage();
    doc.setFontSize(14);
    doc.text('3. Valores Generales de Ingresos y Gastos por Categoría', 14, 20);
    
    const catRows: any[] = [];
    Object.entries(incomeByCategory).forEach(([cat, amt]) => {
      catRows.push([`Ingreso: ${cat}`, 'Ingreso Neto', formatCurrency(amt)]);
    });
    Object.entries(expenseByCategory).forEach(([cat, amt]) => {
      catRows.push([`Gasto: ${cat}`, 'Gasto General', formatCurrency(-amt)]);
    });

    if (catRows.length > 0) {
      autoTable(doc, {
        startY: 25,
        head: [['Categoría / Concepto', 'Tipo de Cuenta', 'Monto Acumulado']],
        body: catRows,
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85] },
        columnStyles: {
          2: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: function(data) {
          if (data.section === 'body') {
            const rowVal = String(data.cell.raw);
            if (rowVal.startsWith('-')) {
              data.cell.styles.textColor = [225, 29, 72];
            } else if (data.column.index === 2 && !rowVal.startsWith('-')) {
              data.cell.styles.textColor = [16, 185, 129];
            }
          }
        }
      });
    }
  }

  // --- PAGE 2: DETAILED OUTBREAK OF GASTOS (ORDER 2) ---
  const detailedExpenses: ExpenseRow[] = [];

  // 1. Regular ledger expenses
  ledgerEntries.forEach((e: any) => {
    if (e.amount < 0) {
      detailedExpenses.push({
        date: e.date || e.dueDate || '-',
        category: e.category || 'Gasto General',
        description: e.description || '-',
        status: e.isPending ? 'Programado' : 'Asentado',
        amount: e.amount
      });
    }
  });

  // 2. Pending transaction supplier costs (unpaid base updates costs)
  transactions.forEach((tx: any) => {
    if (!tx.isCostPaid) {
      const costVal = tx.baseCost !== undefined ? tx.baseCost : 5.0;
      const remaining = costVal - (tx.costPaid || 0);
      if (remaining > 0) {
        detailedExpenses.push({
          date: tx.billingDate || '-',
          category: 'Proveedor ANT',
          description: `Costo actualización de ${tx.finalClientName || 'Cliente'} (${tx.warehouse})`,
          status: 'Pendiente Proveedor',
          amount: -remaining
        });
      }
    }
  });

  // 3. Pending digital service costs
  digitalServices.forEach((ds: any) => {
    if (!ds.isCostPaid) {
      const remaining = (ds.cost || 0) - (ds.costPaid || 0);
      if (remaining > 0) {
        detailedExpenses.push({
          date: ds.expirationDate || '-',
          category: ds.supplierName || ds.supplier || 'Proveedor Digital',
          description: `Costo servicio: ${ds.name} - ${ds.clientName}`,
          status: 'Pendiente Proveedor',
          amount: -remaining
        });
      }
    }
  });

  // Sort detailed expenses by date desc
  detailedExpenses.sort((a, b) => b.date.localeCompare(a.date));

  doc.addPage();
  doc.setFontSize(14);
  doc.text('Detallado Completo de Gastos y Egresos', 14, 20);
  doc.setFontSize(10);
  doc.text('Análisis cronológico detallado de todos los egresos reales, costos y egresos programados.', 14, 26);

  if (detailedExpenses.length === 0) {
    doc.text('No se registraron egresos en el sistema.', 14, 36);
  } else {
    autoTable(doc, {
      startY: 32,
      head: [['Fecha', 'Concepto / Categoría', 'Descripción / Detalle', 'Estado', 'Monto']],
      body: detailedExpenses.map(e => [
        e.date,
        e.category,
        e.description,
        e.status,
        formatCurrency(e.amount)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [225, 29, 72] }, // Red header color specifically for Expenses/Egreso breakout
      columnStyles: {
        4: { halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 4) {
          data.cell.styles.textColor = [225, 29, 72]; // Force soft crimson text color for amounts
        }
      }
    });
  }

  // --- PAGE 3+: WALLET DETAILED MOVEMENTS ---
  for (const wallet of wallets) {
    const movements = ledgerEntries.filter(l => l.walletId === wallet.id);
    
    if (movements.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text(`Movimientos Detallados: ${wallet.name} (${formatCurrency(wallet.balance)})`, 14, 20);
      
      autoTable(doc, {
        startY: 25,
        head: [['Fecha', 'Concepto', 'Descripción', 'Monto']],
        body: movements.map(m => [
          m.date,
          m.category,
          m.description || '-',
          m.amount > 0 ? `+${formatCurrency(m.amount)}` : formatCurrency(m.amount)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85] },
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index === 3) {
            const rawValText = String(data.cell.raw);
            const rawVal = parseFloat(rawValText.replace(/[^0-9.-]+/g,""));
            if (rawVal > 0) {
              data.cell.styles.textColor = [16, 185, 129]; // emerald
            } else if (rawVal < 0) {
              data.cell.styles.textColor = [225, 29, 72]; // rose
            }
          }
        }
      });
    }
  }

  // --- LAST PAGE: OUTSTANDING ACCOUNTS RECEIVABLES ---
  const pendingTx = transactions.filter((tx: any) => !tx.isPaid);
  if (pendingTx.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Cuentas por Cobrar Pendientes (Actualizaciones y Otros)', 14, 20);
    autoTable(doc, {
      startY: 25,
      head: [['Origen / Ref', 'Cliente Final', 'Monto Pendiente']],
      body: pendingTx.map(tx => [
        tx.intermediaryName, 
        tx.finalClientName, 
        formatCurrency((tx.chargedRate || 0) - (tx.amountPaid || 0))
      ]),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }
    });
  }

  doc.save(`Estado_Cuenta_${new Date().toISOString().split('T')[0]}.pdf`);
};
