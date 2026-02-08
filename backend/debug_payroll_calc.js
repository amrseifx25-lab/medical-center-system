const axios = require('axios');

async function testCalculate() {
    try {
        console.log('Testing Calculate Payroll for 2/2026...');
        const res = await axios.post('http://localhost:5000/api/hr/payroll/calculate', {
            month: 2,
            year: 2026
        });
        console.log('Status:', res.status);
        console.log('Data:', res.data);
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Response Data:', err.response.data);
            console.error('Response Status:', err.response.status);
        }
    }
}

testCalculate();
