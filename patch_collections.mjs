import fs from 'fs';

let content = fs.readFileSync('src/components/PhysicalCommerceCollections.tsx', 'utf8');

// Modify clientData memo
content = content.replace(
`      if (sale.status === 'completed') return; // Skip fully paid sales`,
`      // Include all sales to allow history view`
);

content = content.replace(
`      (sale.installments || []).forEach((inst: any, idx: number) => {
        if (inst.status !== 'paid') {
          const pending = inst.amount - (inst.paidAmount || 0);
          data[cId].totalPending += pending;
          data[cId].installments.push({
            ...inst,
            saleId: sale.id,
            saleItems: sale.items || [],
            installmentIndex: idx,
            pendingAmount: pending
          });
        }
      });`,
`      (sale.installments || []).forEach((inst: any, idx: number) => {
        const pending = inst.amount - (inst.paidAmount || 0);
        if (inst.status !== 'paid') {
          data[cId].totalPending += pending;
        }
        data[cId].installments.push({
          ...inst,
          saleId: sale.id,
          saleItems: sale.items || [],
          installmentIndex: idx,
          pendingAmount: pending
        });
      });`
);

// We need to keep clients even if totalPending is 0, if we search for them to see history.
// User said: "no me permite buscar los pagos anteriores..." so if they paid everything, totalPending is 0.
content = content.replace(
`    return Object.values(data).filter(c => c.totalPending > 0);`,
`    return Object.values(data);`
);

// Add edit payment modal states
if (!content.includes('editPaymentModalOpen')) {
  content = content.replace(
    '  const [receiptData, setReceiptData] = useState<any>(null);',
    `  const [receiptData, setReceiptData] = useState<any>(null);
  
  const [clientTab, setClientTab] = useState<"pending" | "history">("pending");
  const [editPaymentModalOpen, setEditPaymentModalOpen] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<any>(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentComment, setEditPaymentComment] = useState("");`
  );
}

fs.writeFileSync('src/components/PhysicalCommerceCollections.tsx', content);
