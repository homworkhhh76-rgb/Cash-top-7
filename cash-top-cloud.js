(() => {
  'use strict';

  /*
   * Direct Turso build — no Worker, Vercel, Firebase, or intermediary server.
   * Credentials are intentionally embedded because this static build is designed
   * to connect to Turso straight from the browser, matching the supplied CashTop file.
   */
  const TURSO_CONFIG = Object.freeze({
    databaseUrl: 'libsql://cash-top-homworkhhh76-rgb.aws-eu-west-1.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODUwODYwNTIsImlkIjoiMDE5ZjlmNjYtOTQwMS03MmEwLTkyNzItYjVhZjA2ODczZmIyIiwia2lkIjoicVgzS01DZ0pwQnp3eGo1Tzl2SHhaWUJGem9sTWFsa24tTU5JOTRlMTl6YyIsInJpZCI6ImQxZmE2MjhjLThiYTMtNDJhNS04MzhmLTc1MGJhNGQwYWE1YiJ9.Dl9BkY70zPZCzGnf_MHg2A7GtWsnd6BRGQoUyEeEPIz3BWbkDj70xD-B7x5U5VG8aBoiljNtCpg0OHJCjnuoAA',
    mode: 'direct-browser-v6'
  });
  const APP_PATH = 'general_sales_multi_v6';
  const KV_TABLE = 'general_sales_kv_v6';
  const SCHEMA_MARKER = 'general_sales_turso_schema_v6';
  const SESSION_MS = 30 * 86400000;
  const ADMIN_SESSION_MS = 12 * 3600000;
  const DEFAULT_ADMIN_PASSWORD = '78789852';
  const LOCAL_ADMIN_PASSWORD_KEY = 'general-sales-local-admin-password-v7';
  const LOCAL_ADMIN_SESSION_KEY = 'general-sales-local-admin-session-v7';
  const DATASETS = new Set(['products','suppliers','purchases','sales','payments','debtors','creditors','expenses','fx']);
  let schemaPromise = null;

  class CloudError extends Error {
    constructor(status, code, message) { super(message); this.status = status; this.code = code; }
  }

  const n = v => Number(v || 0);
  const clamp = (v,min,max) => Math.max(min, Math.min(max, Number(v) || min));
  const safeKey = v => String(v ?? '').trim().replace(/[.#$\[\]/]/g, '_').replace(/^_+|_+$/g,'_') || '_';
  const normUser = v => String(v ?? '').trim().toLowerCase();
  const normText = v => String(v ?? '').trim().toLowerCase();
  const uid = prefix => `${prefix}_${Date.now().toString(36)}_${randomHex(7)}`;
  const defaultSettings = name => ({companyName:name||'',phone:'',whatsapp:'',email:'',website:'',address:'',taxNumber:'',commercialRegistration:'',currency:'₪',logoUrl:'',notes:''});

  function randomHex(len=24){
    try{const a=new Uint8Array(Math.ceil(len/2));crypto.getRandomValues(a);return [...a].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,len);}catch{return Array.from({length:len},()=>Math.floor(Math.random()*16).toString(16)).join('');}
  }
  function fallbackHash(str){
    const seeds=[0x811c9dc5,0x9e3779b1,0x85ebca6b,0xc2b2ae35,0x27d4eb2f,0x165667b1,0xd3a2646c,0xfd7046c5];
    return seeds.map(seed=>{let h=seed>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193);h^=h>>>13;h=Math.imul(h,0x5bd1e995);}return (h>>>0).toString(16).padStart(8,'0');}).join('');
  }
  async function sha256(value){
    const text=String(value??'');
    try{if(globalThis.crypto?.subtle){const b=new TextEncoder().encode(text),d=await crypto.subtle.digest('SHA-256',b);return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');}}catch{}
    return fallbackHash(text);
  }
  async function makePassword(password){const salt=randomHex(24);return {salt,hash:await sha256(`${salt}|${String(password)}|general-sales-v5`)};}
  async function verifyPassword(password,rec){return !!rec?.salt && !!rec?.hash && (await sha256(`${rec.salt}|${String(password)}|general-sales-v5`))===rec.hash;}

  function tursoEndpoint(){return TURSO_CONFIG.databaseUrl.replace(/^libsql:\/\//i,'https://').replace(/\/+$/,'')+'/v2/pipeline';}
  function tursoArg(v){
    if(v===null||v===undefined)return {type:'null'};
    if(typeof v==='number')return Number.isInteger(v)?{type:'integer',value:String(v)}:{type:'float',value:String(v)};
    if(typeof v==='boolean')return {type:'integer',value:v?'1':'0'};
    return {type:'text',value:String(v)};
  }
  function stmt(sql,args=[]){return {type:'execute',stmt:{sql,args:args.map(tursoArg)}};}
  function rowsOf(result){
    const cols=(result?.cols||[]).map(c=>c.name);
    return (result?.rows||[]).map(row=>{const o={};row.forEach((cell,i)=>{let v=cell?.value??null;if(cell?.type==='integer'||cell?.type==='float')v=Number(v);o[cols[i]]=v;});return o;});
  }
  async function pipeline(statements){
    if(!navigator.onLine)throw new CloudError(0,'NETWORK_ERROR','لا يوجد اتصال بالإنترنت. البيانات المحلية ستبقى محفوظة حتى عودة الاتصال.');
    let res;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = setTimeout(()=>{ try{controller?.abort();}catch{} },15000);
    try{
      res=await fetch(tursoEndpoint(),{method:'POST',headers:{Authorization:'Bearer '+TURSO_CONFIG.authToken,'Content-Type':'application/json'},body:JSON.stringify({requests:[...statements,{type:'close'}]}),cache:'no-store',...(controller?{signal:controller.signal}:{})});
    }catch(e){
      const timedOut = e?.name === 'AbortError';
      throw new CloudError(0,timedOut?'NETWORK_TIMEOUT':'NETWORK_ERROR',timedOut?'انتهت مهلة الاتصال. أعد المحاولة.':'تعذر الاتصال بقاعدة البيانات. تحقق من الإنترنت ثم أعد المحاولة.');
    }finally{clearTimeout(timeout);}
    const text=await res.text();let data=null;try{data=JSON.parse(text)}catch{}
    if(!res.ok||!data)throw new CloudError(res.status||502,'TURSO_HTTP',`Turso رفض الاتصال (${res.status||'NETWORK'})${text?': '+String(text).slice(0,220):''}`);
    const results=data.results||[];
    for(let i=0;i<statements.length;i++){const r=results[i];if(r?.type!=='ok')throw new CloudError(500,'TURSO_SQL',r?.error?.message||'خطأ في قاعدة Turso');}
    return results.slice(0,statements.length).map(x=>x.response?.result||{});
  }
  async function ensureSchema(){
    try{if(localStorage.getItem(SCHEMA_MARKER)==='1')return true;}catch{}
    if(schemaPromise)return schemaPromise;
    schemaPromise=(async()=>{
      await pipeline([
        stmt(`CREATE TABLE IF NOT EXISTS ${KV_TABLE} (path TEXT PRIMARY KEY,parent_path TEXT NOT NULL,item_key TEXT NOT NULL,payload_json TEXT NOT NULL,updated_at INTEGER NOT NULL)`),
        stmt(`CREATE INDEX IF NOT EXISTS gs_v6_parent ON ${KV_TABLE}(parent_path,item_key)`),
        stmt(`CREATE INDEX IF NOT EXISTS gs_v6_parent_sort ON ${KV_TABLE}(parent_path,json_extract(payload_json,'$.sortKey'))`),
        stmt(`CREATE INDEX IF NOT EXISTS gs_v6_parent_updated ON ${KV_TABLE}(parent_path,CAST(json_extract(payload_json,'$.updatedAt') AS INTEGER))`),
        stmt(`CREATE INDEX IF NOT EXISTS gs_v6_record_date ON ${KV_TABLE}(parent_path,json_extract(payload_json,'$.record.date'))`),
        stmt(`CREATE INDEX IF NOT EXISTS gs_v6_record_code ON ${KV_TABLE}(parent_path,json_extract(payload_json,'$.record.code'))`),
        stmt(`CREATE INDEX IF NOT EXISTS gs_v6_product_code ON ${KV_TABLE}(parent_path,json_extract(payload_json,'$.record.productCode'))`),
        stmt(`CREATE INDEX IF NOT EXISTS gs_v6_supplier_code ON ${KV_TABLE}(parent_path,json_extract(payload_json,'$.record.supplierCode'))`)
      ]);
      try{localStorage.setItem(SCHEMA_MARKER,'1')}catch{}
      return true;
    })().catch(e=>{schemaPromise=null;throw e;});
    return schemaPromise;
  }
  function normalizePath(path){return String(path||'').replace(/^\/+|\/+$/g,'').replace(/\/{2,}/g,'/');}
  function splitPath(path){const p=normalizePath(path),i=p.lastIndexOf('/');return {path:p,parent:i>=0?p.slice(0,i):'',key:i>=0?p.slice(i+1):p};}
  function parsePayload(raw){try{return JSON.parse(raw)}catch{return null}}
  function setNested(root,parts,value){let cur=root;for(let i=0;i<parts.length-1;i++){const k=parts[i];if(!cur[k]||typeof cur[k]!=='object')cur[k]={};cur=cur[k];}cur[parts[parts.length-1]]=value;}
  function orderExpr(orderBy){
    const map={
      sortKey:`json_extract(payload_json,'$.sortKey')`,
      updatedAt:`CAST(json_extract(payload_json,'$.updatedAt') AS INTEGER)`,
      'record/date':`json_extract(payload_json,'$.record.date')`,
      'record/code':`json_extract(payload_json,'$.record.code')`,
      'record/productCode':`json_extract(payload_json,'$.record.productCode')`,
      'record/supplierCode':`json_extract(payload_json,'$.record.supplierCode')`
    };
    return map[String(orderBy||'')]||'';
  }
  async function get(path,query){
    await ensureSchema();const p=normalizePath(path);
    const q=query||{},hasQuery=Object.keys(q).some(k=>q[k]!==undefined&&q[k]!==null&&q[k]!=='');
    if(!hasQuery){
      const [exactR]=await pipeline([stmt(`SELECT payload_json FROM ${KV_TABLE} WHERE path=? LIMIT 1`,[p])]);
      const exact=rowsOf(exactR)[0];if(exact)return parsePayload(exact.payload_json);
      const [descR]=await pipeline([stmt(`SELECT path,payload_json FROM ${KV_TABLE} WHERE path LIKE ? ORDER BY path ASC`,[p?`${p}/%`:'%'])]);
      const rows=rowsOf(descR);if(!rows.length)return null;const root={};
      for(const r of rows){const rel=p?r.path.slice(p.length+1):r.path;const parts=rel.split('/').filter(Boolean);if(parts.length)setNested(root,parts,parsePayload(r.payload_json));}
      return root;
    }
    const expr=orderExpr(q.orderBy);
    if(!expr){
      const [r]=await pipeline([stmt(`SELECT item_key,payload_json FROM ${KV_TABLE} WHERE parent_path=? ORDER BY item_key ASC`,[p])]);
      const out={};for(const row of rowsOf(r))out[row.item_key]=parsePayload(row.payload_json);return out;
    }
    const where=['parent_path=?'],args=[p];
    if(q.equalTo!==undefined){where.push(`${expr} = ?`);args.push(q.equalTo);}
    if(q.startAt!==undefined){where.push(`${expr} >= ?`);args.push(q.startAt);}
    if(q.endAt!==undefined){where.push(`${expr} <= ?`);args.push(q.endAt);}
    const last=Number(q.limitToLast||0)>0,limit=Math.max(0,Number(q.limitToFirst||q.limitToLast||0));
    let sql=`SELECT item_key,payload_json FROM ${KV_TABLE} WHERE ${where.join(' AND ')} ORDER BY ${expr} ${last?'DESC':'ASC'}, item_key ${last?'DESC':'ASC'}`;
    if(limit){sql+=' LIMIT ?';args.push(limit);}
    const [r]=await pipeline([stmt(sql,args)]);let rows=rowsOf(r);if(last)rows=rows.reverse();const out={};for(const row of rows)out[row.item_key]=parsePayload(row.payload_json);return out;
  }
  async function put(path,data){
    await ensureSchema();const s=splitPath(path),now=Date.now();await pipeline([stmt(`INSERT INTO ${KV_TABLE}(path,parent_path,item_key,payload_json,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(path) DO UPDATE SET parent_path=excluded.parent_path,item_key=excluded.item_key,payload_json=excluded.payload_json,updated_at=excluded.updated_at`,[s.path,s.parent,s.key,JSON.stringify(data),now])]);return data;
  }
  async function remove(path){
    await ensureSchema();const p=normalizePath(path);await pipeline([stmt(`DELETE FROM ${KV_TABLE} WHERE path=? OR path LIKE ?`,[p,`${p}/%`])]);return true;
  }
  async function patchMany(updates){
    await ensureSchema();const entries=Object.entries(updates||{}),now=Date.now();
    for(let i=0;i<entries.length;i+=80){const statements=[];for(const [path,value] of entries.slice(i,i+80)){const s=splitPath(path);if(value===null)statements.push(stmt(`DELETE FROM ${KV_TABLE} WHERE path=? OR path LIKE ?`,[s.path,`${s.path}/%`]));else statements.push(stmt(`INSERT INTO ${KV_TABLE}(path,parent_path,item_key,payload_json,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(path) DO UPDATE SET parent_path=excluded.parent_path,item_key=excluded.item_key,payload_json=excluded.payload_json,updated_at=excluded.updated_at`,[s.path,s.parent,s.key,JSON.stringify(value),now]));}if(statements.length)await pipeline(statements);}
    return true;
  }

  function allPerms(){const modules={};for(const m of ['dashboard','inventory','suppliers','debtors','purchases','sales','payments','bank','creditors','balance','expenses','stockCharts','daily','comprehensive','income','fx','analysis','users','settings'])modules[m]={view:true,create:true,edit:true,delete:true};return {modules,special:{manageUsers:true,manageSettings:true,export:true,import:true,print:true,sync:true}};}
  function sanitizePermissions(p){const out={modules:{},special:{}};for(const m of ['dashboard','inventory','suppliers','debtors','purchases','sales','payments','bank','creditors','balance','expenses','stockCharts','daily','comprehensive','income','fx','analysis','users','settings']){const s=p?.modules?.[m]||{};out.modules[m]={view:!!s.view,create:!!s.create,edit:!!s.edit,delete:!!s.delete};}for(const k of ['manageUsers','manageSettings','export','import','print','sync'])out.special[k]=!!p?.special?.[k];if(out.special.manageUsers)out.modules.users.view=true;if(out.special.manageSettings)out.modules.settings.view=true;return out;}
  function publicCompany(c){const settings={...defaultSettings(c?.name||''),...(c?.settings||{})};return {id:c.id,name:c.name,status:c.status,expiresAt:n(c.expiresAt),keyHint:c.keyHint||'',settings};}
  function publicUser(u){return {id:u.id,username:u.username,displayName:u.displayName||u.username,role:u.role,status:u.status,permissions:u.permissions||{},lastLoginAt:n(u.lastLoginAt)};}
  const permsOf=a=>a.user.role==='owner'?allPerms():(a.user.permissions||{});
  const hasModule=(a,m,act='view')=>a.user.role==='owner'||!!permsOf(a)?.modules?.[m]?.[act];
  const hasSpecial=(a,k)=>a.user.role==='owner'||!!permsOf(a)?.special?.[k];
  function requireModule(a,m,act='view'){if(!hasModule(a,m,act))throw new CloudError(403,'NO_PERMISSION','لا تملك صلاحية تنفيذ هذه العملية');}
  function requireSpecial(a,k){if(!hasSpecial(a,k))throw new CloudError(403,'NO_PERMISSION','لا تملك صلاحية تنفيذ هذه العملية');}
  const moduleForDataset=d=>({products:'inventory',suppliers:'suppliers',purchases:'purchases',sales:'sales',payments:'payments',debtors:'debtors',creditors:'creditors',expenses:'expenses',fx:'fx'})[d]||d;
  function requireDatasetRead(a,d){if(hasModule(a,moduleForDataset(d),'view'))return;if(d==='products'&&['sales','purchases'].some(m=>hasModule(a,m,'view')||hasModule(a,m,'create')||hasModule(a,m,'edit')))return;if(d==='suppliers'&&['purchases','payments'].some(m=>hasModule(a,m,'view')||hasModule(a,m,'create')||hasModule(a,m,'edit')))return;throw new CloudError(403,'NO_PERMISSION','لا تملك صلاحية قراءة هذه البيانات');}
  function requireAnyView(a,mods){if(!mods.some(m=>hasModule(a,m,'view')))throw new CloudError(403,'NO_PERMISSION','لا تملك صلاحية عرض هذا التقرير');}
  function safeDataset(d){d=String(d||'');if(!DATASETS.has(d))throw new CloudError(400,'BAD_DATASET','قسم بيانات غير صالح');return d;}

  function readLocalAdminCredential(){
    try{return JSON.parse(localStorage.getItem(LOCAL_ADMIN_PASSWORD_KEY)||'null');}catch{return null;}
  }
  function writeLocalAdminCredential(cred){
    try{localStorage.setItem(LOCAL_ADMIN_PASSWORD_KEY,JSON.stringify(cred));}catch{}
  }
  function readLocalAdminSession(){
    try{return JSON.parse(localStorage.getItem(LOCAL_ADMIN_SESSION_KEY)||'null');}catch{return null;}
  }
  function writeLocalAdminSession(session){
    try{localStorage.setItem(LOCAL_ADMIN_SESSION_KEY,JSON.stringify(session));}catch{}
  }
  function clearLocalAdminSession(){try{localStorage.removeItem(LOCAL_ADMIN_SESSION_KEY);}catch{}}
  async function verifyLocalAdminPassword(password){
    const cred=readLocalAdminCredential();
    if(!cred)return String(password||'')===DEFAULT_ADMIN_PASSWORD;
    return verifyPassword(String(password||''),cred);
  }
  async function createAdminSession(){
    const token=`adm_local_${randomHex(48)}`,expiresAt=Date.now()+ADMIN_SESSION_MS;
    const session={token,expiresAt,createdAt:Date.now()};
    writeLocalAdminSession(session);
    return session;
  }
  async function createUserSession(company,user){const token=`ses_${randomHex(48)}`,hash=await sha256(token),now=Date.now(),expiresAt=Math.min(now+SESSION_MS,n(company.expiresAt));await put(`sessions/${hash}`,{companyId:company.id,userId:user.id,companyAuthVersion:n(company.authVersion),expiresAt,createdAt:now});return {token,expiresAt};}
  async function requireAdmin(token){
    const s=readLocalAdminSession();
    if(!token||!s||String(s.token)!==String(token))throw new CloudError(401,'SESSION_REQUIRED','تسجيل الدخول مطلوب');
    if(n(s.expiresAt)<=Date.now()){clearLocalAdminSession();throw new CloudError(401,'SESSION_EXPIRED','انتهت جلسة الأدمن');}
    return {hash:'local',session:s};
  }
  async function requireUser(token){
    if(!token)throw new CloudError(401,'SESSION_REQUIRED','تسجيل الدخول مطلوب');const h=await sha256(token),s=await get(`sessions/${h}`),now=Date.now();
    if(!s||n(s.expiresAt)<=now){if(s)remove(`sessions/${h}`).catch(()=>{});throw new CloudError(401,'SESSION_EXPIRED','انتهت جلسة تسجيل الدخول');}
    const company=await get(`companies/${safeKey(s.companyId)}`);if(!company||company.deleted)throw new CloudError(403,'COMPANY_DELETED','تم حذف مفتاح الشركة');if(company.status!=='active')throw new CloudError(403,'COMPANY_STOPPED','تم إيقاف مفتاح الشركة');if(n(company.expiresAt)<=now)throw new CloudError(403,'LICENSE_EXPIRED','انتهت مدة مفتاح الشركة');if(n(company.authVersion)!==n(s.companyAuthVersion))throw new CloudError(401,'SESSION_EXPIRED','تم تغيير مفتاح الشركة. سجل الدخول من جديد.');
    const user=await get(`users/${safeKey(company.id)}/${safeKey(s.userId)}`);if(!user||user.status!=='active')throw new CloudError(403,'USER_STOPPED','تم إيقاف المستخدم');
    return {hash:h,session:s,companyId:company.id,userId:user.id,company:publicCompany(company),companyRaw:company,user:publicUser(user),userRaw:user};
  }

  async function adminLogin(body){const password=String(body.password||'');if(!(await verifyLocalAdminPassword(password)))throw new CloudError(403,'ADMIN_LOGIN_FAILED','كلمة مرور الأدمن غير صحيحة');const s=await createAdminSession();return {ok:true,token:s.token,expiresAt:s.expiresAt,local:true};}
  async function adminCompanies(token){await requireAdmin(token);const [co,us]=await Promise.all([get('companies'),get('users')]);const companies=Object.values(co||{}),usersRoot=us||{};const rows=companies.map(c=>({...publicCompany(c),deleted:!!c.deleted,activeUsers:Object.values(usersRoot[safeKey(c.id)]||{}).filter(u=>u?.status==='active').length,createdAt:n(c.createdAt),updatedAt:n(c.updatedAt)})).sort((a,b)=>b.createdAt-a.createdAt);return {rows};}
  async function adminCreate(token,body){await requireAdmin(token);const name=String(body.name||'').trim();if(!name)throw new CloudError(400,'MISSING_NAME','اسم الشركة مطلوب');const ownerUsername=normUser(body.ownerUsername||'admin'),ownerName=String(body.ownerName||'مدير الشركة').trim()||'مدير الشركة',ownerPassword=String(body.ownerPassword||'');if(!ownerUsername||ownerPassword.length<4)throw new CloudError(400,'BAD_OWNER','أدخل اسم مستخدم وكلمة مرور للمدير من 4 خانات على الأقل');const now=Date.now(),days=clamp(body.days||30,1,3650),expiresAt=n(body.expiresAt)||now+days*86400000;if(expiresAt<=now)throw new CloudError(400,'BAD_EXPIRY','تاريخ الانتهاء يجب أن يكون في المستقبل');const licenseKey=`GHZ-${randomHex(4).toUpperCase()}-${randomHex(4).toUpperCase()}-${randomHex(4).toUpperCase()}-${randomHex(4).toUpperCase()}`,keyHash=await sha256(licenseKey),companyId=uid('cmp'),userId=uid('usr'),pass=await makePassword(ownerPassword),settings={...defaultSettings(name),...(body.settings||{}),companyName:String(body.settings?.companyName||name).trim()||name};const company={id:companyId,name,status:'active',licenseKeyHash:keyHash,keyHint:licenseKey.slice(-4),expiresAt,settings,deleted:false,authVersion:1,createdAt:now,updatedAt:now};const owner={id:userId,companyId,username:ownerUsername,displayName:ownerName,role:'owner',password:pass,permissions:allPerms(),status:'active',lastLoginAt:0,createdAt:now,updatedAt:now};await patchMany({[`companies/${companyId}`]:company,[`companyKeys/${keyHash}`]:{companyId},[`users/${companyId}/${userId}`]:owner,[`usernames/${companyId}/${safeKey(ownerUsername)}`]:userId});return {ok:true,company:{id:companyId,name,expiresAt,keyHint:company.keyHint},licenseKey,ownerUsername};}
  async function adminUpdate(token,body){await requireAdmin(token);const id=safeKey(body.id),c=await get(`companies/${id}`);if(!c)throw new CloudError(404,'COMPANY_NOT_FOUND','الشركة غير موجودة');const name=String(body.name??c.name).trim()||c.name,status=['active','stopped'].includes(body.status)?body.status:c.status;let expiresAt=n(body.expiresAt??c.expiresAt);if(body.extendDays)expiresAt=Math.max(Date.now(),n(c.expiresAt))+clamp(body.extendDays,1,3650)*86400000;const settings={...defaultSettings(name),...(c.settings||{}),...(body.settings||{})};settings.companyName=String(settings.companyName||name).trim()||name;let authVersion=n(c.authVersion)||1;if(status!=='active'||expiresAt<=Date.now())authVersion++;await put(`companies/${id}`,{...c,name,status,expiresAt,settings,authVersion,updatedAt:Date.now()});return {ok:true};}
  async function adminDelete(token,body){await requireAdmin(token);const id=safeKey(body.id),c=await get(`companies/${id}`);if(!c)throw new CloudError(404,'COMPANY_NOT_FOUND','الشركة غير موجودة');const users=await get(`users/${id}`),updates={[`companies/${id}`]:{...c,deleted:true,status:'deleted',authVersion:n(c.authVersion)+1,updatedAt:Date.now()}};for(const [uidKey,u] of Object.entries(users||{}))updates[`users/${id}/${uidKey}`]={...u,status:'stopped',updatedAt:Date.now()};await patchMany(updates);return {ok:true};}
  async function adminRotate(token,body){await requireAdmin(token);const id=safeKey(body.id),c=await get(`companies/${id}`);if(!c||c.deleted)throw new CloudError(404,'COMPANY_NOT_FOUND','الشركة غير موجودة');const key=`GHZ-${randomHex(4).toUpperCase()}-${randomHex(4).toUpperCase()}-${randomHex(4).toUpperCase()}-${randomHex(4).toUpperCase()}`,hash=await sha256(key),updates={[`companies/${id}`]:{...c,licenseKeyHash:hash,keyHint:key.slice(-4),authVersion:n(c.authVersion)+1,updatedAt:Date.now()},[`companyKeys/${hash}`]:{companyId:id}};if(c.licenseKeyHash)updates[`companyKeys/${c.licenseKeyHash}`]=null;await patchMany(updates);return {ok:true,licenseKey:key,keyHint:key.slice(-4)};}
  async function adminPasswordChange(token,body){await requireAdmin(token);if(!(await verifyLocalAdminPassword(String(body.currentPassword||''))))throw new CloudError(403,'ADMIN_PASSWORD_WRONG','كلمة المرور الحالية غير صحيحة');const p=String(body.newPassword||'');if(p.length<4)throw new CloudError(400,'BAD_PASSWORD','كلمة المرور الجديدة قصيرة');writeLocalAdminCredential(await makePassword(p));return {ok:true,local:true};}

  async function login(body){const key=String(body.companyKey||'').trim().toUpperCase(),username=normUser(body.username),password=String(body.password||'');if(!key||!username||!password)throw new CloudError(400,'MISSING_FIELDS','أدخل مفتاح الشركة واسم المستخدم وكلمة المرور');const keyHash=await sha256(key),idx=await get(`companyKeys/${keyHash}`);if(!idx?.companyId)throw new CloudError(403,'COMPANY_DELETED','مفتاح الشركة غير صالح');const company=await get(`companies/${safeKey(idx.companyId)}`),now=Date.now();if(!company||company.deleted)throw new CloudError(403,'COMPANY_DELETED','مفتاح الشركة غير صالح');if(company.status!=='active')throw new CloudError(403,'COMPANY_STOPPED','مفتاح الشركة موقوف');if(n(company.expiresAt)<=now)throw new CloudError(403,'LICENSE_EXPIRED','انتهت مدة مفتاح الشركة');const userId=await get(`usernames/${safeKey(company.id)}/${safeKey(username)}`),user=userId?await get(`users/${safeKey(company.id)}/${safeKey(userId)}`):null;if(!user||user.status!=='active'||!(await verifyPassword(password,user.password)))throw new CloudError(403,'LOGIN_FAILED','بيانات الدخول غير صحيحة أو المستخدم موقوف');user.lastLoginAt=now;user.updatedAt=now;await put(`users/${safeKey(company.id)}/${safeKey(user.id)}`,user);const s=await createUserSession(company,user);return {ok:true,token:s.token,sessionExpiresAt:s.expiresAt,company:publicCompany(company),user:publicUser(user)};}
  async function logout(token,isAdmin=false){if(isAdmin){clearLocalAdminSession();return {ok:true};}if(!token)return {ok:true};const h=await sha256(token);await remove(`sessions/${h}`).catch(()=>{});return {ok:true};}

  async function companySettingsSave(auth,body){requireSpecial(auth,'manageSettings');const c=auth.companyRaw,incoming=body.settings||{},settings={...(c.settings||{})};for(const k of ['companyName','phone','whatsapp','email','website','address','taxNumber','commercialRegistration','currency','logoUrl','notes'])if(incoming[k]!==undefined)settings[k]=String(incoming[k]??'').trim();const name=settings.companyName||c.name,next={...c,name,settings,updatedAt:Date.now()};await put(`companies/${safeKey(c.id)}`,next);return {ok:true,company:publicCompany(next)};}
  async function accountPasswordChange(auth,body){const u=auth.userRaw;if(!(await verifyPassword(String(body.currentPassword||''),u.password)))throw new CloudError(403,'PASSWORD_WRONG','كلمة المرور الحالية غير صحيحة');const p=String(body.newPassword||'');if(p.length<4)throw new CloudError(400,'BAD_PASSWORD','كلمة المرور الجديدة قصيرة');u.password=await makePassword(p);u.updatedAt=Date.now();await put(`users/${safeKey(auth.companyId)}/${safeKey(u.id)}`,u);return {ok:true};}
  async function usersList(auth){requireSpecial(auth,'manageUsers');const obj=await get(`users/${safeKey(auth.companyId)}`);const rows=Object.values(obj||{}).map(publicUser).sort((a,b)=>(a.role==='owner'?-1:b.role==='owner'?1:a.username.localeCompare(b.username)));return {rows};}
  async function usersSave(auth,body){requireSpecial(auth,'manageUsers');const cid=safeKey(auth.companyId),id=String(body.id||''),username=normUser(body.username),displayName=String(body.displayName||username).trim()||username,status=body.status==='stopped'?'stopped':'active',permissions=sanitizePermissions(body.permissions||{}),now=Date.now();if(!username)throw new CloudError(400,'BAD_USERNAME','اسم المستخدم مطلوب');const nameKey=safeKey(username),existingByName=await get(`usernames/${cid}/${nameKey}`);if(!id){if(existingByName)throw new CloudError(409,'USERNAME_EXISTS','اسم المستخدم مستخدم مسبقًا');const pass=String(body.password||'');if(pass.length<4)throw new CloudError(400,'BAD_PASSWORD','كلمة المرور مطلوبة ومن 4 خانات على الأقل');const userId=uid('usr'),u={id:userId,companyId:auth.companyId,username,displayName,role:'employee',password:await makePassword(pass),permissions,status,lastLoginAt:0,createdAt:now,updatedAt:now};await patchMany({[`users/${cid}/${userId}`]:u,[`usernames/${cid}/${nameKey}`]:userId});return {ok:true,id:userId};}const u=await get(`users/${cid}/${safeKey(id)}`);if(!u)throw new CloudError(404,'USER_NOT_FOUND','المستخدم غير موجود');if(u.role==='owner')throw new CloudError(403,'OWNER_PROTECTED','حساب المالك لا يعدل من قسم الموظفين');if(existingByName&&String(existingByName)!==String(id))throw new CloudError(409,'USERNAME_EXISTS','اسم المستخدم مستخدم مسبقًا');const oldKey=safeKey(u.username),next={...u,username,displayName,permissions,status,updatedAt:now};if(body.password){const p=String(body.password);if(p.length<4)throw new CloudError(400,'BAD_PASSWORD','كلمة المرور قصيرة');next.password=await makePassword(p);}const updates={[`users/${cid}/${safeKey(id)}`]:next,[`usernames/${cid}/${nameKey}`]:id};if(oldKey!==nameKey)updates[`usernames/${cid}/${oldKey}`]=null;await patchMany(updates);return {ok:true};}
  async function userStatus(auth,body){requireSpecial(auth,'manageUsers');const id=safeKey(body.id),u=await get(`users/${safeKey(auth.companyId)}/${id}`);if(!u)throw new CloudError(404,'USER_NOT_FOUND','المستخدم غير موجود');if(u.role==='owner')throw new CloudError(403,'OWNER_PROTECTED','لا يمكن إيقاف حساب المالك من هنا');u.status=body.status==='active'?'active':'stopped';u.updatedAt=Date.now();await put(`users/${safeKey(auth.companyId)}/${id}`,u);return {ok:true};}

  const maxTs=9999999999999;
  const sortKey=(ts,id)=>`${String(Math.max(0,maxTs-Math.min(maxTs,n(ts)||Date.now()))).padStart(13,'0')}_${safeKey(id)}`;
  const recordPath=(cid,dataset,id)=>`data/${safeKey(cid)}/${dataset}/${safeKey(id)}`;
  function unwrap(w){if(!w||w.deleted)return null;const r={...(w.record||{})};r.id=w.id||r.id;r.updatedAt=n(w.updatedAt||r.updatedAt);r.sortTs=n(w.sortTs||r.sortTs||r.updatedAt);return r;}
  function wrappers(obj){return Object.values(obj||{}).filter(Boolean);}
  function sortWrappers(arr){return arr.sort((a,b)=>String(a.sortKey||'').localeCompare(String(b.sortKey||'')));}

  async function recordsPage(auth,url){const dataset=safeDataset(url.searchParams.get('dataset'));requireDatasetRead(auth,dataset);const limit=clamp(url.searchParams.get('limit'),1,100),beforeSortTs=Number(url.searchParams.get('beforeSortTs')),beforeId=url.searchParams.get('beforeId'),cursor=(Number.isFinite(beforeSortTs)&&beforeId)?sortKey(beforeSortTs,beforeId):'';let obj;try{obj=await get(`data/${safeKey(auth.companyId)}/${dataset}`,{orderBy:'sortKey',...(cursor?{startAt:cursor}:{}),limitToFirst:limit+3});}catch{obj=await get(`data/${safeKey(auth.companyId)}/${dataset}`);}let arr=sortWrappers(wrappers(obj)).filter(w=>!w.deleted&&(!cursor||String(w.sortKey)>cursor));const hasMore=arr.length>limit;arr=arr.slice(0,limit);const rows=arr.map(unwrap).filter(Boolean),last=rows[rows.length-1];return {rows,hasMore,next:last?{sortTs:last.sortTs,id:last.id}:null};}
  async function scanDataset(cid,dataset,fn,{max=Infinity}={}){let cursor='',seen=0,loops=0;while(seen<max&&loops++<500){let obj;try{obj=await get(`data/${safeKey(cid)}/${dataset}`,{orderBy:'sortKey',...(cursor?{startAt:cursor}:{}),limitToFirst:251});}catch{obj=await get(`data/${safeKey(cid)}/${dataset}`);}let arr=sortWrappers(wrappers(obj)).filter(w=>!cursor||String(w.sortKey)>cursor);if(!arr.length)break;for(const w of arr){cursor=String(w.sortKey||cursor);if(w.deleted)continue;const r=unwrap(w);if(r){await fn(r);seen++;if(seen>=max)break;}}if(arr.length<250||!cursor)break;}return seen;}
  async function queryByField(cid,dataset,field,value,{startAt,endAt,limitToLast,limitToFirst}={}){let query={orderBy:`record/${field}`};if(value!==undefined)query.equalTo=value;if(startAt!==undefined)query.startAt=startAt;if(endAt!==undefined)query.endAt=endAt;if(limitToLast)query.limitToLast=limitToLast;if(limitToFirst)query.limitToFirst=limitToFirst;try{const obj=await get(`data/${safeKey(cid)}/${dataset}`,query);return wrappers(obj).filter(w=>!w.deleted).map(unwrap).filter(Boolean);}catch{const out=[];await scanDataset(cid,dataset,r=>{const v=r[field];if(value!==undefined&&String(v)!==String(value))return;if(startAt!==undefined&&String(v)<String(startAt))return;if(endAt!==undefined&&String(v)>String(endAt))return;out.push(r);});return out;}}
  async function recordsSearch(auth,url){const dataset=safeDataset(url.searchParams.get('dataset'));requireDatasetRead(auth,dataset);const q=normText(url.searchParams.get('q')),limit=clamp(url.searchParams.get('limit'),1,60),rows=[];await scanDataset(auth.companyId,dataset,r=>{if(rows.length>=limit)return;const t=normText(r.searchText||[r.name,r.code,r.category,r.unit,r.productName,r.productCode,r.supplierName,r.supplierCode,r.type,r.method,r.note].filter(Boolean).join(' '));if(!q||t.includes(q))rows.push(r);},{max:1200});return {rows};}
  async function recordsChanges(auth,url){const dataset=safeDataset(url.searchParams.get('dataset'));requireDatasetRead(auth,dataset);const since=Math.max(0,n(url.searchParams.get('since'))),limit=clamp(url.searchParams.get('limit'),1,200);let obj;try{obj=await get(`data/${safeKey(auth.companyId)}/${dataset}`,{orderBy:'updatedAt',startAt:since+1,limitToFirst:limit});}catch{obj=await get(`data/${safeKey(auth.companyId)}/${dataset}`);}const arr=wrappers(obj).filter(w=>n(w.updatedAt)>since).sort((a,b)=>n(a.updatedAt)-n(b.updatedAt)).slice(0,limit);return {rows:arr.map(w=>({id:w.id,deleted:!!w.deleted,updatedAt:n(w.updatedAt),record:w.deleted?null:unwrap(w)}))};}

  async function rebuildInventory(cid,code){code=String(code||'').trim();if(!code)return;const [products,purchases,sales]=await Promise.all([queryByField(cid,'products','code',code),queryByField(cid,'purchases','productCode',code),queryByField(cid,'sales','productCode',code)]);const p=products[0]||{},oq=n(p.openingQty),oc=n(p.openingUnitCost),bq=purchases.reduce((s,x)=>s+n(x.qty),0),bv=purchases.reduce((s,x)=>s+n(x.price)*n(x.qty)-n(x.discount),0),sq=sales.reduce((s,x)=>s+n(x.qty),0),sv=sales.reduce((s,x)=>s+n(x.price)*n(x.qty),0),pq=oq+bq,pv=oq*oc+bv,avg=pq?pv/pq:0,rem=pq-sq,stat={code,name:p.name||'',category:p.category||'غير مصنف',purchasedQty:pq,purchaseValue:pv,soldQty:sq,salesValue:sv,avgCost:avg,remainingQty:rem,endingInventory:rem*avg,profit:sv-sq*avg,updatedAt:Date.now()};await put(`derived/${safeKey(cid)}/inventory/${safeKey(await sha256(code))}`,stat);}
  async function rebuildSupplier(cid,code){code=String(code||'').trim();if(!code)return;const [purchases,payments]=await Promise.all([queryByField(cid,'purchases','supplierCode',code),queryByField(cid,'payments','supplierCode',code)]);const due=purchases.reduce((s,x)=>s+n(x.price)*n(x.qty)-n(x.discount),0),bank=payments.filter(x=>x.method==='دفع بنكي').reduce((s,x)=>s+n(x.amount),0),cash=payments.filter(x=>x.method==='دفع نقدي').reduce((s,x)=>s+n(x.amount),0);await put(`derived/${safeKey(cid)}/suppliers/${safeKey(await sha256(code))}`,{code,due,bank,cash,paid:bank+cash,balance:due-bank-cash,updatedAt:Date.now()});}
  async function recordsWrite(auth,body){const dataset=safeDataset(body.dataset),module=moduleForDataset(dataset),id=String(body.id||body.record?.id||'');if(!id)throw new CloudError(400,'MISSING_ID','معرف السجل مطلوب');const path=recordPath(auth.companyId,dataset,id),old=await get(path),exists=!!old&&!old.deleted,action=body.action==='delete'?'delete':'set',record=body.record||{},updatedAt=Math.max(1,n(record.updatedAt)||Date.now()),sTs=Math.max(1,n(record.sortTs)||updatedAt);if(old&&n(old.updatedAt)>updatedAt)return {ok:true,ignored:true,updatedAt:n(old.updatedAt)};if(action==='delete'){requireModule(auth,module,'delete');await put(path,{id,deleted:true,record:{},updatedAt,sortTs:sTs,sortKey:sortKey(sTs,id),searchText:''});}else{requireModule(auth,module,exists?'edit':'create');const rec={...record,id,updatedAt,sortTs:sTs},searchText=normText(record.searchText||[record.name,record.code,record.category,record.unit,record.productName,record.productCode,record.supplierName,record.supplierCode,record.type,record.method,record.note].filter(Boolean).join(' ')).slice(0,3000);rec.searchText=searchText;await put(path,{id,deleted:false,record:rec,updatedAt,sortTs:sTs,sortKey:sortKey(sTs,id),searchText});}
    const oldRec=old&&!old.deleted?unwrap(old):null,newRec=action==='delete'?null:{...record,id,updatedAt,sortTs:sTs};const invCodes=new Set(),supCodes=new Set();for(const r of [oldRec,newRec]){if(!r)continue;if(dataset==='products')invCodes.add(String(r.code||''));if(dataset==='purchases'){invCodes.add(String(r.productCode||''));supCodes.add(String(r.supplierCode||''));}if(dataset==='sales')invCodes.add(String(r.productCode||''));if(dataset==='suppliers')supCodes.add(String(r.code||''));if(dataset==='payments')supCodes.add(String(r.supplierCode||''));}await Promise.allSettled([...invCodes].filter(Boolean).map(c=>rebuildInventory(auth.companyId,c)).concat([...supCodes].filter(Boolean).map(c=>rebuildSupplier(auth.companyId,c))));return {ok:true,deleted:action==='delete',updatedAt};}

  async function metricSummary(auth,url){const dataset=safeDataset(url.searchParams.get('dataset'));requireDatasetRead(auth,dataset);let total=0,bank=0,cash=0;await scanDataset(auth.companyId,dataset,r=>{const a=dataset==='sales'?n(r.price)*n(r.qty):n(r.amount);total+=a;const m=String(r.method||r.type||'');if(m.includes('بنكي'))bank+=a;if(m.includes('نقدي'))cash+=a;});return {total,bank,cash};}
  async function metricInventory(auth,url){requireModule(auth,'inventory','view');const codes=String(url.searchParams.get('codes')||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,60),stats={};if(!codes.length)return {stats};let derived=Object.values((await get(`derived/${safeKey(auth.companyId)}/inventory`))||{});for(const code of codes){let s=derived.find(x=>String(x.code)===code);if(!s){await rebuildInventory(auth.companyId,code).catch(()=>{});const x=await get(`derived/${safeKey(auth.companyId)}/inventory/${safeKey(await sha256(code))}`);if(x)s=x;}if(s)stats[code]={purchasedQty:n(s.purchasedQty),purchaseValue:n(s.purchaseValue),soldQty:n(s.soldQty),salesValue:n(s.salesValue),avgCost:n(s.avgCost),remainingQty:n(s.remainingQty),endingInventory:n(s.endingInventory),profit:n(s.profit)};}return {stats};}
  async function metricSuppliers(auth,url){requireModule(auth,'suppliers','view');const codes=String(url.searchParams.get('codes')||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,60),stats={};if(!codes.length)return {stats};let derived=Object.values((await get(`derived/${safeKey(auth.companyId)}/suppliers`))||{});for(const code of codes){let s=derived.find(x=>String(x.code)===code);if(!s){await rebuildSupplier(auth.companyId,code).catch(()=>{});const x=await get(`derived/${safeKey(auth.companyId)}/suppliers/${safeKey(await sha256(code))}`);if(x)s=x;}if(s)stats[code]={due:n(s.due),bank:n(s.bank),cash:n(s.cash),paid:n(s.paid),balance:n(s.balance)};}return {stats};}
  async function inventoryAvgMap(cid){const d=Object.values((await get(`derived/${safeKey(cid)}/inventory`))||{}),m={};for(const x of d)m[String(x.code)]=n(x.avgCost);return m;}
  async function metricDashboard(auth,url){requireModule(auth,'dashboard','view');const year=String(url.searchParams.get('year')||new Date().getFullYear());if(!/^\d{4}$/.test(year))throw new CloudError(400,'BAD_YEAR','سنة غير صالحة');const by={};for(let i=1;i<=12;i++){const m=String(i).padStart(2,'0');by[m]={month:m,revenue:0,cogs:0,gross:0,expenses:0,net:0};}const [sales,expenses,avg]=await Promise.all([queryByField(auth.companyId,'sales','date',undefined,{startAt:`${year}-01-01`,endAt:`${year}-12-31`}),queryByField(auth.companyId,'expenses','date',undefined,{startAt:`${year}-01-01`,endAt:`${year}-12-31`}),inventoryAvgMap(auth.companyId)]);for(const r of sales){const m=String(r.date||'').slice(5,7);if(by[m]){by[m].revenue+=n(r.price)*n(r.qty);by[m].cogs+=n(r.qty)*n(avg[String(r.productCode)]);}}for(const r of expenses){const m=String(r.date||'').slice(5,7);if(by[m])by[m].expenses+=n(r.amount);}for(const x of Object.values(by)){x.gross=x.revenue-x.cogs;x.net=x.gross-x.expenses;}return {months:Object.values(by)};}
  async function metricFinancial(auth,url){requireAnyView(auth,['balance','daily','comprehensive','income','analysis']);const start=String(url.searchParams.get('start')||'0000-01-01'),end=String(url.searchParams.get('end')||'9999-12-31');const names=['sales','purchases','expenses','debtors','creditors','payments','fx'],sets=await Promise.all(names.map(d=>queryByField(auth.companyId,d,'date',undefined,{startAt:start,endAt:end}))),map=Object.fromEntries(names.map((d,i)=>[d,sets[i]])),sum=(arr,f)=>arr.reduce((s,x)=>s+f(x),0),revenue=sum(map.sales,x=>n(x.price)*n(x.qty)),purchaseValue=sum(map.purchases,x=>n(x.price)*n(x.qty)-n(x.discount)),expensesTotal=sum(map.expenses,x=>n(x.amount));return {salesCount:map.sales.length,purchasesCount:map.purchases.length,expensesCount:map.expenses.length,debtorsCount:map.debtors.length,creditorsCount:map.creditors.length,paymentsCount:map.payments.length,fxCount:map.fx.length,revenue,purchaseValue,expensesTotal,debtorsTotal:sum(map.debtors,x=>n(x.amount)),creditorsTotal:sum(map.creditors,x=>n(x.amount)),paymentsTotal:sum(map.payments,x=>n(x.amount)),gross:revenue-purchaseValue,net:revenue-purchaseValue-expensesTotal};}
  async function metricBank(auth,url){requireModule(auth,'bank','view');const limit=clamp(url.searchParams.get('limit'),1,80),rows=[];let totalIn=0,totalOut=0;await Promise.all([['sales',r=>{if(r.type==='بيع بنكي'){const a=n(r.price)*n(r.qty);totalIn+=a;rows.push({date:r.date||'',desc:`بيع - ${r.productName||r.productCode||''}`,in:a,out:0});}}],['payments',r=>{if(r.method==='دفع بنكي'){const a=n(r.amount);totalOut+=a;rows.push({date:r.date||'',desc:`دفعة مورد - ${r.supplierName||r.supplierCode||''}`,in:0,out:a});}}],['expenses',r=>{if(r.type==='مصروفات بنكية'){const a=n(r.amount);totalOut+=a;rows.push({date:r.date||'',desc:r.note||'مصروف بنكي',in:0,out:a});}}],['debtors',r=>{if(r.method==='بنكي'){const a=n(r.amount);totalIn+=a;rows.push({date:r.date||'',desc:`مدين - ${r.name||''}`,in:a,out:0});}}],['creditors',r=>{if(r.method==='بنكي'){const a=n(r.amount);totalOut+=a;rows.push({date:r.date||'',desc:`دائن - ${r.name||''}`,in:0,out:a});}}]].map(([d,fn])=>scanDataset(auth.companyId,d,fn)));rows.sort((a,b)=>String(b.date).localeCompare(String(a.date)));return {rows:rows.slice(0,limit),totalIn,totalOut};}
  async function metricStockCategories(auth,url){requireModule(auth,'stockCharts','view');const limit=clamp(url.searchParams.get('limit'),1,30),derived=Object.values((await get(`derived/${safeKey(auth.companyId)}/inventory`))||{}),by={};for(const s of derived){const cat=s.category||'غير مصنف';by[cat]=by[cat]||{category:cat,qty:0,value:0};by[cat].qty+=n(s.remainingQty);by[cat].value+=n(s.endingInventory);}return {rows:Object.values(by).sort((a,b)=>b.value-a.value).slice(0,limit)};}

  async function request(path,options={},token=''){
    const method=String(options.method||'GET').toUpperCase();let body={};try{body=options.body?JSON.parse(options.body):{};}catch{body={};}const url=new URL(path,'https://local.invalid');const p=url.pathname;
    if(p==='/admin/login'&&method==='POST')return adminLogin(body);
    if(p==='/admin/validate'&&method==='POST'){const a=await requireAdmin(token);return {ok:true,expiresAt:n(a.session.expiresAt)};}
    if(p==='/admin/logout'&&method==='POST')return logout(token,true);
    if(p==='/admin/companies'&&method==='GET')return adminCompanies(token);
    if(p==='/admin/companies/create'&&method==='POST')return adminCreate(token,body);
    if(p==='/admin/companies/update'&&method==='POST')return adminUpdate(token,body);
    if(p==='/admin/companies/delete'&&method==='POST')return adminDelete(token,body);
    if(p==='/admin/companies/rotate-key'&&method==='POST')return adminRotate(token,body);
    if(p==='/admin/password'&&method==='POST')return adminPasswordChange(token,body);
    if(p==='/auth/login'&&method==='POST')return login(body);
    if(p==='/auth/logout'&&method==='POST')return logout(token,false);
    const auth=await requireUser(token);
    if(p==='/auth/validate'&&method==='POST')return {ok:true,company:auth.company,user:auth.user};
    if(p==='/company/settings'&&method==='GET'){requireModule(auth,'settings','view');return {company:auth.company};}
    if(p==='/company/settings'&&method==='POST')return companySettingsSave(auth,body);
    if(p==='/account/password'&&method==='POST')return accountPasswordChange(auth,body);
    if(p==='/users'&&method==='GET')return usersList(auth);
    if(p==='/users/save'&&method==='POST')return usersSave(auth,body);
    if(p==='/users/status'&&method==='POST')return userStatus(auth,body);
    if(p==='/records/page'&&method==='GET')return recordsPage(auth,url);
    if(p==='/records/search'&&method==='GET')return recordsSearch(auth,url);
    if(p==='/records/changes'&&method==='GET')return recordsChanges(auth,url);
    if(p==='/records/write'&&method==='POST')return recordsWrite(auth,body);
    if(p==='/metrics/summary'&&method==='GET')return metricSummary(auth,url);
    if(p==='/metrics/inventory'&&method==='GET')return metricInventory(auth,url);
    if(p==='/metrics/suppliers'&&method==='GET')return metricSuppliers(auth,url);
    if(p==='/metrics/dashboard'&&method==='GET')return metricDashboard(auth,url);
    if(p==='/metrics/financial'&&method==='GET')return metricFinancial(auth,url);
    if(p==='/metrics/bank'&&method==='GET')return metricBank(auth,url);
    if(p==='/metrics/stock-categories'&&method==='GET')return metricStockCategories(auth,url);
    throw new CloudError(404,'NOT_FOUND','المسار غير موجود');
  }

  async function ping(){await ensureSchema();const [r]=await pipeline([stmt('SELECT 1 AS ok')]);return Number(rowsOf(r)[0]?.ok||0)===1;}
  window.CASH_TOP_TURSO_CONFIG = TURSO_CONFIG;
  window.CashTopCloud = Object.freeze({request,config:TURSO_CONFIG,dbBase:tursoEndpoint(),appPath:APP_PATH,ensureSchema,ping});
})();
