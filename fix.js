const fs = require('fs');
let html = fs.readFileSync('web/store.html', 'utf8');
html = html.split('\\`').join('`').split('\\$').join('$');
fs.writeFileSync('web/store.html', html);
console.log('Fixed store.html');

if (fs.existsSync('web/auction.html')) {
    let ahtml = fs.readFileSync('web/auction.html', 'utf8');
    ahtml = ahtml.split('\\`').join('`').split('\\$').join('$');
    fs.writeFileSync('web/auction.html', ahtml);
    console.log('Fixed auction.html');
}
