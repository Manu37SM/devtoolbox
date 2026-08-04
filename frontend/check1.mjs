import { analyzePassword } from "./src/modules/tools/security/password-strength-analyzer/transform.ts";

function assert(cond, msg) { if (!cond) { console.error("FAIL:", msg); process.exitCode = 1; } else console.log("ok:", msg); }

let r = analyzePassword("");
assert(r.score === 0 && r.label === "Very Weak" && r.entropyBits === 0, "empty password");

r = analyzePassword("password");
assert(r.score === 0, "common password score=0, got " + r.score);
assert(r.feedback.some(f => /common/i.test(f)), "common feedback");

r = analyzePassword("Password123");
assert(r.feedback.some(f => /common/i.test(f)), "Password123 flagged common");

r = analyzePassword("abcd1234");
assert(r.feedback.some(f => /sequential|repeated/i.test(f)), "sequential flagged");

r = analyzePassword("aaaaaaaa");
assert(r.feedback.some(f => /sequential|repeated/i.test(f)), "repeated flagged");
assert(r.score <= 1, "repeated score <=1, got " + r.score);

r = analyzePassword("abc");
assert(r.score <= 1, "short score <=1, got " + r.score);

r = analyzePassword("xQ7!vR2#pL9$zT4@wK1&");
console.log("strong pw score", r.score, r.label, r.entropyBits, r.feedback);
assert(r.score >= 3, "strong password score>=3, got " + r.score);

let lowerOnly = analyzePassword("abcdefghij");
let mixed = analyzePassword("Abcdefg1!j");
assert(mixed.score >= lowerOnly.score, "diversity increases score: " + mixed.score + " vs " + lowerOnly.score);

r = analyzePassword("alllowercase");
assert(r.feedback.some(f=>/uppercase/i.test(f)) && r.feedback.some(f=>/number/i.test(f)) && r.feedback.some(f=>/symbol/i.test(f)), "missing class feedback");

r = analyzePassword("xQ7!vR2#pL9$zT4@wK1&");
assert(r.feedback.includes("Great password!"), "great password feedback, got " + JSON.stringify(r.feedback));
