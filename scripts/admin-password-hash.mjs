#!/usr/bin/env node
// Makes the ADMIN_PASSWORD_HASH value for the super admin login.
// Asks for the password without showing it and prints only the hash, so it can be piped straight into Vercel:
//   node scripts/admin-password-hash.mjs | vercel env add ADMIN_PASSWORD_HASH production --sensitive
// The password itself is never stored anywhere.
import { scryptSync, randomBytes } from "node:crypto";
import { openSync, readSync, writeSync, closeSync } from "node:fs";
import { execSync } from "node:child_process";

function ask(prompt) {
  const tty = openSync("/dev/tty", "r+");
  writeSync(tty, prompt);
  try { execSync("stty -echo", { stdio: ["inherit", "ignore", "ignore"] }); } catch { /* not a terminal */ }
  let out = "";
  const buf = Buffer.alloc(1);
  while (readSync(tty, buf, 0, 1, null) === 1) {
    const ch = buf.toString();
    if (ch === "\n" || ch === "\r") break;
    out += ch;
  }
  try { execSync("stty echo", { stdio: ["inherit", "ignore", "ignore"] }); } catch { /* ignore */ }
  writeSync(tty, "\n");
  closeSync(tty);
  return out;
}

const a = ask("Admin password: ");
const b = ask("Repeat it: ");
if (!a || a !== b) { process.stderr.write("Passwords are empty or do not match.\n"); process.exit(1); }
if (a.length < 10) process.stderr.write("Note: a password of 10+ characters is much harder to guess.\n");
const N = 16384, r = 8, p = 1, salt = randomBytes(16);
const hash = scryptSync(a, salt, 32, { N, r, p, maxmem: 64 * 1024 * 1024 });
process.stdout.write(["scrypt", N, r, p, salt.toString("base64"), hash.toString("base64")].join(":"));
