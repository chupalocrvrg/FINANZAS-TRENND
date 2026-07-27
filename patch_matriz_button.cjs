const fs = require('fs');
const file = 'src/components/DigitalServices.tsx';
let data = fs.readFileSync(file, 'utf8');

// 1. Modify resetForm to accept isMatriz
data = data.replace(
  'const resetForm = () => {',
  'const resetForm = (isMatriz = false) => {'
);
data = data.replace(
  'serviceType: \'completa\',',
  'serviceType: isMatriz ? \'matriz\' : \'completa\','
);

// 2. Add button "Registrar Cuenta Madre" next to "Vender Cuenta"
const buttonsOld = `          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none bg-indigo-600 text-white px-6 py-2.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-500/10 active:scale-95 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Vender Cuenta
          </button>`;

const buttonsNew = `          <button 
            onClick={() => { resetForm(true); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none bg-fuchsia-600 text-white px-4 py-2.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-fuchsia-700 transition-all font-bold shadow-lg shadow-fuchsia-500/10 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="text-[10px] sm:text-xs">Registrar Cuenta Madre</span>
          </button>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex-1 sm:flex-none bg-indigo-600 text-white px-4 sm:px-6 py-2.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-500/10 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] sm:text-xs">Vender Cuenta</span>
          </button>`;

data = data.replace(buttonsOld, buttonsNew);

// 3. Filter catalog items if formData.serviceType === 'matriz'
const dataListOld = `                    <datalist id="catalog-items-datalist">
                      {catalogItems.filter(c => c.type === 'digital_service' && c.status === 'active').map(c => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>`;
const dataListNew = `                    <datalist id="catalog-items-datalist">
                      {catalogItems
                        .filter(c => c.type === 'digital_service' && c.status === 'active')
                        .filter(c => formData.serviceType === 'matriz' ? (c.name.toLowerCase().includes('complet') || (c.maxScreens && c.maxScreens > 0)) : true)
                        .map(c => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>`;
data = data.replace(dataListOld, dataListNew);

// 4. Change completeAccounts filter to ONLY show matriz
const completeAccountsOld = `                  const completeAccounts = services.filter(s => {
                    const catItem = catalogItems.find(c => c.name.toLowerCase() === s.name.toLowerCase());
                    const isLegacyMatriz = (s as any).serviceType !== 'pantalla' && (s as any).serviceType !== 'profile' && (s as any).serviceType !== 'matriz' && catItem && (catItem.name.toLowerCase().includes('complet') || (catItem.maxScreens && catItem.maxScreens > 0));
                    return s.status === 'active' && ((s as any).serviceType === 'matriz' || isLegacyMatriz) && catItem && (catItem.maxScreens && catItem.maxScreens > 0);
                  });`;

const completeAccountsNew = `                  const completeAccounts = services.filter(s => {
                    const catItem = catalogItems.find(c => c.name.toLowerCase() === s.name.toLowerCase());
                    return s.status === 'active' && (s as any).serviceType === 'matriz' && catItem && (catItem.maxScreens && catItem.maxScreens > 0);
                  });`;
data = data.replace(completeAccountsOld, completeAccountsNew);


// 5. Update modal title
const modalTitleOld = `{formData.id ? 'Modificar Suscripción' : 'Registrar Venta / Cuenta'}`;
const modalTitleNew = `{formData.id ? 'Modificar Suscripción' : formData.serviceType === 'matriz' ? 'Registrar Cuenta Madre' : 'Registrar Venta / Cuenta'}`;
data = data.replace(modalTitleOld, modalTitleNew);


fs.writeFileSync(file, data);
