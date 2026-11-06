import { chromium } from 'playwright';
// API responses are intercepted; no database or real login is used.
// Run with the dev server active: node scripts/audit-remediation-check.mjs
const BASE=process.env.POCA_BASE_URL || "http://127.0.0.1:3108";
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
page.setDefaultTimeout(10000);
await page.addInitScript(()=>localStorage.setItem('poca_announcement_seen','1'));
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let fail=true;
const user={id:'u1',username:'Reviewer',email:'review@example.test',role:'admin',preferences:{},created_at:new Date().toISOString()};
await page.route('**/api/v1/**',async route=>{
 const p=new URL(route.request().url()).pathname;
 if(p.endsWith('/auth/login')||p.endsWith('/users/me'))return route.fulfill({json:user});
 if(p.includes('/admin/')&&fail)return route.fulfill({status:503,json:{detail:'Unavailable'}});
 let data={items:[],total:0,page:1,size:20};
 if(p.includes('/gamification/') || p.includes('/notifications') || p.includes('/ai/conversations'))data=[];
 if(p.endsWith('/admin/templates')||p.endsWith('/admin/categories')||p.endsWith('/categories')||p.includes('/sections'))data=[];
 if(p.endsWith('/admin/destinations'))data={items:[{id:'d1',name:'Test Beach',city:'Bali',slug:'test',is_active:true,images:[],tags:[]}],total:1};
 if(p==='/api/v1/destinations/d1')data={id:'d1',name:'Test Beach',slug:'test'};
 if(p.endsWith('/sections'))data=[{id:'s1',destination_id:'d1',section_type:'hero-gallery',order:0,visible:true,data:{}}];
 if(p.endsWith('/admin/dashboard'))data={weekly_views:[],top_destinations:[],recent_users:[]};
 return route.fulfill({json:data});
});
for(const path of ['/trips','/notifications','/chat','/profile','/profile/edit']){
 await page.goto(BASE+path);
 await page.getByRole('button',{name:'Masuk',exact:true}).waitFor();
 console.log('PASS guest empty state '+path);
}
await page.goto(BASE+'/admin/login');
await page.getByPlaceholder('Email admin').fill('review@example.test');await page.getByPlaceholder('Password',{exact:true}).fill('mock-only');await page.getByRole('button',{name:'Masuk Admin'}).click();
await page.getByRole('alert').filter({hasText:'Gagal memuat data'}).waitFor().catch(async e=>{console.log(await page.locator('body').innerText());throw e;});
for(const [label,path] of [['Dashboard','dashboard'],['Users','users'],['Kategori','categories'],['Templates','templates'],['Assets','assets'],['Destinasi','destinations'],['Traffic','traffic']]){
 fail=true;
 await page.getByRole('link',{name:label,exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Gagal memuat data'}).waitFor().catch(async e=>{console.log(await page.locator('body').innerText());throw e;});
 fail=false;await page.getByRole('button',{name:'Coba lagi'}).click();
 await page.getByRole('alert').filter({hasText:'Gagal memuat data'}).waitFor({state:'hidden'});
 console.log('PASS error + retry /admin/'+path);
}
await page.getByRole('link',{name:'Destinasi',exact:true}).click();
fail=true;await page.getByTitle('Sections',{exact:true}).click();
await page.getByRole('alert').filter({hasText:'Gagal memuat data'}).waitFor();
fail=false;await page.getByRole('button',{name:'Coba lagi'}).click();
await page.getByRole('button',{name:'Edit Data'}).click();
fail=true;await page.getByRole('button',{name:'Tambah Gambar'}).click();
await page.getByRole('alert').filter({hasText:'Gagal memuat data'}).waitFor();
fail=false;await page.getByRole('button',{name:'Coba lagi'}).click();
await page.getByRole('alert').filter({hasText:'Gagal memuat data'}).waitFor({state:'hidden'});
if(await page.evaluate(()=>document.body.style.overflow)!=='hidden')throw Error('Modal scroll lock missing');
await page.getByRole('heading',{name:'Pilih Gambar'}).waitFor();
console.log('PASS sections error/retry + editor + AssetPicker error/retry + modal scroll lock');
if(errors.length)throw Error(errors.join('\n'));
await browser.close();
