const fs = require('fs');
const file = 'src/App.tsx';
let data = fs.readFileSync(file, 'utf8');

if (!data.includes('setIsNotificationsOpen(false);\n  }, [activeTab]);')) {
  const activeTabEffect = `  useEffect(() => {
    const disabledFeatures = settings?.disabledFeatures || [];
    if (disabledFeatures.includes(activeTab)) {
      setActiveTab('dashboard');
    }
    // Close notifications when navigating via dock/tabs
    setIsNotificationsOpen(false);
  }, [settings?.disabledFeatures, activeTab]);`;

  data = data.replace(/  useEffect\(\(\) => \{\n    const disabledFeatures = settings\?\.disabledFeatures \|\| \[\];\n    if \(disabledFeatures\.includes\(activeTab\)\) \{\n      setActiveTab\('dashboard'\);\n    \}\n  \}, \[settings\?\.disabledFeatures, activeTab\]\);/, activeTabEffect);
  fs.writeFileSync(file, data);
}
