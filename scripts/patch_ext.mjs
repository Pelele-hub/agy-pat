import fs from 'fs';

const extDir = 'C:/Users/majji/AppData/Local/Google/Chrome/User Data/Default/Extensions/feldfgfggmlcnoihdjbcemjknoegocnm/1.3.4_0';
const bgPath = `${extDir}/assets/index.ts-DUSFifLU.js`;
const uiPath = `${extDir}/assets/index.html-BM9j4nA6.js`;

// Backup files if not already backed up
if (!fs.existsSync(`${bgPath}.bak`)) {
  fs.copyFileSync(bgPath, `${bgPath}.bak`);
}
if (!fs.existsSync(`${uiPath}.bak`)) {
  fs.copyFileSync(uiPath, `${uiPath}.bak`);
}

// 1. Patch Background Script (Service Worker)
let bgContent = fs.readFileSync(bgPath, 'utf8');

// Replace function Na(e, t)
bgContent = bgContent.replace(
  /function Na\(e,\s*t\)\{[^}]+\}/,
  'function Na(e,t){return "pro"}'
);

// Replace async function M()
bgContent = bgContent.replace(
  /async function M\(\)\{[^}]+\}/,
  'async function M(){return "pro"}'
);

// Replace function Ga(e, t, a, o)
bgContent = bgContent.replace(
  /function Ga\(e,\s*t,\s*a,\s*o\)\{[^}]+\}/,
  'function Ga(e,t,a,o){return false}'
);

// Replace function Va(e, t)
bgContent = bgContent.replace(
  /async function Va\(e,\s*t\)\{[\s\S]*?return Ga\([\s\S]*?\}\s*:\s*\{ok:!0\}\}/,
  'async function Va(e,t){return {ok:true}}'
);

// Replace Pt() to return unlimited limits
bgContent = bgContent.replace(
  /async function Pt\(\)\{[^}]+\}/,
  'async function Pt(){return {video:999999,image:999999}}'
);

// Replace ee() to return pro plan
bgContent = bgContent.replace(
  /async function ee\(\)\{[\s\S]*?planEndsAt:[\s\S]*?\}\}/,
  'async function ee(){const t=await At();return {plan:"pro",usage:t,limits:{video:999999,image:999999},email:"unlimited@pro.local",planEndsAt:Date.now()+315360000000}}'
);

fs.writeFileSync(bgPath, bgContent, 'utf8');
console.log('Background service worker patched successfully.');

// 2. Patch UI Script (Side Panel)
let uiContent = fs.readFileSync(uiPath, 'utf8');

// Replace plan check in Ot component: const s=e.plan==="pro" -> const s=true
uiContent = uiContent.replace(
  /const s=e\.plan==="pro"/g,
  'const s=true'
);

// Replace H=u?.plan==="pro" -> H=true
uiContent = uiContent.replace(
  /H=u\?\.plan==="pro"/g,
  'H=true'
);

// Replace F=!!u&&!H&&(u.usage.video>=u.limits.video||u.usage.image>=u.limits.image) -> F=false
uiContent = uiContent.replace(
  /F=!!u&&!H&&\([^)]+\)/g,
  'F=false'
);

fs.writeFileSync(uiPath, uiContent, 'utf8');
console.log('Sidepanel UI script patched successfully.');
