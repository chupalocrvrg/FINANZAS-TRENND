const fs = require('fs');
const file = 'src/App.tsx';
let data = fs.readFileSync(file, 'utf8');

const target = `<AnimatePresence>
        {isNotificationsOpen && (
          <div className="fixed bottom-20 lg:bottom-32 right-4 lg:left-1/2 lg:-translate-x-1/2 lg:right-auto z-50">`;

const replacement = `<AnimatePresence>
        {isNotificationsOpen && (
          <>
          <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsNotificationsOpen(false)} />
          <div className="fixed bottom-20 lg:bottom-32 right-4 lg:left-1/2 lg:-translate-x-1/2 lg:right-auto z-50 pointer-events-auto">`;

data = data.replace(target, replacement);

const endTarget = `          </div>
        )}
      </AnimatePresence>`;

const endReplacement = `          </div>
          </>
        )}
      </AnimatePresence>`;

data = data.replace(endTarget, endReplacement);
fs.writeFileSync(file, data);
