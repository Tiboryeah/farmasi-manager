
const bcrypt = require('bcryptjs');

async function gen() {
    const p = "farmasi2026";
    const h = await bcrypt.hash(p, 10);
    const ver = await bcrypt.compare(p, h);
    console.log("PASS:", p);
    console.log("HASH_VERIFIED:", h);
    console.log("IS_CORRECT:", ver);
}

gen();
