import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from './firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { formatCurrency } from './utils';
import { Wallet } from '../types';

export const generateBalanceSheetPDF = async (userId: string, companyName: string) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('ESTADO DE CUENTA DETALLADO', 14, 22);
  doc.setFontSize(12);
  doc.text(`Empresa: ${companyName}`, 14, 30);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 36);

  // Fetch Wallets
  const walletsRef = await getDocs(query(collection(db, 'wallets'), where('ownerId', '==', userId)));
  const wallets = walletsRef.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Wallet, 'id'>) } as Wallet));
  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  // Fetch Transactions (Cuentas por cobrar)
  const txRef = await getDocs(query(collection(db, 'transactions'), where('ownerId', '==', userId), where('isPaid', '==', false)));
  const pendingTx = txRef.docs.map(d => d.data() as any);
  const receivables = pendingTx.reduce((sum: number, tx: any) => sum + (tx.chargedRate || 0), 0);

  doc.setFontSize(14);
  doc.text('Resumen General Financiero', 14, 50);
  
  autoTable(doc, {
    startY: 55,
    head: [['Concepto', 'Total']],
    body: [
      ['Total Efectivo / Billeteras', formatCurrency(totalBalance)],
      ['Cuentas por Cobrar (ANT)', formatCurrency(receivables)],
      ['Balance General Estimado', formatCurrency(totalBalance + receivables)]
    ],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] }
  });

  if (wallets.length > 0) {
    doc.setFontSize(12);
    doc.text('Resumen de Cuentas/Billeteras', 14, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Billetera', 'Tipo', 'Saldo']],
      body: wallets.map(w => [w.name, w.type, formatCurrency(w.balance)]),
      theme: 'striped',
    });
  }

  // Fetch Ledger for Wallet Detail Movements
  const ledgerRef = await getDocs(query(collection(db, 'ledger'), where('ownerId', '==', userId), orderBy('date', 'desc')));
  const ledgerEntries = ledgerRef.docs.map(d => d.data() as any);

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

  if (pendingTx.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Cuentas por Cobrar Pendientes (Actualizaciones y Otros)', 14, 20);
    autoTable(doc, {
      startY: 25,
      head: [['Origen / Ref', 'Cliente Final', 'Monto']],
      body: pendingTx.map(tx => [tx.intermediaryName, tx.finalClientName, formatCurrency(tx.chargedRate)]),
      theme: 'striped',
      headStyles: { fillColor: [225, 29, 72] }
    });
  }

  doc.save(`Estado_Cuenta_${new Date().toISOString().split('T')[0]}.pdf`);
};
