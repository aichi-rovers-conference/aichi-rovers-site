// scripts/hash.ts
import bcrypt from "bcryptjs";
const pwd = process.argv[2];
if (!pwd) { console.error("Usage: npx tsx scripts/hash.ts <password>"); process.exit(1); }
const run = async () => console.log(await bcrypt.hash(pwd, 10));
run();
