const fs = require('fs');
let data = fs.readFileSync('src/components/DigitalServices.tsx', 'utf8');

// Revert my mess
data = data.replace(/\{formData\.serviceType !== 'matriz' && \(\<div/g, '<div');
// I added some `)}` earlier? Let's check where:
// For categoria: I did add `)}` after `</select> </div>`
data = data.replace(/<\/select>\n\s*<\/div>\)\}\n\s*<\/div>\n\s*\{\/\* Tipo de Cliente y Selección desde CRM \*\/\}/, 
`</select>\n                  </div>\n                </div>\n                {/* Tipo de Cliente y Selección desde CRM */}`);

// For Perfil (Pantalla):
data = data.replace(/placeholder="0000"\n\s*\/>\n\s*<\/div>\)\}\n\s*<\/div>/g,
`placeholder="0000"\n                      />\n                    </div>\n                  </div>`);

// For Estado Inicial:
data = data.replace(/<option value="expired">Expirado<\/option>\n\s*<\/select>\n\s*<\/div>\)\}\n\s*<\/div>/g,
`<option value="expired">Expirado</option>\n                    </select>\n                  </div>\n                </div>`);

// For Precio Venta:
data = data.replace(/placeholder="Ej: 3\.50"\n\s*\/>\n\s*<\/div>\)\}\n\s*<\/div>/g,
`placeholder="Ej: 3.50"\n                    />\n                  </div>\n                </div>`);

// For Flujo de Cobro:
data = data.replace(/<\/div>\)\}\n\n\s*\{\/\* 4\. Pagos y Cobranzas - Inversión \*\/\}/,
`</div>\n\n                {/* 4. Pagos y Cobranzas - Inversión */}`);

fs.writeFileSync('src/components/DigitalServices.tsx', data);
