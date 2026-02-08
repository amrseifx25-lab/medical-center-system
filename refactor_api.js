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
        if (content.includes('http://localhost:5000')) {
            // Add import at the top
            content = `import API_BASE_URL from '${file.r}';\n` + content;
            // Replace URLs
            // Use template literal for replacement: `http://localhost:5000` -> `${API_BASE_URL}`
            content = content.replace(/http:\/\/localhost:5000/g, '${API_BASE_URL}');

            // Note: Since we replaced with ${API_BASE_URL}, we need to ensure the surrounding strings are backticks.
            // This is complex. Let's instead just replace with a constant string if possible, or handle backticks.
            // Actually, most fetches are fetch('http://localhost:5000/...').
            // Let's replace 'http://localhost:5000' with API_BASE_URL + '
            content = content.replace(/'http:\/\/localhost:5000/g, 'API_BASE_URL + \'');
            content = content.replace(/"http:\/\/localhost:5000/g, 'API_BASE_URL + "');

            fs.writeFileSync(filePath, content);
            console.log(`Updated ${file.p}`);
        }
    } else {
        console.log(`File not found: ${file.p}`);
    }
});
