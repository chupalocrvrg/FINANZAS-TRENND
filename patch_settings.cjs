const fs = require('fs');
const file = 'src/components/Settings.tsx';
let data = fs.readFileSync(file, 'utf8');

const colorSelectorCode = `
                        {settings?.uiStyle === 'liquid_glass' && (
                          <div className="mt-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Variante Liquid Glass</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { id: 'default', label: 'Pastel (Por Defecto)' },
                                { id: 'teal', label: 'Océano Teal' },
                                { id: 'purple', label: 'Amatista' },
                                { id: 'orange', label: 'Ámbar Cálido' }
                              ].map(color => (
                                <button
                                  key={color.id}
                                  type="button"
                                  onClick={() => updateSettings({ liquidGlassColor: color.id as any })}
                                  className={cn(
                                    "px-2 py-1.5 border rounded flex items-center justify-between text-[9px] font-bold uppercase tracking-wider transition-all",
                                    (settings?.liquidGlassColor || 'default') === color.id
                                      ? "bg-indigo-600 border-indigo-600 text-white"
                                      : isDark
                                      ? "bg-slate-800 border-slate-700 text-slate-400"
                                      : "bg-white border-slate-200 text-slate-600"
                                  )}
                                >
                                  {color.label}
                                  {(settings?.liquidGlassColor || 'default') === color.id && <Check className="w-3 h-3" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
`;

data = data.replace(/<\/div>\n                    <\/div>\n\n                  <\/div>/, colorSelectorCode);
fs.writeFileSync(file, data);
