const http = require('http');

const data = JSON.stringify({
    month: 2,
    year: 2026
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/hr/payroll/calculate',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);

    let body = '';

    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('BODY: ' + body);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

// Write data to request body
req.write(data);
req.end();
