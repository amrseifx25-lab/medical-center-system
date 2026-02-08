const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/src');
const files = [
    { p: 'pages/Accounting.jsx', r: '../api' },
    { p: 'pages/CashReport.jsx', r: '../api' },
    { p: 'pages/Clinic.jsx', r: '../api' },
    { p: 'pages/Closing.jsx', r: '../api' },
    { p: 'pages/Coupons.jsx', r: '../api' },
    { p: 'pages/Dashboard.jsx', r: '../api' },
    { p: 'pages/FinanceDashboard.jsx', r: '../api' },
    { p: 'pages/HR.jsx', r: '../api' },
    { p: 'pages/Invoices.jsx', r: '../api' },
    { p: 'pages/Laboratory.jsx', r: '../api' },
    { p: 'pages/PatientDetails.jsx', r: '../api' },
    { p: 'pages/Patients.jsx', r: '../api' },
    { p: 'pages/Radiology.jsx', r: '../api' },
    { p: 'pages/Services.jsx', r: '../api' },
    { p: 'pages/Settings/UserManagement.jsx', r: '../../api' },
    { p: 'context/AuthContext.jsx', r: '../api' }
];

files.forEach(file => {
    const filePath = path.join(srcDir, file.p);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Clean up the previous mess first
        content = content.replace(/\$\{API_BASE_URL\}/g, 'http://localhost:5000');
        content = content.replace(/API_BASE_URL \+ '/g, "'http://localhost:5000");
        content = content.replace(/API_BASE_URL \+ "/g, '"http://localhost:5000');

        // Now do a clean replacement
        // Rule: replace 'http://localhost:5000 or "http://localhost:5000 with backticks and ${API_BASE_URL}
        content = content.replace(/'http:\/\/localhost:5000/g, '`${API_BASE_URL}');
        content = content.replace(/"http:\/\/localhost:5000/g, '`${API_BASE_URL}');

        // Fix the closing part. If it was 'http://localhost:5000/api/...' it is now `http://localhost:5000/api/...'
        // We need to change the closing ' or " to `
        // Actually, this is hard because we don't know where the string ends.

        // Alternative: concatenate. 
        // fetch('http://localhost:5000/api/...') -> fetch(API_BASE_URL + '/api/...')
        content = content.replace(/`\$\{API_BASE_URL\}/g, "API_BASE_URL + '"); // Reset

        // Lets do it one more time cleanly.
        content = fs.readFileSync(filePath, 'utf8'); // Reload
        // Remove existing import if any (to avoid duplicates)
        content = content.replace(/import API_BASE_URL from '.*';\n/g, '');

        // Add single import
        content = `import API_BASE_URL from '${file.r}';\n` + content;

        // Replacement: 'http://localhost:5000/...' -> `${API_BASE_URL}/...`
        // We look for fetch('http://localhost:5000... or axios.get("http://localhost:5000...
        // Basically any occurrence in quotes.

        // Replace 'http://localhost:5000' with API_BASE_URL + '
        content = content.replace(/'http:\/\/localhost:5000/g, "API_BASE_URL + '");
        content = content.replace(/"http:\/\/localhost:5000/g, 'API_BASE_URL + "');

        // Clean up the ${API_BASE_URL} if it was accidentally injected
        content = content.replace(/\$\{API_BASE_URL\}/g, '');
        // Note: the line 37 in previous view was: const res = await fetch('${API_BASE_URL}/api/hr/employees');
        // Now it will be: const res = await fetch('API_BASE_URL + /api/hr/employees');
        // Still wrong.

        // OK, manual correction for the common pattern:
        content = content.replace(/fetch\('\$\{API_BASE_URL\}/g, "fetch(API_BASE_URL + '");
        content = content.replace(/fetch\("\$\{API_BASE_URL\}/g, 'fetch(API_BASE_URL + "');

        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file.p}`);
    }
});
