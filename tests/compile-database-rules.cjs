// Run against a locally started official Realtime Database emulator only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),endpoint='http://127.0.0.1:19000/.settings/rules.json?ns=demo-advanced-rules';
async function compile(body){const response=await fetch(endpoint,{method:'PUT',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body});return {status:response.status,body:await response.text()};}
(async()=>{
 const original=cp.execFileSync('git',['show','cf4e9db53b8799d8bac6cad599280940a716eef4:firebase-database.rules.json'],{cwd:root,encoding:'utf8'});
 const before=await compile(original);assert.equal(before.status,400);assert.match(before.body,/Cannot have multiple default rules/);console.log('Reproduced original Firebase compiler error: '+before.body);
 const after=await compile(fs.readFileSync(path.join(root,'firebase-database.rules.json'),'utf8'));
 assert.equal(after.status,200,after.body);console.log('PASS: corrected complete rules accepted by official RTDB emulator compiler (HTTP 200)');
})().catch(error=>{console.error(error);process.exitCode=1;});
