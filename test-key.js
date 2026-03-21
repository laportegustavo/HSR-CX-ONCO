const fs = require('fs');
const json = JSON.parse(fs.readFileSync('/Users/macbookprolaporte/Downloads/cx-onco-hsr-c1f4e26881a3.json', 'utf8'));
const rawKey = json.private_key;

const base64Body = rawKey.replace(/-----.*?-----/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
const lines = base64Body.match(/.{1,64}/g).join('\n');
const reconstructed = `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;

console.log("Original Length:", rawKey.length);
console.log("Reconstructed Length:", reconstructed.length);
console.log("Are they EXACTLY equal?", rawKey === reconstructed);

// Now simulate user pasting with literal \n
const messedUp = "\\nMIIEvQIBADANBgkqhkiG9w0" + rawKey.slice(35).replace(/\n/g, '\\n') + "END";
const base64Body2 = messedUp.replace(/-----.*?-----/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
const lines2 = base64Body2.match(/.{1,64}/g).join('\n');
const reconstructed2 = `-----BEGIN PRIVATE KEY-----\n${lines2}\n-----END PRIVATE KEY-----\n`;
console.log("Reconstructed 2 equal to original?", reconstructed2 === rawKey);

