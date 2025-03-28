// Create a new file called generate-hash.js in your project root
const bcrypt = require('bcryptjs');

const password = 'admin';
bcrypt.hash(password, 12).then(hash => {
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
});