
const bcrypt = require('bcryptjs');

async function test() {
    const pass = "farmasi2026";
    const hash = "$2b$10$yXKjO.Q6xhh4qrFu9qx4c4GWbgeVdCZH9IDi8z6vup/whFxq";
    const match = await bcrypt.compare(pass, hash);
    console.log("MATCH:", match);
}

test();
