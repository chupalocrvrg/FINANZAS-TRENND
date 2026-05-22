import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from './firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { formatCurrency } from './utils';

export const generateBalanceSheetPDF = async (userId: string, companyName: string) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('ESTADO DE CUENTA', 14, 22);
  doc.setFontSize(12);
  doc.text(`Empresa: ${companyName}`, 14, 30);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 36);

  // Fetch Wallets
  const walletsRef = await getDocs(query(collection(db, 'wallets'), where('ownerId', '==', userId)));
  const wallets = walletsRef.docs.map(d => d.data());
  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  // Fetch Transactions (Cuentas por cobrar)
  const txRef = await getDocs(query(collection(db, 'transactions'), where('ownerId', '==', userId), where('isPaid', '==', false)));
  const pendingTx = txRef.docs.map(d => d.data());
  const receivables = pendingTx.reduce((sum, tx) => sum + (tx.chargedRate || 0), 0);

  doc.setFontSize(14);
  doc.text('Resumen General', 14, 50);
  
  autoTable(doc, {
    startY: 55,
    head: [['Concepto', 'Total']],
    body: [
      ['Saldo en Billeteras / Efectivo', formatCurrency(totalBalance)],
      ['Cuentas por Cobrar (ANT)', formatCurrency(receivables)],
      ['Balance General (Aproximado)', formatCurrency(totalBalance + receivables)]
    ],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] }
  });

  if (wallets.length > 0) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Billetera', 'Tipo', 'Saldo']],
      body: wallets.map(w => [w.name, w.type, formatCurrency(w.balance)]),
      theme: 'striped',
    });
  }

  if (pendingTx.length > 0) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Intermediario / Origen', 'Cliente Final', 'Monto']],
      body: pendingTx.map(tx => [tx.intermediaryName, tx.finalClientName, formatCurrency(tx.chargedRate)]),
      theme: 'striped',
      headStyles: { fillColor: [225, 29, 72] }
    });
  }

  doc.save('balance_general.pdf');
};
