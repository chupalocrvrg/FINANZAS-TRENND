import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

export function FixDb({ user }: { user: any }) {
  const [status, setStatus] = useState('Idle');

  useEffect(() => {
    if (!user) return;
    const fix = async () => {
      try {
        setStatus('Fetching ledger...');
        
        // Get all ledgers
        const ledSnap = await getDocs(query(collection(db, 'ledger'), where('ownerId', '==', user.uid)));
        const ledgers = ledSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        
        let fixedLedgers = 0;

        for (const l of ledgers) {
          if (!l.type || l.type === 'business') {
             const type = l.amount > 0 ? 'income' : 'expense';
             await updateDoc(doc(db, 'ledger', l.id), {
                 type: type
             });
             fixedLedgers++;
          }
        }
        
        setStatus(`Fixed ${fixedLedgers} ledger entries.`);
      } catch (e: any) {
        setStatus(`Error: ${e.message}`);
      }
    };
    fix();
  }, [user]);

  return <div style={{position: 'fixed', bottom: 10, left: 10, background: 'black', color: 'lime', padding: 10, zIndex: 99999, borderRadius: 8}}>{status}</div>;
}
