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

        // 1. Remove any previous broken imports or mentions
        content = content.replace(/import API_BASE_URL from '.*';\n/g, '');

        // 2. Add the clean import
        content = `import API_BASE_URL from '${file.r}';\n` + content;

        // 3. Clean up any existing broken paths (the ones starting with /api/ but meant to have API_BASE_URL)
        // Note: We need to be careful not to replace legitimate absolute paths if any.
        // In this project, all our backend calls started with http://localhost:5000/api

        // Replace '/api/ with API_BASE_URL + '/api/
        // Only if it's inside a fetch call or something similar
        content = content.replace(/fetch\('\/api\//g, "fetch(API_BASE_URL + '/api/");
        content = content.replace(/fetch\("\/api\//g, 'fetch(API_BASE_URL + "/api/');

        // Handle axios if used (optional but good practice)
        content = content.replace(/axios\.(get|post|put|delete)\('\/api\//g, "axios.$1(API_BASE_URL + '/api/");
        content = content.replace(/axios\.(get|post|put|delete)\("\/api\//g, 'axios.$1(API_BASE_URL + "/api/');

        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file.p}`);
    }
});
