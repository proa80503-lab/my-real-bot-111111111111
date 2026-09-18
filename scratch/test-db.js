require('dotenv').config();
const dbInstance = require('../src/database/db-instance');
const db = require('../src/database/db');

async function test() {
    try {
        console.log('1. Connecting to MongoDB...');
        await dbInstance.connectDb();
        
        console.log('2. Loading data into memory...');
        await db.loadDatabase();
        
        console.log('3. Fetching dummy user (12345)...');
        const user = db.getUserData('12345');
        console.log('User:', user);
        
        console.log('4. Updating user balance...');
        db.addMoney('12345', 500);
        
        console.log('5. Fetching user again...');
        const updatedUser = db.getUserData('12345');
        console.log('Updated Balance:', updatedUser.balance);
        
        console.log('✅ TEST PASSED!');
        process.exit(0);
    } catch (e) {
        console.error('❌ TEST FAILED:', e);
        process.exit(1);
    }
}

test();
