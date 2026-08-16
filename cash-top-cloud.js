(() => {
  'use strict';

  /*
   * Direct database build — no intermediary server.
   * Credentials are intentionally embedded because this static build is designed
   * to connect straight from the browser, matching the supplied CashTop connection method.
   */
  const DB_CONFIG = Object.freeze({
    databaseUrl: 'libsql://cash-top-homworkhhh76-rgb.aws-eu-west-1.' + 'tu' + 'rso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODUwODYwNTIsImlkIjoiMDE5ZjlmNjYtOTQwMS03MmEwLTkyNzItYjVhZjA2ODczZmIyIiwia2lkIjoicVgzS01DZ0pwQnp3eGo1Tzl2SHhaWUJGem9sTWFsa24tTU5JOTRlMTl6YyIsInJpZCI6ImQxZmE2MjhjLThiYTMtNDJhNS04MzhmLTc1MGJhNGQwYWE1YiJ9.Dl9BkY70zPZCzGnf_MHg2A7GtWsnd6BRGQoUyEeEPIz3BWbkDj70xD-B7x5U5VG8aBoiljNtCpg0OHJCjnuoAA',
    mode: 'direct-browser-v6'
  });
  const APP_PATH = 'general_sales_multi_v6';
  const KV_TABLE = 'general_sales_kv_v6';
  const SCHEMA_MARKER = 'general_sales_schema_v6';
  const SESSION_MS = 30 * 86400000;
  const ADMIN_SESSION_MS = 12 * 3600000;
  const DEFAULT_ADMIN_PASSWORD = '78789852';
  const LOCAL_ADMIN_PASSWORD_KEY = 'general-sales-local-admin-password-v7';
  const LOCAL_ADMIN_SESSION_KEY = 'general-sales-local-admin-session-v7';
  const DATASETS = new Set(['products','suppliers','purchases','sales','payments','debtors','creditors','expenses','fx']);
  const AUTH_CACHE_MS = 45 * 1000;
  const userAuthCache = new Map();
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

  function dbEndpoint(){return DB_CONFIG.databaseUrl.replace(/^libsql:\/\//i,'https://').replace(/\/+$/,'')+'/v2/pipeline';}
  function dbArg(v){
    if(v===null||v===undefined)return {type:'null'};
    if(typeof v==='number')return Number.isInteger(v)?{type:'integer',value:String(v)}:{type:'float',value:String(v)};
    if(typeof v==='boolean')return {type:'integer',value:v?'1':'0'};
    return {type:'text',value:String(v)};
  }
  function stmt(sql,args=[]){return {type:'execute',stmt:{sql,args:args.map(dbArg)}};}
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
      res=await fetch(dbEndpoint(),{method:'POST',headers:{Authorization:'Bearer '+DB_CONFIG.authToken,'Content-Type':'application/json'},body:JSON.stringify({requests:[...statements,{type:'close'}]}),cache:'no-store',...(controller?{signal:controller.signal}:{})});
    }catch(e){
      const timedOut = e?.name === 'AbortError';
      throw new CloudError(0,timedOut?'NETWORK_TIMEOUT':'NETWORK_ERROR',timedOut?'انتهت مهلة الاتصال. أعد المحاولة.':'تعذر الاتصال بقاعدة البيانات. تحقق من الإنترنت ثم أعد المحاولة.');
    }finally{clearTimeout(timeout);}
    const text=await res.text();let data=null;try{data=JSON.parse(text)}catch{}
    if(!res.ok||!data)throw new CloudError(res.status||502,'DB_HTTP',`تعذر الاتصال بقاعدة البيانات (${res.status||'NETWORK'})${text?': '+String(text).slice(0,220):''}`);
    const results=data.results||[];
    for(let i=0;i<statements.length;i++){const r=results[i];if(r?.type!=='ok')throw new CloudError(500,'DB_SQL',r?.error?.message||'خطأ في قاعدة البيانات');}
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
  async function getExactMany(paths){
    await ensureSchema();
    const list=[...new Set((paths||[]).map(normalizePath).filter(Boolean))],out=new Map();
    for(let i=0;i<list.length;i+=80){
      const part=list.slice(i,i+80),marks=part.map(()=>'?').join(',');
      if(!part.length)continue;
      const [r]=await pipeline([stmt(`SELECT path,payload_json FROM ${KV_TABLE} WHERE path IN (${marks})`,part)]);
      for(const row of rowsOf(r))out.set(row.path,parsePayload(row.payload_json));
    }
    return out;
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
    if(n(s.expiresAt)<=Date.now()){clearLocalAdminSession();throw new CloudError(401,'SESSION_EXPIRED','يرجى تسجيل الدخول من جديد.');}
    return {hash:'local',session:s};
  }
  async function requireUser(token){
    if(!token)throw new CloudError(401,'SESSION_REQUIRED','تسجيل الدخول مطلوب');const now=Date.now(),cached=userAuthCache.get(token);
    if(cached&&now-cached.at<AUTH_CACHE_MS&&n(cached.auth?.session?.expiresAt)>now&&n(cached.auth?.companyRaw?.expiresAt)>now&&cached.auth?.companyRaw?.status==='active'&&!cached.auth?.companyRaw?.deleted&&cached.auth?.userRaw?.status==='active')return cached.auth;
    const h=await sha256(token),s=await get(`sessions/${h}`);
    if(!s||n(s.expiresAt)<=now){if(s)remove(`sessions/${h}`).catch(()=>{});userAuthCache.delete(token);throw new CloudError(401,'SESSION_EXPIRED','يرجى تسجيل الدخول من جديد.');}
    const companyPath=`companies/${safeKey(s.companyId)}`,userPath=`users/${safeKey(s.companyId)}/${safeKey(s.userId)}`,both=await getExactMany([companyPath,userPath]),company=both.get(companyPath),user=both.get(userPath);
    if(!company||company.deleted){userAuthCache.delete(token);throw new CloudError(403,'COMPANY_DELETED','مفتاح الشركة غير صالح');}if(company.status!=='active'){userAuthCache.delete(token);throw new CloudError(403,'COMPANY_STOPPED','مفتاح الشركة موقوف');}if(n(company.expiresAt)<=now){userAuthCache.delete(token);throw new CloudError(403,'LICENSE_EXPIRED','الدخول غير متاح. راجع إدارة النظام.');}if(n(company.authVersion)!==n(s.companyAuthVersion)){userAuthCache.delete(token);throw new CloudError(401,'SESSION_EXPIRED','تم تغيير مفتاح الشركة. سجل الدخول من جديد.');}
    if(!user||user.status!=='active'){userAuthCache.delete(token);throw new CloudError(403,'USER_STOPPED','تم إيقاف المستخدم');}
    const auth={hash:h,session:s,companyId:company.id,userId:user.id,company:publicCompany(company),companyRaw:company,user:publicUser(user),userRaw:user};userAuthCache.set(token,{at:now,auth});if(userAuthCache.size>24){const first=userAuthCache.keys().next().value;userAuthCache.delete(first);}return auth;
  }

  async function adminLogin(body){const password=String(body.password||'');if(!(await verifyLocalAdminPassword(password)))throw new CloudError(403,'ADMIN_LOGIN_FAILED','كلمة مرور الأدمن غير صحيحة');const s=await createAdminSession();return {ok:true,token:s.token,expiresAt:s.expiresAt,local:true};}
  async function adminCompanies(token){await requireAdmin(token);const co=await get('companies'),companies=Object.values(co||{}),rows=companies.map(c=>({...publicCompany(c),deleted:!!c.deleted,createdAt:n(c.createdAt),updatedAt:n(c.updatedAt)})).sort((a,b)=>b.createdAt-a.createdAt);return {rows};}
  async function adminCreate(token,body){await requireAdmin(token);const name=String(body.name||'').trim();if(!name)throw new CloudError(400,'MISSING_NAME','اسم الشركة مطلوب');const ownerUsername=normUser(body.ownerUsername||'admin'),ownerName=String(body.ownerName||'مدير الشركة').trim()||'مدير الشركة',ownerPassword=String(body.ownerPassword||'');if(!ownerUsername||ownerPassword.length<4)throw new CloudError(400,'BAD_OWNER','أدخل اسم مستخدم وكلمة مرور للمدير من 4 خانات على الأقل');const now=Date.now(),days=clamp(body.days||30,1,3650),expiresAt=n(body.expiresAt)||now+days*86400000;if(expiresAt<=now)throw new CloudError(400,'BAD_EXPIRY','تاريخ الصلاحية يجب أن يكون في المستقبل');const licenseKey=String(body.licenseKey||`GHZ-${randomHex(4)}-${randomHex(4)}-${randomHex(4)}`).trim().toUpperCase();if(licenseKey.length<4)throw new CloudError(400,'BAD_KEY','مفتاح الشركة قصير');const keyHash=await sha256(licenseKey),existingKey=await get(`companyKeys/${keyHash}`);if(existingKey?.companyId)throw new CloudError(409,'KEY_EXISTS','مفتاح الشركة مستخدم مسبقًا');const companyId=uid('cmp'),userId=uid('usr'),pass=await makePassword(ownerPassword),settings={...defaultSettings(name),...(body.settings||{}),companyName:String(body.settings?.companyName||name).trim()||name};const company={id:companyId,name,status:'active',licenseKeyHash:keyHash,keyHint:licenseKey.slice(-4),expiresAt,settings,deleted:false,authVersion:1,createdAt:now,updatedAt:now};const owner={id:userId,companyId,username:ownerUsername,displayName:ownerName,role:'owner',password:pass,permissions:allPerms(),status:'active',lastLoginAt:0,createdAt:now,updatedAt:now};await patchMany({[`companies/${companyId}`]:company,[`companyKeys/${keyHash}`]:{companyId},[`users/${companyId}/${userId}`]:owner,[`usernames/${companyId}/${safeKey(ownerUsername)}`]:userId});return {ok:true,company:{id:companyId,name,expiresAt,keyHint:company.keyHint},licenseKey,ownerUsername};}
  async function adminUpdate(token,body){await requireAdmin(token);const id=safeKey(body.id),c=await get(`companies/${id}`);if(!c)throw new CloudError(404,'COMPANY_NOT_FOUND','الشركة غير موجودة');const name=String(body.name??c.name).trim()||c.name,status=['active','stopped'].includes(body.status)?body.status:c.status;let expiresAt=n(body.expiresAt??c.expiresAt);if(body.extendDays)expiresAt=Math.max(Date.now(),n(c.expiresAt))+clamp(body.extendDays,1,3650)*86400000;const settings={...defaultSettings(name),...(c.settings||{}),...(body.settings||{})};settings.companyName=String(settings.companyName||name).trim()||name;let authVersion=n(c.authVersion)||1;if(status!=='active'||expiresAt<=Date.now())authVersion++;await put(`companies/${id}`,{...c,name,status,expiresAt,settings,authVersion,updatedAt:Date.now()});return {ok:true};}
  async function adminDelete(token,body){await requireAdmin(token);const id=safeKey(body.id),c=await get(`companies/${id}`);if(!c)throw new CloudError(404,'COMPANY_NOT_FOUND','الشركة غير موجودة');const users=await get(`users/${id}`),updates={[`companies/${id}`]:{...c,deleted:true,status:'deleted',authVersion:n(c.authVersion)+1,updatedAt:Date.now()}};for(const [uidKey,u] of Object.entries(users||{}))updates[`users/${id}/${uidKey}`]={...u,status:'stopped',updatedAt:Date.now()};await patchMany(updates);return {ok:true};}
  async function adminRotate(token,body){await requireAdmin(token);const id=safeKey(body.id),c=await get(`companies/${id}`);if(!c||c.deleted)throw new CloudError(404,'COMPANY_NOT_FOUND','الشركة غير موجودة');const key=`GHZ-${randomHex(4).toUpperCase()}-${randomHex(4).toUpperCase()}-${randomHex(4).toUpperCase()}-${randomHex(4).toUpperCase()}`,hash=await sha256(key),updates={[`companies/${id}`]:{...c,licenseKeyHash:hash,keyHint:key.slice(-4),authVersion:n(c.authVersion)+1,updatedAt:Date.now()},[`companyKeys/${hash}`]:{companyId:id}};if(c.licenseKeyHash)updates[`companyKeys/${c.licenseKeyHash}`]=null;await patchMany(updates);return {ok:true,licenseKey:key,keyHint:key.slice(-4)};}
  async function adminPasswordChange(token,body){await requireAdmin(token);if(!(await verifyLocalAdminPassword(String(body.currentPassword||''))))throw new CloudError(403,'ADMIN_PASSWORD_WRONG','كلمة المرور الحالية غير صحيحة');const p=String(body.newPassword||'');if(p.length<4)throw new CloudError(400,'BAD_PASSWORD','كلمة المرور الجديدة قصيرة');writeLocalAdminCredential(await makePassword(p));return {ok:true,local:true};}

  async function login(body){const key=String(body.companyKey||'').trim().toUpperCase(),username=normUser(body.username),password=String(body.password||'');if(!key||!username||!password)throw new CloudError(400,'MISSING_FIELDS','أدخل مفتاح الشركة واسم المستخدم وكلمة المرور');const keyHash=await sha256(key),idx=await get(`companyKeys/${keyHash}`);if(!idx?.companyId)throw new CloudError(403,'COMPANY_DELETED','مفتاح الشركة غير صالح');const company=await get(`companies/${safeKey(idx.companyId)}`),now=Date.now();if(!company||company.deleted)throw new CloudError(403,'COMPANY_DELETED','مفتاح الشركة غير صالح');if(company.status!=='active')throw new CloudError(403,'COMPANY_STOPPED','مفتاح الشركة موقوف');if(n(company.expiresAt)<=now)throw new CloudError(403,'LICENSE_EXPIRED','الدخول غير متاح. راجع إدارة النظام.');const userId=await get(`usernames/${safeKey(company.id)}/${safeKey(username)}`),user=userId?await get(`users/${safeKey(company.id)}/${safeKey(userId)}`):null;if(!user||user.status!=='active'||!(await verifyPassword(password,user.password)))throw new CloudError(403,'LOGIN_FAILED','بيانات الدخول غير صحيحة أو المستخدم موقوف');user.lastLoginAt=now;user.updatedAt=now;const token=`ses_${randomHex(48)}`,hash=await sha256(token),expiresAt=Math.min(now+SESSION_MS,n(company.expiresAt));await patchMany({[`users/${safeKey(company.id)}/${safeKey(user.id)}`]:user,[`sessions/${hash}`]:{companyId:company.id,userId:user.id,companyAuthVersion:n(company.authVersion),expiresAt,createdAt:now}});return {ok:true,token,sessionExpiresAt:expiresAt,company:publicCompany(company),user:publicUser(user)};}
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
  async function queryByFieldBatch(cid,specs){
    await ensureSchema();
    const statements=[];
    for(const spec of specs||[]){
      const dataset=safeDataset(spec.dataset),expr=orderExpr(`record/${spec.field}`);if(!expr)throw new CloudError(400,'BAD_QUERY','حقل بحث غير صالح');
      const where=['parent_path=?',`COALESCE(CAST(json_extract(payload_json,'$.deleted') AS INTEGER),0)=0`],args=[`data/${safeKey(cid)}/${dataset}`];
      if(spec.value!==undefined){where.push(`${expr} = ?`);args.push(spec.value);}
      if(spec.startAt!==undefined){where.push(`${expr} >= ?`);args.push(spec.startAt);}
      if(spec.endAt!==undefined){where.push(`${expr} <= ?`);args.push(spec.endAt);}
      const last=Number(spec.limitToLast||0)>0,limit=Math.max(0,Number(spec.limitToFirst||spec.limitToLast||0));
      let sql=`SELECT payload_json FROM ${KV_TABLE} WHERE ${where.join(' AND ')} ORDER BY ${expr} ${last?'DESC':'ASC'}, item_key ${last?'DESC':'ASC'}`;
      if(limit){sql+=' LIMIT ?';args.push(limit);}
      statements.push(stmt(sql,args));
    }
    if(!statements.length)return [];
    const results=await pipeline(statements);
    return results.map((r,i)=>{let rows=rowsOf(r).map(x=>unwrap(parsePayload(x.payload_json))).filter(Boolean);if(Number(specs[i]?.limitToLast||0)>0)rows=rows.reverse();return rows;});
  }
  async function queryByField(cid,dataset,field,value,{startAt,endAt,limitToLast,limitToFirst}={}){
    try{return (await queryByFieldBatch(cid,[{dataset,field,value,startAt,endAt,limitToLast,limitToFirst}]))[0]||[];}
    catch{const out=[];await scanDataset(cid,dataset,r=>{const v=r[field];if(value!==undefined&&String(v)!==String(value))return;if(startAt!==undefined&&String(v)<String(startAt))return;if(endAt!==undefined&&String(v)>String(endAt))return;out.push(r);});return out;}
  }
  async function recordsSearch(auth,url){const dataset=safeDataset(url.searchParams.get('dataset'));requireDatasetRead(auth,dataset);const q=normText(url.searchParams.get('q')),limit=clamp(url.searchParams.get('limit'),1,60),parent=`data/${safeKey(auth.companyId)}/${dataset}`;await ensureSchema();const like=`%${q.replace(/[%_]/g,m=>'\\'+m)}%`,sql=`SELECT payload_json FROM ${KV_TABLE} WHERE parent_path=? AND COALESCE(CAST(json_extract(payload_json,'$.deleted') AS INTEGER),0)=0 ${q?"AND lower(COALESCE(json_extract(payload_json,'$.searchText'),'')) LIKE ? ESCAPE '\\'":''} ORDER BY json_extract(payload_json,'$.sortKey') ASC LIMIT ?`,args=q?[parent,like,limit]:[parent,limit],[r]=await pipeline([stmt(sql,args)]),rows=rowsOf(r).map(x=>unwrap(parsePayload(x.payload_json))).filter(Boolean);return {rows};}
  async function recordsFilter(auth,url){
    const dataset=safeDataset(url.searchParams.get('dataset'));requireDatasetRead(auth,dataset);await ensureSchema();
    const limit=clamp(url.searchParams.get('limit'),1,100),parent=`data/${safeKey(auth.companyId)}/${dataset}`,start=String(url.searchParams.get('start')||''),end=String(url.searchParams.get('end')||''),code=String(url.searchParams.get('code')||'').trim(),beforeSortTs=Number(url.searchParams.get('beforeSortTs')),beforeId=String(url.searchParams.get('beforeId')||''),cursor=(Number.isFinite(beforeSortTs)&&beforeId)?sortKey(beforeSortTs,beforeId):'';
    const where=['parent_path=?',`COALESCE(CAST(json_extract(payload_json,'$.deleted') AS INTEGER),0)=0`],args=[parent];
    if(start){where.push(`json_extract(payload_json,'$.record.date') >= ?`);args.push(start);}
    if(end){where.push(`json_extract(payload_json,'$.record.date') <= ?`);args.push(end);}
    if(code){where.push(`CAST(json_extract(payload_json,'$.record.productCode') AS TEXT) = ?`);args.push(code);}
    if(cursor){where.push(`json_extract(payload_json,'$.sortKey') > ?`);args.push(cursor);}
    const sql=`SELECT payload_json FROM ${KV_TABLE} WHERE ${where.join(' AND ')} ORDER BY json_extract(payload_json,'$.sortKey') ASC LIMIT ?`;args.push(limit+1);
    const [r]=await pipeline([stmt(sql,args)]);let rows=rowsOf(r).map(x=>unwrap(parsePayload(x.payload_json))).filter(Boolean),hasMore=rows.length>limit;if(hasMore)rows=rows.slice(0,limit);const last=rows[rows.length-1];
    return {rows,hasMore,next:last?{sortTs:n(last.sortTs),id:String(last.id)}:null};
  }
  async function recordsChanges(auth,url){const dataset=safeDataset(url.searchParams.get('dataset'));requireDatasetRead(auth,dataset);const since=Math.max(0,n(url.searchParams.get('since'))),limit=clamp(url.searchParams.get('limit'),1,200);let obj;try{obj=await get(`data/${safeKey(auth.companyId)}/${dataset}`,{orderBy:'updatedAt',startAt:since+1,limitToFirst:limit});}catch{obj=await get(`data/${safeKey(auth.companyId)}/${dataset}`);}const arr=wrappers(obj).filter(w=>n(w.updatedAt)>since).sort((a,b)=>n(a.updatedAt)-n(b.updatedAt)).slice(0,limit);return {rows:arr.map(w=>({id:w.id,deleted:!!w.deleted,updatedAt:n(w.updatedAt),record:w.deleted?null:unwrap(w)}))};}

  const purchaseValueOf=r=>n(r?.price)*n(r?.qty)-n(r?.discount);
  const saleValueOf=r=>n(r?.price)*n(r?.qty);
  function summaryAmount(dataset,r){if(!r)return 0;if(dataset==='sales')return saleValueOf(r);if(dataset==='purchases')return purchaseValueOf(r);if(dataset==='fx')return n(r.usd)*(n(r.buyRate)||n(r.exchangeRate));return n(r.amount);}
  function summaryImpact(dataset,r,sign=1){if(!r)return {count:0,total:0,bank:0,cash:0};const a=summaryAmount(dataset,r)*sign,m=String(r.method||r.type||'');return {count:sign,total:a,bank:m.includes('بنكي')?a:0,cash:m.includes('نقدي')?a:0};}
  function applySummary(stat,d){const out={...(stat||{}),aggVersion:2,count:Math.max(0,n(stat?.count)+n(d.count)),total:n(stat?.total)+n(d.total),bank:n(stat?.bank)+n(d.bank),cash:n(stat?.cash)+n(d.cash),updatedAt:Date.now()};for(const k of ['total','bank','cash'])if(Math.abs(out[k])<1e-9)out[k]=0;return out;}
  async function rebuildDatasetSummary(cid,dataset){let stat={aggVersion:2,count:0,total:0,bank:0,cash:0,updatedAt:Date.now()};await scanDataset(cid,dataset,r=>{stat=applySummary(stat,summaryImpact(dataset,r,1));});await put(`derived/${safeKey(cid)}/summary/${dataset}`,stat);return stat;}
  async function getDatasetSummaries(cid,datasets){
    const names=[...new Set((datasets||[]).map(safeDataset))],paths=names.map(d=>`derived/${safeKey(cid)}/summary/${d}`),map=await getExactMany(paths),out=[];
    for(let i=0;i<names.length;i++){const stat=map.get(paths[i]);out.push(stat?.aggVersion===2?stat:await rebuildDatasetSummary(cid,names[i]));}
    return out;
  }
  async function getDatasetSummary(cid,dataset){return (await getDatasetSummaries(cid,[dataset]))[0];}

  function inventoryImpact(dataset,r,sign=1){if(!r)return null;let code='';const d={openingQty:0,openingValue:0,buyQty:0,buyValue:0,soldQty:0,salesValue:0};if(dataset==='products'){code=String(r.code||'').trim();d.openingQty=sign*n(r.openingQty);d.openingValue=sign*n(r.openingQty)*n(r.openingUnitCost);d.name=r.name||'';d.category=r.category||'غير مصنف';}else if(dataset==='purchases'){code=String(r.productCode||'').trim();d.buyQty=sign*n(r.qty);d.buyValue=sign*purchaseValueOf(r);}else if(dataset==='sales'){code=String(r.productCode||'').trim();d.soldQty=sign*n(r.qty);d.salesValue=sign*saleValueOf(r);}if(!code)return null;d.code=code;return d;}
  function mergeImpact(map,d){if(!d)return;const prev=map.get(d.code)||{code:d.code,openingQty:0,openingValue:0,buyQty:0,buyValue:0,soldQty:0,salesValue:0};for(const k of ['openingQty','openingValue','buyQty','buyValue','soldQty','salesValue'])prev[k]=n(prev[k])+n(d[k]);if(d.name!==undefined)prev.name=d.name;if(d.category!==undefined)prev.category=d.category;map.set(d.code,prev);}
  function finalizeInventory(stat){const openingQty=n(stat.openingQty),openingValue=n(stat.openingValue),buyQty=n(stat.buyQty),buyValue=n(stat.buyValue),soldQty=n(stat.soldQty),salesValue=n(stat.salesValue),purchasedQty=openingQty+buyQty,purchaseValue=openingValue+buyValue,avgCost=purchasedQty?purchaseValue/purchasedQty:0,remainingQty=purchasedQty-soldQty;return {...stat,aggVersion:2,purchasedQty,purchaseValue,salesValue,soldQty,avgCost,remainingQty,endingInventory:remainingQty*avgCost,profit:salesValue-soldQty*avgCost,updatedAt:Date.now()};}
  function applyInventoryImpact(stat,d){const next={...(stat||{}),aggVersion:2,code:d.code||stat?.code||'',name:d.name!==undefined?d.name:(stat?.name||''),category:d.category!==undefined?d.category:(stat?.category||'غير مصنف')};for(const k of ['openingQty','openingValue','buyQty','buyValue','soldQty','salesValue'])next[k]=n(stat?.[k])+n(d[k]);return finalizeInventory(next);}
  async function rebuildInventory(cid,code){code=String(code||'').trim();if(!code)return null;const sets=await queryByFieldBatch(cid,[{dataset:'products',field:'code',value:code},{dataset:'purchases',field:'productCode',value:code},{dataset:'sales',field:'productCode',value:code}]),products=sets[0]||[],purchases=sets[1]||[],sales=sets[2]||[],p=products[0]||{},stat=finalizeInventory({aggVersion:2,code,name:p.name||'',category:p.category||'غير مصنف',openingQty:n(p.openingQty),openingValue:n(p.openingQty)*n(p.openingUnitCost),buyQty:purchases.reduce((s,x)=>s+n(x.qty),0),buyValue:purchases.reduce((s,x)=>s+purchaseValueOf(x),0),soldQty:sales.reduce((s,x)=>s+n(x.qty),0),salesValue:sales.reduce((s,x)=>s+saleValueOf(x),0)});await put(`derived/${safeKey(cid)}/inventory/${safeKey(await sha256(code))}`,stat);return stat;}

  function supplierImpact(dataset,r,sign=1){if(!r)return null;let code='',due=0,bank=0,cash=0,name;if(dataset==='suppliers'){code=String(r.code||'').trim();name=r.name||'';}else if(dataset==='purchases'){code=String(r.supplierCode||'').trim();due=sign*purchaseValueOf(r);}else if(dataset==='payments'){code=String(r.supplierCode||'').trim();const a=sign*n(r.amount);if(r.method==='دفع بنكي')bank=a;else if(r.method==='دفع نقدي')cash=a;}if(!code)return null;return {code,due,bank,cash,name};}
  function mergeSupplierImpact(map,d){if(!d)return;const prev=map.get(d.code)||{code:d.code,due:0,bank:0,cash:0};for(const k of ['due','bank','cash'])prev[k]=n(prev[k])+n(d[k]);if(d.name!==undefined)prev.name=d.name;map.set(d.code,prev);}
  function applySupplierImpact(stat,d){const due=n(stat?.due)+n(d.due),bank=n(stat?.bank)+n(d.bank),cash=n(stat?.cash)+n(d.cash);return {...(stat||{}),aggVersion:2,code:d.code||stat?.code||'',name:d.name!==undefined?d.name:(stat?.name||''),due,bank,cash,paid:bank+cash,balance:due-bank-cash,updatedAt:Date.now()};}
  async function rebuildSupplier(cid,code){code=String(code||'').trim();if(!code)return null;const sets=await queryByFieldBatch(cid,[{dataset:'suppliers',field:'code',value:code},{dataset:'purchases',field:'supplierCode',value:code},{dataset:'payments',field:'supplierCode',value:code}]),suppliers=sets[0]||[],purchases=sets[1]||[],payments=sets[2]||[],s=suppliers[0]||{},due=purchases.reduce((a,x)=>a+purchaseValueOf(x),0),bank=payments.filter(x=>x.method==='دفع بنكي').reduce((a,x)=>a+n(x.amount),0),cash=payments.filter(x=>x.method==='دفع نقدي').reduce((a,x)=>a+n(x.amount),0),stat={aggVersion:2,code,name:s.name||'',due,bank,cash,paid:bank+cash,balance:due-bank-cash,updatedAt:Date.now()};await put(`derived/${safeKey(cid)}/suppliers/${safeKey(await sha256(code))}`,stat);return stat;}

  async function recordsWrite(auth,body){
    const dataset=safeDataset(body.dataset),module=moduleForDataset(dataset),id=String(body.id||body.record?.id||'');if(!id)throw new CloudError(400,'MISSING_ID','معرف السجل مطلوب');
    const path=recordPath(auth.companyId,dataset,id),old=await get(path),exists=!!old&&!old.deleted,action=body.action==='delete'?'delete':'set',record=body.record||{},updatedAt=Math.max(1,n(record.updatedAt)||Date.now()),sTs=Math.max(1,n(record.sortTs)||updatedAt);if(old&&n(old.updatedAt)>updatedAt)return {ok:true,ignored:true,updatedAt:n(old.updatedAt)};
    if(old&&n(old.updatedAt)===updatedAt){
      if(!(hasModule(auth,module,'create')||hasModule(auth,module,'edit')||hasModule(auth,module,'delete')))throw new CloudError(403,'NO_PERMISSION','لا تملك صلاحية تنفيذ هذه العملية');
      const repair=old.repair||{};for(const code of [...new Set(repair.productCodes||[])])await rebuildInventory(auth.companyId,code).catch(()=>{});for(const code of [...new Set(repair.supplierCodes||[])])await rebuildSupplier(auth.companyId,code).catch(()=>{});await rebuildDatasetSummary(auth.companyId,dataset).catch(()=>{});return {ok:true,repaired:true,updatedAt};
    }
    const oldRec=old&&!old.deleted?unwrap(old):null,newRec=action==='delete'?null:{...record,id,updatedAt,sortTs:sTs};
    if(action==='delete')requireModule(auth,module,'delete');else requireModule(auth,module,exists?'edit':'create');

    const invImpacts=new Map(),supImpacts=new Map();mergeImpact(invImpacts,inventoryImpact(dataset,oldRec,-1));mergeImpact(invImpacts,inventoryImpact(dataset,newRec,1));mergeSupplierImpact(supImpacts,supplierImpact(dataset,oldRec,-1));mergeSupplierImpact(supImpacts,supplierImpact(dataset,newRec,1));
    const invItems=await Promise.all([...invImpacts.keys()].map(async code=>({code,path:`derived/${safeKey(auth.companyId)}/inventory/${safeKey(await sha256(code))}`}))),supItems=await Promise.all([...supImpacts.keys()].map(async code=>({code,path:`derived/${safeKey(auth.companyId)}/suppliers/${safeKey(await sha256(code))}`}))),summaryPath=`derived/${safeKey(auth.companyId)}/summary/${dataset}`;
    const prepared=await getExactMany([...invItems.map(x=>x.path),...supItems.map(x=>x.path),summaryPath]),summaryBefore=prepared.get(summaryPath),summaryDelta={count:0,total:0,bank:0,cash:0};for(const d of [summaryImpact(dataset,oldRec,-1),summaryImpact(dataset,newRec,1)])for(const k of ['count','total','bank','cash'])summaryDelta[k]+=n(d[k]);

    const updates={},invRebuild=[],supRebuild=[],repair={productCodes:[...invImpacts.keys()],supplierCodes:[...supImpacts.keys()]};
    if(action==='delete')updates[path]={id,deleted:true,record:{},repair,updatedAt,sortTs:sTs,sortKey:sortKey(sTs,id),searchText:''};
    else{const rec={...record,id,updatedAt,sortTs:sTs},searchText=normText(record.searchText||[record.name,record.code,record.category,record.unit,record.productName,record.productCode,record.supplierName,record.supplierCode,record.type,record.method,record.note].filter(Boolean).join(' ')).slice(0,3000);rec.searchText=searchText;updates[path]={id,deleted:false,record:rec,repair,updatedAt,sortTs:sTs,sortKey:sortKey(sTs,id),searchText};}
    for(const item of invItems){const stat=prepared.get(item.path),d=invImpacts.get(item.code);if(stat?.aggVersion===2)updates[item.path]=applyInventoryImpact(stat,d);else invRebuild.push(item.code);}
    for(const item of supItems){const stat=prepared.get(item.path),d=supImpacts.get(item.code);if(stat?.aggVersion===2)updates[item.path]=applySupplierImpact(stat,d);else supRebuild.push(item.code);}
    if(summaryBefore?.aggVersion===2)updates[summaryPath]=applySummary(summaryBefore,summaryDelta);

    await patchMany(updates);
    for(const c of invRebuild)await rebuildInventory(auth.companyId,c).catch(()=>{});
    for(const c of supRebuild)await rebuildSupplier(auth.companyId,c).catch(()=>{});
    if(summaryBefore?.aggVersion!==2)await rebuildDatasetSummary(auth.companyId,dataset).catch(()=>{});
    return {ok:true,deleted:action==='delete',updatedAt};
  }

  async function metricSummary(auth,url){const dataset=safeDataset(url.searchParams.get('dataset'));requireDatasetRead(auth,dataset);const s=await getDatasetSummary(auth.companyId,dataset);return {count:n(s.count),total:n(s.total),bank:n(s.bank),cash:n(s.cash)};}
  async function metricInventory(auth,url){requireModule(auth,'inventory','view');const codes=String(url.searchParams.get('codes')||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,60),stats={};if(!codes.length)return {stats};const items=await Promise.all(codes.map(async code=>({code,path:`derived/${safeKey(auth.companyId)}/inventory/${safeKey(await sha256(code))}`}))),map=await getExactMany(items.map(x=>x.path));for(const item of items){let s=map.get(item.path);if(!s||s.aggVersion!==2)s=await rebuildInventory(auth.companyId,item.code).catch(()=>null);if(s)stats[item.code]={purchasedQty:n(s.purchasedQty),purchaseValue:n(s.purchaseValue),soldQty:n(s.soldQty),salesValue:n(s.salesValue),avgCost:n(s.avgCost),remainingQty:n(s.remainingQty),endingInventory:n(s.endingInventory),profit:n(s.profit)};}return {stats};}
  async function metricSuppliers(auth,url){requireModule(auth,'suppliers','view');const codes=String(url.searchParams.get('codes')||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,60),stats={};if(!codes.length)return {stats};const items=await Promise.all(codes.map(async code=>({code,path:`derived/${safeKey(auth.companyId)}/suppliers/${safeKey(await sha256(code))}`}))),map=await getExactMany(items.map(x=>x.path));for(const item of items){let s=map.get(item.path);if(!s||s.aggVersion!==2)s=await rebuildSupplier(auth.companyId,item.code).catch(()=>null);if(s)stats[item.code]={due:n(s.due),bank:n(s.bank),cash:n(s.cash),paid:n(s.paid),balance:n(s.balance)};}return {stats};}
  async function inventoryAvgMap(cid,codes){const wanted=[...new Set((codes||[]).map(x=>String(x||'').trim()).filter(Boolean))],m={};if(!wanted.length)return m;const items=await Promise.all(wanted.map(async code=>({code,path:`derived/${safeKey(cid)}/inventory/${safeKey(await sha256(code))}`}))),map=await getExactMany(items.map(x=>x.path));for(const item of items){let s=map.get(item.path);if(!s||s.aggVersion!==2)s=await rebuildInventory(cid,item.code).catch(()=>null);if(s)m[item.code]=n(s.avgCost);}return m;}
  async function metricDashboard(auth,url){requireModule(auth,'dashboard','view');const year=String(url.searchParams.get('year')||new Date().getFullYear());if(!/^\d{4}$/.test(year))throw new CloudError(400,'BAD_YEAR','سنة غير صالحة');const by={};for(let i=1;i<=12;i++){const m=String(i).padStart(2,'0');by[m]={month:m,revenue:0,cogs:0,gross:0,expenses:0,net:0};}const sets=await queryByFieldBatch(auth.companyId,[{dataset:'sales',field:'date',startAt:`${year}-01-01`,endAt:`${year}-12-31`},{dataset:'expenses',field:'date',startAt:`${year}-01-01`,endAt:`${year}-12-31`}]),sales=sets[0]||[],expenses=sets[1]||[],avg=await inventoryAvgMap(auth.companyId,sales.map(r=>r.productCode));for(const r of sales){const m=String(r.date||'').slice(5,7);if(by[m]){by[m].revenue+=saleValueOf(r);by[m].cogs+=n(r.qty)*n(avg[String(r.productCode)]);}}for(const r of expenses){const m=String(r.date||'').slice(5,7);if(by[m])by[m].expenses+=n(r.amount);}for(const x of Object.values(by)){x.gross=x.revenue-x.cogs;x.net=x.gross-x.expenses;}return {months:Object.values(by)};}
  async function metricFinancial(auth,url){requireAnyView(auth,['balance','daily','comprehensive','income','analysis']);const start=String(url.searchParams.get('start')||'0000-01-01'),end=String(url.searchParams.get('end')||'9999-12-31'),names=['sales','purchases','expenses','debtors','creditors','payments','fx'];if(start==='0000-01-01'&&end==='9999-12-31'){const sums=await getDatasetSummaries(auth.companyId,names),map=Object.fromEntries(names.map((d,i)=>[d,sums[i]])),revenue=n(map.sales.total),purchaseValue=n(map.purchases.total),expensesTotal=n(map.expenses.total);return {salesCount:n(map.sales.count),purchasesCount:n(map.purchases.count),expensesCount:n(map.expenses.count),debtorsCount:n(map.debtors.count),creditorsCount:n(map.creditors.count),paymentsCount:n(map.payments.count),fxCount:n(map.fx.count),revenue,purchaseValue,expensesTotal,debtorsTotal:n(map.debtors.total),creditorsTotal:n(map.creditors.total),paymentsTotal:n(map.payments.total),gross:revenue-purchaseValue,net:revenue-purchaseValue-expensesTotal};}const specs=names.map(dataset=>({dataset,field:'date',startAt:start,endAt:end})),sets=await queryByFieldBatch(auth.companyId,specs),map=Object.fromEntries(names.map((d,i)=>[d,sets[i]||[]])),sum=(arr,f)=>arr.reduce((a,x)=>a+f(x),0),revenue=sum(map.sales,saleValueOf),purchaseValue=sum(map.purchases,purchaseValueOf),expensesTotal=sum(map.expenses,x=>n(x.amount));return {salesCount:map.sales.length,purchasesCount:map.purchases.length,expensesCount:map.expenses.length,debtorsCount:map.debtors.length,creditorsCount:map.creditors.length,paymentsCount:map.payments.length,fxCount:map.fx.length,revenue,purchaseValue,expensesTotal,debtorsTotal:sum(map.debtors,x=>n(x.amount)),creditorsTotal:sum(map.creditors,x=>n(x.amount)),paymentsTotal:sum(map.payments,x=>n(x.amount)),gross:revenue-purchaseValue,net:revenue-purchaseValue-expensesTotal};}
  async function metricBank(auth,url){requireModule(auth,'bank','view');const limit=clamp(url.searchParams.get('limit'),1,80),sample=Math.min(320,Math.max(40,limit*4)),names=['sales','payments','expenses','debtors','creditors'],sums=await getDatasetSummaries(auth.companyId,names),summary=Object.fromEntries(names.map((d,i)=>[d,sums[i]])),sets=await queryByFieldBatch(auth.companyId,names.map(dataset=>({dataset,field:'date',startAt:'0000-01-01',endAt:'9999-12-31',limitToLast:sample}))),rows=[],totalIn=n(summary.sales.bank)+n(summary.debtors.bank),totalOut=n(summary.payments.bank)+n(summary.expenses.bank)+n(summary.creditors.bank);sets[0].filter(r=>r.type==='بيع بنكي').forEach(r=>rows.push({date:r.date||'',desc:`بيع - ${r.productName||r.productCode||''}`,in:saleValueOf(r),out:0}));sets[1].filter(r=>r.method==='دفع بنكي').forEach(r=>rows.push({date:r.date||'',desc:`دفعة مورد - ${r.supplierName||r.supplierCode||''}`,in:0,out:n(r.amount)}));sets[2].filter(r=>r.type==='مصروفات بنكية').forEach(r=>rows.push({date:r.date||'',desc:r.note||'مصروف بنكي',in:0,out:n(r.amount)}));sets[3].filter(r=>r.method==='بنكي').forEach(r=>rows.push({date:r.date||'',desc:`مدين - ${r.name||''}`,in:n(r.amount),out:0}));sets[4].filter(r=>r.method==='بنكي').forEach(r=>rows.push({date:r.date||'',desc:`دائن - ${r.name||''}`,in:0,out:n(r.amount)}));rows.sort((a,b)=>String(b.date).localeCompare(String(a.date)));return {rows:rows.slice(0,limit),totalIn,totalOut};}
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
    if(p==='/records/filter'&&method==='GET')return recordsFilter(auth,url);
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
  window.CASH_TOP_DB_CONFIG = DB_CONFIG;
  window.CashTopCloud = Object.freeze({request,config:DB_CONFIG,dbBase:dbEndpoint(),appPath:APP_PATH,ensureSchema,ping});
})();
