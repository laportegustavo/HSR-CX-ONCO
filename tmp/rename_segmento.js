const fs = require('fs');
const filePath = '/Users/macbookprolaporte/Projeto HSR/src/app/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /PERDA DE SEGMENTO/g;
content = content.replace(regex, 'PERDA DE SEGUIMENTO');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced all occurrences in page.tsx');
