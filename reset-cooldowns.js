// سكريبت بسيط لحذف lastWeekly من كل المستخدمين
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

// حذف lastWeekly و lastWork و lastRob من كل المستخدمين
Object.keys(db.users).forEach(userId => {
    delete db.users[userId].lastWeekly;
    delete db.users[userId].lastWork;
    delete db.users[userId].lastRob;
    delete db.users[userId].lastDaily; // حذف lastDaily أيضاً
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 4));
console.log('✅ تم تصفير أوقات الكولداون لجميع المستخدمين!');
console.log('الآن يمكنك استخدام: يومي، راتب، عمل، سرقة');
