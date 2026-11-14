import fs from 'fs';

const extDir = 'C:/Users/majji/AppData/Local/Google/Chrome/User Data/Default/Extensions/feldfgfggmlcnoihdjbcemjknoegocnm/1.3.4_0';
const bgPath = `${extDir}/assets/index.ts-DUSFifLU.js`;
const uiPath = `${extDir}/assets/index.html-BM9j4nA6.js`;

let bgContent = fs.readFileSync(bgPath, 'utf8');
let uiContent = fs.readFileSync(uiPath, 'utf8');

console.log('--- BACKGROUND SCRIPT CHECKS ---');
console.log('M patched:', bgContent.includes('async function M(){return "pro"}'));
console.log('Na patched:', bgContent.includes('function Na(e,t){return "pro"}'));
console.log('Ga patched:', bgContent.includes('function Ga(e,t,a,o){return false}'));
console.log('Va patched:', bgContent.includes('async function Va(e,t){return {ok:true}}'));
console.log('Pt patched:', bgContent.includes('async function Pt(){return {video:999999,image:999999}}'));
console.log('ee patched:', bgContent.includes('async function ee(){const t=await At();return {plan:"pro"'));

console.log('--- UI SCRIPT CHECKS ---');
console.log('s=true:', uiContent.includes('const s=true'));
console.log('H=true:', uiContent.includes('H=true'));
console.log('F=false:', uiContent.includes('F=false'));
