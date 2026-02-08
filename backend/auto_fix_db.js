const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const commonPasswords = [
    'root',
    'postgres',
    'admin',
    '123456',
    '1234',
    'password',
    'secret',
    '' // empty password
];

const checkPassword = async (password) => {
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'postgres', // connect to default db first
        password: password,
        port: 5432,
    });

    try {
        await pool.query('SELECT 1');
        await pool.end();
        return true;
    } catch (err) {
        await pool.end();
        return false; // Auth failed
    }
};

const run = async () => {
    console.log('🔍 Detecting your database password...');

    for (const pass of commonPasswords) {
        process.stdout.write(`   Testing password: "${pass}" ... `);
        const isValid = await checkPassword(pass);

        if (isValid) {
            console.log('✅ FOUND!');

            // Update .env file
            const envPath = path.join(__dirname, '.env');
            let envContent = fs.readFileSync(envPath, 'utf8');

            // Regex to replace DB_PASSWORD
            envContent = envContent.replace(/DB_PASSWORD=.*/g, `DB_PASSWORD=${pass}`);

            fs.writeFileSync(envPath, envContent);
            console.log(`✅ Updated .env with correct password.`);
            console.log(`\n🎉 Database Connected! You can now run fill_data.bat again.`);
            process.exit(0);
        } else {
            console.log('❌ Failed');
        }
    }

    console.log('\n❌ Could not find your password automatically.');
    console.log('   Please open backend/.env file and set DB_PASSWORD manually.');
    process.exit(1);
};

run();
