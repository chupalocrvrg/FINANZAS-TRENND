const fs = require('fs');
const file = 'src/components/DigitalServices.tsx';
let data = fs.readFileSync(file, 'utf8');

// 1. Add Matriz option in the form (around line 2170-2195)
const accessOptionsOld = `                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, serviceType: 'completa' }))}
                        className={cn("py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5",
                          formData.serviceType === 'completa'
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : (isDark ? "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900")
                        )}
                      >
                        👤 Cuenta Completa
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, serviceType: 'pantalla' }))}
                        className={cn("py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5",
                          formData.serviceType === 'pantalla'
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : (isDark ? "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900")
                        )}
                      >
                        📺 Pantalla / Dispositivo
                      </button>
                    </div>
                    <p className="text-[9.5px] text-slate-500 italic font-medium">
                      {formData.serviceType === 'completa' 
                        ? '• El cliente compra la cuenta completa (los accesos son personales y únicos).' 
                        : '• El cliente compra un perfil individual. Se requiere especificar Perfil y PIN de Acceso.'
                      }
                    </p>`;

const accessOptionsNew = `                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, serviceType: 'matriz' }))}
                        className={cn("py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5",
                          formData.serviceType === 'matriz'
                            ? "bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm"
                            : (isDark ? "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900")
                        )}
                      >
                        🏢 Matriz
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, serviceType: 'completa' }))}
                        className={cn("py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5",
                          formData.serviceType === 'completa'
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : (isDark ? "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900")
                        )}
                      >
                        👤 Cliente
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, serviceType: 'pantalla' }))}
                        className={cn("py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5",
                          formData.serviceType === 'pantalla'
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : (isDark ? "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900")
                        )}
                      >
                        📺 Pantalla
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-500 italic font-medium leading-tight">
                      {formData.serviceType === 'matriz' ? '• Inventario: Cuenta para revender perfiles (No va a clientes).' : formData.serviceType === 'completa' ? '• Cuenta Completa: Se vende toda la cuenta a un cliente.' : '• Pantalla: Se vende un perfil individual.'}
                    </p>`;
data = data.replace(accessOptionsOld, accessOptionsNew);

// 2. Render badge in UI
const badgeOld = `                            (service as any).serviceType === 'pantalla' ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          )}>
                            {(service as any).serviceType === 'pantalla' ? '📺 Pantalla' : '👤 Completa'}
                          </span>`;
const badgeNew = `                            (service as any).serviceType === 'matriz' ? "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20" :
                            (service as any).serviceType === 'profile' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                            (service as any).serviceType === 'pantalla' ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : 
                            "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          )}>
                            {(service as any).serviceType === 'matriz' ? '🏢 Matriz' : (service as any).serviceType === 'profile' ? '👤 Perfil' : (service as any).serviceType === 'pantalla' ? '📺 Pantalla' : '👤 Completa'}
                          </span>`;
data = data.replace(badgeOld, badgeNew);

// 3. Fix "Vender Perfil" filter
const filterOld = `                  const completeAccounts = services.filter(s => {
                    const catItem = catalogItems.find(c => c.name.toLowerCase() === s.name.toLowerCase());
                    return s.status === 'active' && catItem && (catItem.name.toLowerCase().includes('completo') || catItem.name.toLowerCase().includes('completa') || (catItem.maxScreens && catItem.maxScreens > 0));
                  });`;
const filterNew = `                  const completeAccounts = services.filter(s => {
                    const catItem = catalogItems.find(c => c.name.toLowerCase() === s.name.toLowerCase());
                    const isLegacyMatriz = s.serviceType !== 'pantalla' && s.serviceType !== 'profile' && s.serviceType !== 'matriz' && catItem && (catItem.name.toLowerCase().includes('complet') || (catItem.maxScreens && catItem.maxScreens > 0));
                    return s.status === 'active' && ((s as any).serviceType === 'matriz' || isLegacyMatriz) && catItem && (catItem.maxScreens && catItem.maxScreens > 0);
                  });`;
data = data.replace(filterOld, filterNew);

// 4. Update the name when selling a profile
const nameProfileOld = `                                name: account.name,`;
const nameProfileNew = `                                name: account.name.replace(/complet[ao]/i, 'Perfil').trim(),`;
data = data.replace(nameProfileOld, nameProfileNew);

fs.writeFileSync(file, data);
console.log("Matriz fixed");
