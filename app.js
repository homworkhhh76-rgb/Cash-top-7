(() => {
  'use strict';

  const APP_VERSION = '6.1.0-direct-db-admin-local';
  const DB_NAME_BASE = 'general-sales-company-v4';
  const DB_VERSION = 1;
  const AUTH_KEY = 'general-sales-auth-v7-direct';
  const LOGIN_HINT_KEY = 'general-sales-login-hint-v4';
  let authState = null;
  let validationTimer = null;
  const PAGE_SIZE = () => window.innerWidth < 700 ? 20 : 40;
  const LOCAL_CACHE_LIMITS = Object.freeze({products:520,suppliers:360,purchases:420,sales:620,payments:320,debtors:280,creditors:280,expenses:320,fx:240});
  const CACHE_SOFT_RATIO = 0.72;
  const CACHE_EMERGENCY_RATIO = 0.86;
  const DATASETS = ['products','suppliers','purchases','sales','payments','debtors','creditors','expenses','fx'];
  const OLD_STORAGE_KEYS = ['ghazal-shoes-webapp-v1'];
  const META_KEY_BASE = 'general-sales-meta-v4';
  const PAGE_KEY_BASE = 'general-sales-page-v4';
  const metaKey = () => `${META_KEY_BASE}:${authState?.company?.id || 'guest'}`;
  const pageKey = () => `${PAGE_KEY_BASE}:${authState?.company?.id || 'guest'}`;
  const iconPaths = {
    home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/>',
    package:'<path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/><path d="M3 8v8l9 5 9-5V8"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    ledger:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M8 7h8M8 11h8"/>',
    cart:'<circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M3 4h2l2.4 10.4a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 2-1.6L22 7H6"/>',
    receipt:'<path d="M6 2h12v20l-3-2-3 2-3-2-3 2Z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    bank:'<path d="m3 10 9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>',
    scale:'<path d="M12 3v18M5 6h14"/><path d="m5 6-3 6h6L5 6Zm14 0-3 6h6l-3-6Z"/><path d="M8 21h8"/>',
    wallet:'<path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10H5a3 3 0 0 1-3-3V6"/><path d="M16 13h4"/>',
    chart:'<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    report:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    currency:'<circle cx="12" cy="12" r="9"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 6v12"/>',
    analysis:'<path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/>',
    download:'<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    upload:'<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>',
    database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    printer:'<path d="M6 9V2h12v7"/><rect x="6" y="14" width="12" height="8"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>',
    trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 16H6L5 6M10 11v6M14 11v6"/>',
    sync:'<path d="M20 7h-5V2"/><path d="M20 7a8 8 0 1 0 2 5"/><path d="M4 17h5v5"/><path d="M4 17a8 8 0 0 0 14-5"/>',
    cloudSync:'<path d="M17.5 19H7a5 5 0 0 1-.8-9.94A7 7 0 0 1 19.4 7.2 4.5 4.5 0 0 1 17.5 19Z"/><path d="m9 13 3-3 3 3"/><path d="M12 10v6"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1a1.7 1.7 0 0 0-1.4-1.5 1.7 1.7 0 0 0-1.9.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 3.8 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2V9.6h.1A1.7 1.7 0 0 0 3.6 8.2a1.7 1.7 0 0 0-.34-1.9l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8 3.8a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2h4v.1a1.7 1.7 0 0 0 1.4 1.5 1.7 1.7 0 0 0 1.9-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.2 8c.24.37.47.7.6 1 .13.3.2.65.2 1v.1h2v4h-.1a1.7 1.7 0 0 0-1.5.9Z"/>',
    logout:'<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-6"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    close:'<path d="M6 6l12 12M18 6 6 18"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    chevron:'<path d="m9 18 6-6-6-6"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'
  };
  const svg = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.report}</svg>`;

  const pages = [
    ['dashboard','لوحة التحكم','home'],['inventory','المخزن','package'],['suppliers','الموردون','users'],['debtors','المدينون','ledger'],
    ['purchases','المشتريات','cart'],['sales','المبيعات','receipt'],['payments','المدفوعات','card'],['bank','حساب البنك','bank'],
    ['creditors','الدائنون','ledger'],['balance','الميزانية العمومية','scale'],['expenses','المصروفات','wallet'],['stockCharts','الرسومات البيانية للمخزن','chart'],
    ['daily','التقرير اليومي','calendar'],['comprehensive','التقرير الشامل','report'],['income','قائمة الدخل','report'],['fx','العملات الأجنبية','currency'],['analysis','التحليل المالي','analysis'],
    ['users','المستخدمون والصلاحيات','shield'],['settings','إعدادات الشركة','settings']
  ];

  const schemas = {
    product:{title:'صنف',dataset:'products',fields:[{name:'code',label:'كود الصنف',required:true},{name:'name',label:'اسم الصنف',required:true},{name:'unit',label:'الوحدة',required:true,default:'قطعة'},{name:'category',label:'الفئة',type:'comboFree',required:true},{name:'openingQty',label:'كمية أول المدة',type:'number',step:'0.01',default:0},{name:'openingUnitCost',label:'تكلفة الوحدة لأول المدة',type:'number',step:'0.01',default:0}]},
    supplier:{title:'مورد',dataset:'suppliers',fields:[{name:'code',label:'رقم المورد',required:true},{name:'name',label:'اسم المورد',required:true}]},
    purchase:{title:'مشتريات',dataset:'purchases',fields:[{name:'date',label:'التاريخ',type:'date',required:true},{name:'supplierCode',label:'المورد',type:'dynamicCombo',source:'suppliers',required:true},{name:'productCode',label:'المنتج',type:'dynamicCombo',source:'products',required:true},{name:'price',label:'السعر',type:'number',step:'0.01',required:true},{name:'qty',label:'الكمية',type:'number',step:'0.01',required:true},{name:'discount',label:'الخصم',type:'number',step:'0.01',default:0}]},
    sale:{title:'مبيعات',dataset:'sales',fields:[{name:'date',label:'التاريخ',type:'date',required:true},{name:'type',label:'نوع البيع',type:'combo',options:['بيع نقدي','بيع بنكي','بيع عالحساب'],required:true},{name:'productCode',label:'المنتج',type:'dynamicCombo',source:'products',required:true},{name:'price',label:'سعر البيع',type:'number',step:'0.01',required:true},{name:'qty',label:'الكمية',type:'number',step:'0.01',required:true},{name:'note',label:'البيان',type:'textarea',full:true}]},
    payment:{title:'دفعة',dataset:'payments',fields:[{name:'date',label:'التاريخ',type:'date',required:true},{name:'supplierCode',label:'المورد',type:'dynamicCombo',source:'suppliers',required:true},{name:'method',label:'طريقة الدفع',type:'combo',options:['دفع نقدي','دفع بنكي'],required:true},{name:'amount',label:'المبلغ',type:'number',step:'0.01',required:true}]},
    debtor:{title:'حركة مدين',dataset:'debtors',fields:[{name:'date',label:'التاريخ',type:'date',required:true},{name:'name',label:'اسم الزبون / الجهة',required:true},{name:'method',label:'طريقة الدفع',type:'combo',options:['بنكي','نقدي'],required:true},{name:'amount',label:'المبلغ',type:'number',step:'0.01',required:true},{name:'note',label:'الملاحظات',type:'textarea',full:true}]},
    creditor:{title:'حركة دائن',dataset:'creditors',fields:[{name:'date',label:'التاريخ',type:'date',required:true},{name:'name',label:'اسم الجهة',required:true},{name:'method',label:'طريقة الدفع',type:'combo',options:['بنكي','نقدي'],required:true},{name:'amount',label:'المبلغ',type:'number',step:'0.01',required:true},{name:'note',label:'الملاحظات',type:'textarea',full:true}]},
    expense:{title:'مصروف',dataset:'expenses',fields:[{name:'date',label:'التاريخ',type:'date',required:true},{name:'type',label:'نوع المصروف',type:'combo',options:['مصروفات نقدية','مصروفات بنكية'],required:true},{name:'amount',label:'المبلغ',type:'number',step:'0.01',required:true},{name:'note',label:'البيان',type:'textarea',full:true}]},
    fx:{title:'حركة عملة',dataset:'fx',fields:[{name:'date',label:'التاريخ',type:'date',required:true},{name:'type',label:'نوع الحركة',type:'combo',options:['عملية شراء','عملية بيع'],required:true},{name:'usd',label:'قيمة الدولار ($)',type:'number',step:'0.01',required:true},{name:'method',label:'طريقة الدفع',type:'combo',options:['نقدي','بنكي'],required:true},{name:'buyRate',label:'سعر الشراء',type:'number',step:'0.0001'},{name:'exchangeRate',label:'سعر الصرف',type:'number',step:'0.0001',required:true}]}
  };

  let dbHandle = null;
  let currentPage = 'dashboard';
  let deferredInstallPrompt = null;
  let renderToken = 0;
  let meta = null;
  let usersCache = [];
  const pagers = Object.create(null);
  const app = document.getElementById('app');
  const nav = document.getElementById('nav');
  const sidebar = document.getElementById('sidebar');
  const pageLabel = document.getElementById('currentPageLabel');
  const syncBtn = document.getElementById('syncBtn');
  const pendingBadge = document.getElementById('pendingBadge');
  const connectionText = document.getElementById('connectionText');
  const authScreen = document.getElementById('authScreen');
  const appShell = document.getElementById('appShell');
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');

  function loadCachedAuth(){ try{return JSON.parse(localStorage.getItem(AUTH_KEY)||'null');}catch{return null;} }
  function saveAuth(){ if(authState)localStorage.setItem(AUTH_KEY,JSON.stringify(authState)); else localStorage.removeItem(AUTH_KEY); }
  function authExpiryPassed(state=authState){return !state?.company?.expiresAt || Number(state.company.expiresAt)<=Date.now() || (state.sessionExpiresAt&&Number(state.sessionExpiresAt)<=Date.now());}
  function loginHint(){try{return JSON.parse(localStorage.getItem(LOGIN_HINT_KEY)||'{}');}catch{return{};}}
  function saveLoginHint(companyKey,username){localStorage.setItem(LOGIN_HINT_KEY,JSON.stringify({companyKey:String(companyKey||''),username:String(username||'')}));}
  function modulePerm(page,action='view'){if(!authState?.user)return false;if(authState.user.role==='owner')return true;return Boolean(authState.user.permissions?.modules?.[page]?.[action]);}
  function specialPerm(key){if(!authState?.user)return false;if(authState.user.role==='owner')return true;return Boolean(authState.user.permissions?.special?.[key]);}
  function pageAllowed(page){if(page==='users')return specialPerm('manageUsers');if(page==='settings')return modulePerm('settings','view')||specialPerm('manageSettings');return modulePerm(page,'view');}
  const typeModule={product:'inventory',supplier:'suppliers',purchase:'purchases',sale:'sales',payment:'payments',debtor:'debtors',creditor:'creditors',expense:'expenses',fx:'fx'};
  function typeAllowed(type,action){return modulePerm(typeModule[type]||type,action);}
  function visiblePages(){return pages.filter(([id])=>pageAllowed(id));}
  function setLoginMessage(msg,error=true){loginMessage.textContent=msg;loginMessage.classList.toggle('error',error);loginMessage.hidden=!msg;}
  function updateLoginStatus(){const dot=document.getElementById('loginStatusDot'),text=document.getElementById('loginStatusText');if(!dot||!text)return;dot.classList.toggle('online',navigator.onLine);dot.classList.toggle('offline',!navigator.onLine);text.textContent=navigator.onLine?'متصل - جاهز للدخول':'غير متصل - تسجيل الدخول الجديد يحتاج إنترنت';}
  function applyCompanyBranding(){if(!authState)return;const st=authState.company?.settings||{},name=st.companyName||authState.company?.name||'نظام المبيعات',logo=st.logoUrl||'logo.png';for(const id of ['companyLogo','headerLogo']){const img=document.getElementById(id);if(img){img.src=logo;img.onerror=()=>{img.onerror=null;img.src='logo.png';};}}document.getElementById('companyName').textContent=name;document.getElementById('headerCompanyName').textContent=name;document.getElementById('companySubline').textContent=[st.phone,st.address].filter(Boolean).join(' • ')||'المبيعات والحسابات والمخزون';const display=authState.user?.displayName||authState.user?.username||'المستخدم';document.getElementById('userDisplayName').textContent=display;document.getElementById('userRoleLabel').textContent=authState.user?.role==='owner'?'مالك الشركة':'موظف';document.getElementById('userAvatar').textContent=display.trim().slice(0,1)||'م';const left=Math.max(0,Number(authState.company?.expiresAt||0)-Date.now()),days=Math.ceil(left/86400000);document.getElementById('licenseRemaining').textContent=days>0?`متبقي ${days} يوم`:'انتهت المدة';}
  function showLogin(reason=''){appShell.hidden=true;authScreen.hidden=false;authScreen.style.display='grid';updateLoginStatus();const h=loginHint();document.getElementById('companyKeyInput').value=h.companyKey||'';document.getElementById('usernameInput').value=h.username||'';document.getElementById('passwordInput').value='';if(reason)setLoginMessage(reason,true);setTimeout(()=>document.getElementById(h.companyKey?'passwordInput':'companyKeyInput')?.focus(),50);}
  function showApp(){authScreen.hidden=true;authScreen.style.display='none';appShell.hidden=false;setLoginMessage('');applyCompanyBranding();}
  async function forceLogout(reason='انتهت جلسة تسجيل الدخول.'){clearInterval(validationTimer);validationTimer=null;if(dbHandle){try{dbHandle.close();}catch{}dbHandle=null;}authState=null;saveAuth();showLogin(reason);}
  function authFailureCode(code){return ['SESSION_REQUIRED','SESSION_EXPIRED','LICENSE_EXPIRED','COMPANY_STOPPED','COMPANY_DELETED','USER_STOPPED'].includes(code);}
  async function validateSession(silent=true){if(!authState)return false;if(authExpiryPassed()){await forceLogout('انتهت مدة المفتاح أو جلسة الدخول.');return false;}if(!navigator.onLine)return true;try{const d=await api('/auth/validate',{method:'POST',publicRequest:false,skipAuthFailure:true});authState.company=d.company;authState.user=d.user;saveAuth();applyCompanyBranding();if(!appShell.hidden){navInit();if(!pageAllowed(currentPage)){currentPage=visiblePages()[0]?.[0]||'dashboard';localStorage.setItem(pageKey(),currentPage);await renderCurrent(false);}}return true;}catch(e){if(e.authFailure){await forceLogout(e.message||'تم إنهاء صلاحية الدخول.');return false;}if(!silent)toast('تعذر التحقق من الجلسة، سيتم العمل من الكاش مؤقتًا.',true);return true;}}
  async function doLogin(companyKey,username,password){if(!navigator.onLine)throw new Error('يلزم اتصال بالإنترنت لتسجيل الدخول لأول مرة.');const d=await api('/auth/login',{method:'POST',body:JSON.stringify({companyKey,username,password}),publicRequest:true,skipAuthFailure:true});authState={token:d.token,sessionExpiresAt:d.sessionExpiresAt,company:d.company,user:d.user};saveAuth();saveLoginHint(companyKey,username);if(dbHandle){try{dbHandle.close();}catch{}dbHandle=null;}meta=loadMeta();currentPage=localStorage.getItem(pageKey())||'dashboard';if(!pageAllowed(currentPage))currentPage=visiblePages()[0]?.[0]||'dashboard';showApp();await startCompanyApp();}

  function loadMeta(){
    try { return Object.assign({capital:0,fxRate:3.7,dashboardYear:new Date().getFullYear(),selectedDate:today(),reportStart:today(),reportEnd:today(),remoteSeen:{},cache:{}}, JSON.parse(localStorage.getItem(metaKey())||'{}')); }
    catch { return {capital:0,fxRate:3.7,dashboardYear:new Date().getFullYear(),selectedDate:today(),reportStart:today(),reportEnd:today(),remoteSeen:{},cache:{}}; }
  }
  function saveMeta(){ localStorage.setItem(metaKey(), JSON.stringify(meta)); }
  function today(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function uid(){ return (crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`); }
  function esc(v){ return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function n(v){ const x=Number(v); return Number.isFinite(x)?x:0; }
  function money(v){ return n(v).toLocaleString('ar-EG',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function qty(v){ return n(v).toLocaleString('ar-EG',{maximumFractionDigits:2}); }
  function pct(v){ return `${(n(v)*100).toLocaleString('ar-EG',{maximumFractionDigits:2})}%`; }
  function purchaseNet(r){ return n(r.price)*n(r.qty)-n(r.discount); }
  function saleTotal(r){ return n(r.price)*n(r.qty); }
  function dateToSortTs(date){ const t=Date.parse(`${date||today()}T12:00:00`); return Number.isFinite(t)?t:Date.now(); }
  function searchText(r){ return `${r.name||''} ${r.code||''} ${r.category||''} ${r.unit||''} ${r.productName||''} ${r.productCode||''} ${r.supplierName||''} ${r.supplierCode||''} ${r.type||''} ${r.method||''} ${r.note||''}`.trim().toLowerCase(); }
  function normalizeRecord(dataset, r){
    const out={...r}; out.id=String(out.id||uid()); out.updatedAt=n(out.updatedAt)||Date.now(); out.sortTs=n(out.sortTs)||((out.date)?dateToSortTs(out.date):out.updatedAt); out.searchText=searchText(out);
    ['code','productCode','supplierCode'].forEach(k=>{ if(out[k]!==undefined && out[k]!==null) out[k]=String(out[k]); });
    return out;
  }

  function openDB(){
    if (dbHandle) return Promise.resolve(dbHandle);
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(`${DB_NAME_BASE}:${authState?.company?.id || 'guest'}`,DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        DATASETS.forEach(name=>{
          const s=db.createObjectStore(name,{keyPath:'id'});
          s.createIndex('sort',['sortTs','id']); s.createIndex('date','date'); s.createIndex('code','code'); s.createIndex('productCode','productCode'); s.createIndex('supplierCode','supplierCode'); s.createIndex('updatedAt','updatedAt'); s.createIndex('searchText','searchText');
        });
        const q=db.createObjectStore('syncQueue',{keyPath:'opKey'}); q.createIndex('nextTryAt','nextTryAt'); q.createIndex('createdAt','createdAt');
      };
      req.onsuccess=()=>{dbHandle=req.result;dbHandle.onversionchange=()=>{dbHandle.close();dbHandle=null;};resolve(dbHandle);}; req.onerror=()=>reject(req.error);
    });
  }
  async function tx(storeNames, mode, fn){ const db=await openDB(); return new Promise((resolve,reject)=>{ const t=db.transaction(storeNames,mode); let result; try{ result=fn(t); }catch(e){reject(e);return;} t.oncomplete=()=>resolve(result); t.onerror=()=>reject(t.error); t.onabort=()=>reject(t.error||new Error('IndexedDB transaction aborted')); }); }
  function isQuotaError(error){return Boolean(error && (error.name==='QuotaExceededError'||error.name==='NS_ERROR_DOM_QUOTA_REACHED'||String(error.message||'').toLowerCase().includes('quota')));}
  async function storageEstimate(){try{return await navigator.storage?.estimate?.()||null;}catch{return null;}}
  async function pendingRecordKeys(){
    const db=await openDB();
    return new Promise((resolve,reject)=>{const keys=new Set();const req=db.transaction('syncQueue').objectStore('syncQueue').openCursor();req.onsuccess=()=>{const c=req.result;if(!c){resolve(keys);return;}const v=c.value||{};if(v.dataset&&v.itemId)keys.add(`${v.dataset}:${v.itemId}`);c.continue();};req.onerror=()=>reject(req.error);});
  }
  async function storeCount(dataset){const db=await openDB();return new Promise((resolve,reject)=>{const r=db.transaction(dataset).objectStore(dataset).count();r.onsuccess=()=>resolve(n(r.result));r.onerror=()=>reject(r.error);});}
  async function trimStoreOldest(dataset,target,pending){
    const count=await storeCount(dataset),remove=Math.max(0,count-Math.max(0,target));if(!remove)return 0;
    const db=await openDB();return new Promise((resolve,reject)=>{let removed=0;const t=db.transaction(dataset,'readwrite'),idx=t.objectStore(dataset).index('updatedAt'),req=idx.openCursor(null,'next');req.onsuccess=()=>{const c=req.result;if(!c||removed>=remove)return;const row=c.value||{};if(!pending.has(`${dataset}:${row.id}`)){c.delete();removed++;}c.continue();};t.oncomplete=()=>resolve(removed);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||new Error('Cache cleanup aborted'));});
  }
  async function oldestCachedCandidates(dataset,pending,limit=40){
    const db=await openDB();return new Promise((resolve,reject)=>{const out=[];const req=db.transaction(dataset).objectStore(dataset).index('updatedAt').openCursor(null,'next');req.onsuccess=()=>{const c=req.result;if(!c||out.length>=limit){resolve(out);return;}const row=c.value||{};if(!pending.has(`${dataset}:${row.id}`))out.push({dataset,id:String(row.id),updatedAt:n(row.updatedAt)});c.continue();};req.onerror=()=>reject(req.error);});
  }
  async function deleteCachedCandidates(items){if(!items?.length)return 0;const grouped=new Map();for(const x of items){if(!grouped.has(x.dataset))grouped.set(x.dataset,[]);grouped.get(x.dataset).push(x.id);}const db=await openDB();const stores=[...grouped.keys()];return new Promise((resolve,reject)=>{const t=db.transaction(stores,'readwrite');let total=0;for(const [dataset,ids] of grouped){const st=t.objectStore(dataset);for(const id of ids){st.delete(id);total++;}}t.oncomplete=()=>resolve(total);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||new Error('Cache eviction aborted'));});}
  async function evictOldestCached(count,pending){let left=Math.max(0,n(count)),removed=0;while(left>0){const batches=await Promise.all(DATASETS.map(d=>oldestCachedCandidates(d,pending,Math.min(32,left))));const candidates=batches.flat().sort((a,b)=>(a.updatedAt-b.updatedAt)||a.id.localeCompare(b.id));if(!candidates.length)break;const chosen=candidates.slice(0,Math.min(left,96));const nRemoved=await deleteCachedCandidates(chosen);removed+=nRemoved;left-=nRemoved;if(!nRemoved)break;}return removed;}
  let cacheCleanupTimer=null,cacheCleanupRunning=false;
  function scheduleCacheCleanup(delay=1200){clearTimeout(cacheCleanupTimer);cacheCleanupTimer=setTimeout(()=>runCacheCleanup(false).catch(()=>{}),delay);}
  async function runCacheCleanup(force=false){
    if(cacheCleanupRunning)return;cacheCleanupRunning=true;
    try{
      const pending=await pendingRecordKeys();
      for(const dataset of DATASETS){const limit=LOCAL_CACHE_LIMITS[dataset]||300;await trimStoreOldest(dataset,limit,pending);}
      let est=await storageEstimate(),ratio=est?.quota?est.usage/est.quota:0;
      if(force||ratio>CACHE_SOFT_RATIO){
        for(let pass=0;pass<4&&(force||ratio>CACHE_SOFT_RATIO);pass++){await evictOldestCached(force?180:90,pending);est=await storageEstimate();ratio=est?.quota?est.usage/est.quota:0;if(!force&&ratio<=CACHE_SOFT_RATIO)break;if(force&&ratio<CACHE_EMERGENCY_RATIO)break;}
      }
    }finally{cacheCleanupRunning=false;}
  }
  async function getRecord(dataset,id){ const db=await openDB(); return new Promise((resolve,reject)=>{const r=db.transaction(dataset).objectStore(dataset).get(String(id));r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);}); }
  async function getByIndex(dataset,index,key){ const db=await openDB(); return new Promise((resolve,reject)=>{const r=db.transaction(dataset).objectStore(dataset).index(index).get(String(key));r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);}); }
  async function putRemoteRecord(dataset, record){ const rec=normalizeRecord(dataset,record); try{await tx([dataset],'readwrite',t=>t.objectStore(dataset).put(rec));}catch(e){if(!isQuotaError(e))throw e;await runCacheCleanup(true);await tx([dataset],'readwrite',t=>t.objectStore(dataset).put(rec));} return rec; }
  async function deleteRemoteRecord(dataset,id){ await tx([dataset],'readwrite',t=>t.objectStore(dataset).delete(String(id))); }
  async function putLocalRecord(dataset, record, queue=true){
    const rec=normalizeRecord(dataset,record); const stores=queue?[dataset,'syncQueue']:[dataset];
    const write=()=>tx(stores,'readwrite',t=>{ t.objectStore(dataset).put(rec); if(queue) t.objectStore('syncQueue').put({opKey:`${dataset}:${rec.id}`,dataset,itemId:rec.id,type:'set',data:rec,createdAt:Date.now(),tries:0,nextTryAt:0,lastError:''}); });
    try{await write();}catch(e){if(!isQuotaError(e))throw e;await runCacheCleanup(true);await write();}
    scheduleSync(); refreshPendingCount(); scheduleCacheCleanup(); return rec;
  }
  async function removeLocalRecord(dataset,id,queue=true){
    const stores=queue?[dataset,'syncQueue']:[dataset]; await tx(stores,'readwrite',t=>{ t.objectStore(dataset).delete(String(id)); if(queue)t.objectStore('syncQueue').put({opKey:`${dataset}:${id}`,dataset,itemId:String(id),type:'delete',data:{id:String(id),updatedAt:Date.now(),sortTs:Date.now()},createdAt:Date.now(),tries:0,nextTryAt:0,lastError:''}); }); scheduleSync();refreshPendingCount();
  }
  async function localPage(dataset,before=null,limit=PAGE_SIZE()){
    const db=await openDB(); return new Promise((resolve,reject)=>{
      const idx=db.transaction(dataset).objectStore(dataset).index('sort');
      const range=before?IDBKeyRange.upperBound([n(before.sortTs),String(before.id)],true):null; const req=idx.openCursor(range,'prev'); const rows=[];
      req.onsuccess=()=>{const c=req.result;if(!c){finish();return;} rows.push(c.value);if(rows.length>=limit+1){finish();return;}c.continue();};req.onerror=()=>reject(req.error);
      function finish(){const hasMore=rows.length>limit;if(hasMore)rows.pop();const last=rows[rows.length-1];resolve({rows,hasMore,next:last?{sortTs:last.sortTs,id:last.id}:null});}
    });
  }
  async function indexRows(dataset,indexName,key,limit=100000){
    const db=await openDB(); return new Promise((resolve,reject)=>{const rows=[];const idx=db.transaction(dataset).objectStore(dataset).index(indexName);const req=idx.openCursor(IDBKeyRange.only(String(key)));req.onsuccess=()=>{const c=req.result;if(!c||rows.length>=limit){resolve(rows);return;}rows.push(c.value);c.continue();};req.onerror=()=>reject(req.error);});
  }
  async function dateRows(dataset,start,end,limit=100000){
    const db=await openDB(); return new Promise((resolve,reject)=>{const rows=[];const idx=db.transaction(dataset).objectStore(dataset).index('date');const req=idx.openCursor(IDBKeyRange.bound(start,end),'prev');req.onsuccess=()=>{const c=req.result;if(!c||rows.length>=limit){resolve(rows);return;}rows.push(c.value);c.continue();};req.onerror=()=>reject(req.error);});
  }
  async function streamDataset(dataset, fn){ const db=await openDB(); return new Promise((resolve,reject)=>{const req=db.transaction(dataset).objectStore(dataset).openCursor();req.onsuccess=()=>{const c=req.result;if(!c){resolve();return;}fn(c.value);c.continue();};req.onerror=()=>reject(req.error);}); }
  async function localSearch(dataset,q,limit=40){
    const needle=String(q||'').trim().toLowerCase(), max=Math.max(1,Math.min(100,n(limit)||40));
    const db=await openDB();
    return new Promise((resolve,reject)=>{
      const out=[], store=db.transaction(dataset).objectStore(dataset), req=store.index('sort').openCursor(null,'prev');
      req.onsuccess=()=>{const c=req.result;if(!c||out.length>=max){resolve(out);return;}const row=c.value;if(!needle||String(row.searchText||'').includes(needle))out.push(row);if(out.length>=max){resolve(out);return;}c.continue();};
      req.onerror=()=>reject(req.error);
    });
  }
  async function reduceIndex(dataset,indexName,key,reducer,seed){
    const db=await openDB();
    return new Promise((resolve,reject)=>{let acc=seed;const idx=db.transaction(dataset).objectStore(dataset).index(indexName);const req=idx.openCursor(IDBKeyRange.only(String(key)));req.onsuccess=()=>{const c=req.result;if(!c){resolve(acc);return;}acc=reducer(acc,c.value);c.continue();};req.onerror=()=>reject(req.error);});
  }
  async function reduceDate(dataset,start,end,reducer,seed){
    const db=await openDB();
    return new Promise((resolve,reject)=>{let acc=seed;const idx=db.transaction(dataset).objectStore(dataset).index('date');const req=idx.openCursor(IDBKeyRange.bound(start,end));req.onsuccess=()=>{const c=req.result;if(!c){resolve(acc);return;}acc=reducer(acc,c.value);c.continue();};req.onerror=()=>reject(req.error);});
  }

  async function api(path, options={}){
    const {publicRequest=false,skipAuthFailure=false,...cloudOptions}=options||{};
    if(!window.CashTopCloud?.request){const err=new Error('ملف الربط المباشر مع Turso غير محمل.');err.code='CLOUD_ADAPTER_MISSING';throw err;}
    try{
      return await window.CashTopCloud.request(path,cloudOptions,publicRequest?'':(authState?.token||''));
    }catch(err){
      err.status=Number(err.status||0);err.code=err.code||'';err.authFailure=authFailureCode(err.code);
      if(err.authFailure&&!skipAuthFailure)setTimeout(()=>forceLogout(err.message),0);
      throw err;
    }
  }
  async function remotePage(dataset,before=null,limit=PAGE_SIZE()){
    if(!navigator.onLine)return null; const qs=new URLSearchParams({dataset,limit:String(limit)}); if(before){qs.set('beforeSortTs',String(before.sortTs));qs.set('beforeId',String(before.id));} return api(`/records/page?${qs}`);
  }
  async function remoteSearch(dataset,q,limit=40){if(!navigator.onLine)return[];const qs=new URLSearchParams({dataset,q:String(q||''),limit:String(limit)});const d=await api(`/records/search?${qs}`);return d.rows||[];}
  async function writeRemote(op){return api('/records/write',{method:'POST',body:JSON.stringify({dataset:op.dataset,id:op.itemId,action:op.type,record:op.data})});}
  async function cacheRemoteRows(dataset,rows){for(const r of rows||[])await putRemoteRecord(dataset,r);scheduleCacheCleanup();}
  async function refreshRemotePage(pageId,dataset,before){
    if(!navigator.onLine)return; try{ const d=await remotePage(dataset,before);const p=pager(dataset);p.remoteMore=p.remoteMore||{};p.remoteMore[cursorKey(before)]=Boolean(d?.hasMore);if(d?.rows?.length)await cacheRemoteRows(dataset,d.rows);await pullCurrentChanges(dataset);if(currentPage===pageId)renderCurrent(false);updateConnection();}catch(e){updateConnection();}
  }
  async function pullCurrentChanges(dataset){
    if(!navigator.onLine)return; const now=Date.now(); if(!meta.remoteSeen[dataset]){meta.remoteSeen[dataset]=now-5000;saveMeta();return;}
    const since=n(meta.remoteSeen[dataset]); try{const d=await api(`/records/changes?dataset=${encodeURIComponent(dataset)}&since=${since}&limit=100`);let max=since;for(const row of d.rows||[]){max=Math.max(max,n(row.updatedAt)); if(row.deleted)await deleteRemoteRecord(dataset,row.id);else await putRemoteRecord(dataset,row.record);}meta.remoteSeen[dataset]=max;saveMeta();scheduleCacheCleanup();}catch{}
  }

  let syncTimer=null,syncRunning=false;
  function scheduleSync(delay=500){clearTimeout(syncTimer);if(!authState||!specialPerm('sync'))return;syncTimer=setTimeout(()=>processQueue(false),delay);}
  async function dueQueue(limit=24,force=false){const db=await openDB();return new Promise((resolve,reject)=>{const out=[];const store=db.transaction('syncQueue').objectStore('syncQueue');const req=(force?store.index('createdAt').openCursor(null,'next'):store.index('nextTryAt').openCursor(IDBKeyRange.upperBound(Date.now()),'next'));req.onsuccess=()=>{const c=req.result;if(!c||out.length>=limit){resolve(out);return;}out.push(c.value);c.continue();};req.onerror=()=>reject(req.error);});}
  async function updateQueueFailure(op,error){op.tries=n(op.tries)+1;op.lastError=String(error?.message||error||'Sync failed').slice(0,400);const backoff=Math.min(300000,Math.max(2500,Math.pow(2,Math.min(op.tries,8))*900));op.nextTryAt=Date.now()+backoff+Math.floor(Math.random()*900);await tx(['syncQueue'],'readwrite',t=>t.objectStore('syncQueue').put(op));}
  async function deleteQueueOp(opKey){await tx(['syncQueue'],'readwrite',t=>t.objectStore('syncQueue').delete(opKey));}
  async function runPool(items,worker,concurrency=4){let i=0,fatal=null;const runners=Array.from({length:Math.min(concurrency,items.length)},async()=>{while(i<items.length&&!fatal){const item=items[i++];try{await worker(item);}catch(e){if(e?.authFailure){fatal=e;break;}console.warn('sync item failed',e);}}});await Promise.all(runners);if(fatal)throw fatal;}
  async function processQueue(manual=false){
    if(syncRunning){if(manual)toast('المزامنة تعمل الآن.');return;}
    if(!authState||!specialPerm('sync')){if(manual)toast('لا تملك صلاحية المزامنة.',true);return;}
    if(authExpiryPassed()){await forceLogout('انتهت مدة مفتاح الشركة.');return;}
    if(!navigator.onLine){updateConnection();if(manual)toast('لا يوجد اتصال. العمليات باقية محليًا وستزامن تلقائيًا.',true);return;}
    syncRunning=true;syncBtn.classList.add('syncing');syncBtn.setAttribute('aria-busy','true');
    try{
      const valid=await validateSession(true);if(!valid||!authState)return;
      let loops=0,totalOk=0,totalFailed=0;
      while(loops++<8){const items=await dueQueue(24,manual&&loops===1);if(!items.length)break;await runPool(items,async op=>{try{await writeRemote(op);await deleteQueueOp(op.opKey);totalOk++;}catch(e){if(e.authFailure)throw e;await updateQueueFailure(op,e);totalFailed++;}},4);if(items.length<24)break;}
      scheduleCacheCleanup(250);
      if(manual)toast(totalFailed?`تمت مزامنة ${totalOk} وبقي ${totalFailed} للمحاولة لاحقًا.`:`تمت المزامنة بنجاح${totalOk?` (${totalOk} عملية)`:''}.`,false);
    }catch(e){if(e.authFailure){await forceLogout(e.message||'انتهت صلاحية الدخول.');}else if(manual)toast('تعذر الاتصال بـ Turso. الطابور محفوظ وسيستمر تلقائيًا.',true);}
    finally{syncBtn.classList.remove('syncing');syncBtn.removeAttribute('aria-busy');syncRunning=false;if(authState){await refreshPendingCount();updateConnection();}}
  }
  async function refreshPendingCount(){try{const db=await openDB();const count=await new Promise((resolve,reject)=>{const r=db.transaction('syncQueue').objectStore('syncQueue').count();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});pendingBadge.textContent=count>999?'999+':String(count);pendingBadge.hidden=!count;return count;}catch{return 0;}}
  function updateConnection(){connectionText.textContent=navigator.onLine?'متصل مباشرة بـ Turso - مزامنة نشطة وكاش محلي ذكي':'غير متصل - العمل من الكاش المحلي';connectionText.style.color=navigator.onLine?'#15803d':'#b91c1c';}

  function pager(dataset){return pagers[dataset]||(pagers[dataset]={before:null,stack:[],page:1,next:null,hasMore:false,remoteMore:{}});}
  function pagerHTML(dataset){const p=pager(dataset);return `<div class="pager"><button class="btn light" data-page-prev="${dataset}" ${p.stack.length?'':'disabled'}>السابق</button><span class="page-count">صفحة ${p.page}</span><button class="btn light" data-page-next="${dataset}" ${p.hasMore?'':'disabled'}>التالي</button></div>`;}
  function sheet(title,cls,body,subtitle=''){return `<section class="sheet"><div class="sheet-title ${cls}">${esc(title)}</div>${subtitle?`<div class="sheet-subtitle">${esc(subtitle)}</div>`:''}<div class="sheet-body">${body}</div></section>`;}
  function kpi(label,value,cls=''){return `<div class="kpi ${cls}"><span>${esc(label)}</span><strong>${value}</strong></div>`;}
  function emptyRow(cols,text='لا توجد سجلات حتى الآن'){return `<tr><td class="empty" colspan="${cols}">${esc(text)}</td></tr>`;}
  function actionButtons(type,id){const parts=[];if(typeAllowed(type,'edit'))parts.push(`<button class="btn small light" data-edit="${type}" data-id="${esc(id)}">${svg('edit')}تعديل</button>`);if(typeAllowed(type,'delete'))parts.push(`<button class="btn small red" data-delete="${type}" data-id="${esc(id)}">${svg('trash')}حذف</button>`);return parts.length?`<div class="row-actions">${parts.join('')}</div>`:'—';}
  function addButton(type,label='إضافة سجل',cls=''){return typeAllowed(type,'create')?`<button class="btn ${cls}" data-add="${type}">${svg('plus')}${esc(label)}</button>`:'';}
  function loading(){return `<section class="sheet"><div class="loading-box"><div class="loading-line"></div><div class="loading-line"></div><div class="loading-line"></div></div></section>`;}

  function cursorKey(before){return before?`${n(before.sortTs)}|${String(before.id)}`:'start';}
  async function pageData(pageId,dataset,syncRemote){const p=pager(dataset),key=cursorKey(p.before);const data=await localPage(dataset,p.before);p.next=data.next;p.hasMore=data.hasMore||Boolean(p.remoteMore?.[key]);if(syncRemote)setTimeout(()=>refreshRemotePage(pageId,dataset,p.before),0);return data.rows;}
  async function inventoryStatsLocal(code){
    const [buyAgg,saleAgg,p]=await Promise.all([
      reduceIndex('purchases','productCode',code,(a,r)=>({qty:a.qty+n(r.qty),value:a.value+purchaseNet(r)}),{qty:0,value:0}),
      reduceIndex('sales','productCode',code,(a,r)=>({qty:a.qty+n(r.qty),value:a.value+saleTotal(r)}),{qty:0,value:0}),
      getByIndex('products','code',code)
    ]);
    const openingQty=n(p?.openingQty),openingValue=openingQty*n(p?.openingUnitCost),purchasedQty=openingQty+buyAgg.qty,purchaseValue=openingValue+buyAgg.value,soldQty=saleAgg.qty,salesValue=saleAgg.value,avgCost=purchasedQty?purchaseValue/purchasedQty:0,remainingQty=purchasedQty-soldQty;
    return{purchasedQty,purchaseValue,soldQty,salesValue,avgCost,remainingQty,endingInventory:remainingQty*avgCost,profit:salesValue-soldQty*avgCost};
  }
  async function inventoryStatsBatch(codes){
    if(navigator.onLine && codes.length){try{const d=await api(`/metrics/inventory?codes=${encodeURIComponent(codes.join(','))}`);if(d.stats)return d.stats;}catch{}}
    const pairs=await Promise.all(codes.map(async c=>[c,await inventoryStatsLocal(c)]));return Object.fromEntries(pairs);
  }
  async function supplierStatsLocal(code){
    const [due,pay]=await Promise.all([
      reduceIndex('purchases','supplierCode',code,(a,r)=>a+purchaseNet(r),0),
      reduceIndex('payments','supplierCode',code,(a,r)=>{const amount=n(r.amount);if(r.method==='دفع بنكي')a.bank+=amount;else if(r.method==='دفع نقدي')a.cash+=amount;return a;},{bank:0,cash:0})
    ]);
    return{due,bank:pay.bank,cash:pay.cash,paid:pay.bank+pay.cash,balance:due-pay.bank-pay.cash};
  }
  async function supplierStatsBatch(codes){if(navigator.onLine&&codes.length){try{const d=await api(`/metrics/suppliers?codes=${encodeURIComponent(codes.join(','))}`);if(d.stats)return d.stats;}catch{}}const pairs=await Promise.all(codes.map(async c=>[c,await supplierStatsLocal(c)]));return Object.fromEntries(pairs);}
  async function datasetSummary(dataset){if(navigator.onLine){try{return await api(`/metrics/summary?dataset=${encodeURIComponent(dataset)}`);}catch{}}let total=0,bank=0,cash=0;await streamDataset(dataset,r=>{const a=n(r.amount);total+=a;if(String(r.method||r.type).includes('بنكي'))bank+=a;if(String(r.method||r.type).includes('نقدي'))cash+=a;});return{total,bank,cash};}

  async function renderDashboard(){
    const year=n(meta.dashboardYear)||new Date().getFullYear();let rows=[];
    if(navigator.onLine){try{const d=await api(`/metrics/dashboard?year=${year}`);rows=d.months||[];meta.cache.dashboard=meta.cache.dashboard||{};meta.cache.dashboard[year]=rows;saveMeta();}catch{}}
    if(!rows.length&&meta.cache.dashboard?.[year])rows=meta.cache.dashboard[year];
    if(!rows.length){const months=Array.from({length:12},(_,i)=>({month:String(i+1).padStart(2,'0'),revenue:0,cogs:0,gross:0,expenses:0,net:0}));const by=Object.fromEntries(months.map(x=>[x.month,x]));await streamDataset('sales',r=>{if((r.date||'').startsWith(`${year}-`)){const m=r.date.slice(5,7);by[m].revenue+=saleTotal(r);}});await streamDataset('expenses',r=>{if((r.date||'').startsWith(`${year}-`)){const m=r.date.slice(5,7);by[m].expenses+=n(r.amount);}});rows=months.map(x=>({...x,gross:x.revenue-x.cogs,net:x.revenue-x.cogs-x.expenses}));}
    const names=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];const total=rows.reduce((a,r)=>{a.revenue+=n(r.revenue);a.cogs+=n(r.cogs);a.gross+=n(r.gross);a.expenses+=n(r.expenses);a.net+=n(r.net);return a;},{revenue:0,cogs:0,gross:0,expenses:0,net:0});
    const body=`<div class="action-row"><div class="inline-filter"><label>السنة:</label><input class="input" id="dashboardYear" type="number" min="2000" max="2100" value="${year}"></div><span class="note">التقارير السحابية تُحسب كإجماليات بدون تنزيل كل السجلات.</span></div><div class="summary-grid four">${kpi('إجمالي المبيعات',money(total.revenue)+' ₪','dark')}${kpi('مجمل الربح',money(total.gross)+' ₪','green')}${kpi('المصروفات',money(total.expenses)+' ₪','red')}${kpi('صافي الربح',money(total.net)+' ₪',total.net>=0?'green':'red')}</div><div class="table-wrap"><table class="excel"><thead><tr><th>الشهر</th><th>المبيعات</th><th>تكلفة البضاعة</th><th>مجمل الربح</th><th>المصروفات</th><th>صافي الربح</th><th>الهامش</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${names[i]||r.month}</td><td>${money(r.revenue)}</td><td>${money(r.cogs)}</td><td>${money(r.gross)}</td><td>${money(r.expenses)}</td><td>${money(r.net)}</td><td>${pct(n(r.revenue)?n(r.net)/n(r.revenue):0)}</td></tr>`).join('')}</tbody></table></div><div class="chart-grid"><div class="chart-card"><h3>المبيعات الشهرية</h3><canvas id="dashboardChart1"></canvas></div><div class="chart-card"><h3>صافي الربح الشهري</h3><canvas id="dashboardChart2"></canvas></div></div>`;
    setTimeout(()=>{canvasBars('dashboardChart1',names,[{label:'المبيعات',values:rows.map(r=>n(r.revenue))},{label:'مجمل الربح',values:rows.map(r=>n(r.gross))}]);canvasBars('dashboardChart2',names,[{label:'صافي الربح',values:rows.map(r=>n(r.net))}]);},0);return sheet('لوحة التحكم والتحليل المالي','dashboard',body);
  }
  async function renderInventory(syncRemote){const rows=await pageData('inventory','products',syncRemote);const codes=rows.map(r=>String(r.code));const stats=await inventoryStatsBatch(codes);const body=`<div class="action-row">${addButton('product','إضافة صنف','green')}<span class="note">السجلات محملة على صفحات صغيرة لمنع التعليق مع البيانات الكبيرة.</span></div><div class="table-wrap"><table class="excel"><thead><tr><th>الكود</th><th>اسم الصنف</th><th>الفئة</th><th>الوحدة</th><th>المشتراة</th><th>المباعة</th><th>المتبقي</th><th>متوسط التكلفة</th><th>قيمة المخزون</th><th>الربح</th><th>إدارة</th></tr></thead><tbody>${rows.length?rows.map(r=>{const s=stats[String(r.code)]||{};return`<tr><td>${esc(r.code)}</td><td class="text-right">${esc(r.name)}</td><td>${esc(r.category)}</td><td>${esc(r.unit)}</td><td>${qty(s.purchasedQty)}</td><td>${qty(s.soldQty)}</td><td>${qty(s.remainingQty)}</td><td>${money(s.avgCost)}</td><td>${money(s.endingInventory)}</td><td>${money(s.profit)}</td><td>${actionButtons('product',r.id)}</td></tr>`}).join(''):emptyRow(11)}</tbody></table></div>${pagerHTML('products')}`;return sheet('نظام إدارة المخزن','inventory',body);}
  async function renderSuppliers(syncRemote){const rows=await pageData('suppliers','suppliers',syncRemote);const stats=await supplierStatsBatch(rows.map(r=>String(r.code)));const totals=Object.values(stats).reduce((a,s)=>({due:a.due+n(s.due),paid:a.paid+n(s.paid),balance:a.balance+n(s.balance)}),{due:0,paid:0,balance:0});const body=`<div class="action-row">${addButton('supplier','إضافة مورد','red')}</div><div class="summary-grid">${kpi('مستحقات الصفحة',money(totals.due)+' ₪','cyan')}${kpi('مدفوعات الصفحة',money(totals.paid)+' ₪','cyan')}${kpi('رصيد الصفحة',money(totals.balance)+' ₪','cyan')}</div><div class="table-wrap"><table class="excel"><thead><tr><th>رقم المورد</th><th>اسم المورد</th><th>المستحقات</th><th>البنكي</th><th>النقدي</th><th>المدفوع</th><th>المتبقي</th><th>إدارة</th></tr></thead><tbody>${rows.length?rows.map(r=>{const s=stats[String(r.code)]||{};return`<tr><td>${esc(r.code)}</td><td>${esc(r.name)}</td><td>${money(s.due)}</td><td>${money(s.bank)}</td><td>${money(s.cash)}</td><td>${money(s.paid)}</td><td class="bold">${money(s.balance)}</td><td>${actionButtons('supplier',r.id)}</td></tr>`}).join(''):emptyRow(8)}</tbody></table></div>${pagerHTML('suppliers')}`;return sheet('سجل الموردين وحسابات الأرصدة','suppliers',body);}
  async function renderLedger(kind,syncRemote){const dataset=kind==='debtor'?'debtors':'creditors',pageId=dataset;const rows=await pageData(pageId,dataset,syncRemote);const sm=await datasetSummary(dataset);const party=kind==='debtor'?'اسم الزبون / الجهة':'اسم الجهة';const body=`<div class="action-row">${addButton(kind,'إضافة حركة')}</div><div class="summary-grid">${kpi('الإجمالي',money(sm.total)+' ₪')}${kpi('البنكي',money(sm.bank)+' ₪')}${kpi('النقدي',money(sm.cash)+' ₪')}</div><div class="table-wrap"><table class="excel"><thead><tr><th>التاريخ</th><th>${party}</th><th>طريقة الدفع</th><th>المبلغ</th><th>الملاحظات</th><th>إدارة</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.name)}</td><td>${esc(r.method)}</td><td>${money(r.amount)}</td><td>${esc(r.note)}</td><td>${actionButtons(kind,r.id)}</td></tr>`).join(''):emptyRow(6)}</tbody></table></div>${pagerHTML(dataset)}`;return sheet(kind==='debtor'?'سجل المدينين والذمم المالية':'سجل الدائنين والذمم الدائنة','navy',body);}
  async function renderPurchases(syncRemote){const rows=await pageData('purchases','purchases',syncRemote);const body=`<div class="action-row">${addButton('purchase','إضافة مشتريات','red')}<span class="note">اختيار المورد والمنتج يدعم البحث بالاسم أو الكود.</span></div><div class="table-wrap"><table class="excel"><thead><tr><th>التاريخ</th><th>المورد</th><th>المنتج</th><th>السعر</th><th>الكمية</th><th>الإجمالي</th><th>الخصم</th><th>الصافي</th><th>إدارة</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.supplierName||r.supplierCode)}</td><td>${esc(r.productName||r.productCode)}</td><td>${money(r.price)}</td><td>${qty(r.qty)}</td><td>${money(n(r.price)*n(r.qty))}</td><td>${money(r.discount)}</td><td>${money(purchaseNet(r))}</td><td>${actionButtons('purchase',r.id)}</td></tr>`).join(''):emptyRow(9)}</tbody></table></div>${pagerHTML('purchases')}`;return sheet('سجل المشتريات','purchases',body);}
  async function renderSales(syncRemote){const rows=await pageData('sales','sales',syncRemote);const body=`<div class="action-row">${addButton('sale','إضافة مبيعات')}<span class="note">قائمة المنتج قابلة للبحث وتقرأ النتائج المطلوبة فقط.</span></div><div class="summary-grid">${kpi('إجمالي الصفحة',money(rows.reduce((s,r)=>s+saleTotal(r),0))+' ₪','dark')}${kpi('عدد سجلات الصفحة',String(rows.length),'cyan')}${kpi('عمليات معلقة',pendingBadge.hidden?'0':pendingBadge.textContent,'cyan')}</div><div class="table-wrap"><table class="excel"><thead><tr><th>التاريخ</th><th>نوع البيع</th><th>المنتج</th><th>السعر</th><th>الكمية</th><th>الإجمالي</th><th>البيان</th><th>إدارة</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.type)}</td><td>${esc(r.productName||r.productCode)}</td><td>${money(r.price)}</td><td>${qty(r.qty)}</td><td>${money(saleTotal(r))}</td><td>${esc(r.note)}</td><td>${actionButtons('sale',r.id)}</td></tr>`).join(''):emptyRow(8)}</tbody></table></div>${pagerHTML('sales')}`;return sheet('سجل المبيعات','sales',body);}
  async function renderPayments(syncRemote){const rows=await pageData('payments','payments',syncRemote);const body=`<div class="action-row">${addButton('payment','إضافة دفعة')}</div><div class="table-wrap"><table class="excel"><thead><tr><th>التاريخ</th><th>المورد</th><th>طريقة الدفع</th><th>المبلغ</th><th>إدارة</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.supplierName||r.supplierCode)}</td><td>${esc(r.method)}</td><td>${money(r.amount)}</td><td>${actionButtons('payment',r.id)}</td></tr>`).join(''):emptyRow(5)}</tbody></table></div>${pagerHTML('payments')}`;return sheet('المدفوعات للموردين','teal',body);}
  async function renderExpenses(syncRemote){const rows=await pageData('expenses','expenses',syncRemote);const sm=await datasetSummary('expenses');const body=`<div class="action-row">${addButton('expense','إضافة مصروف','red')}</div><div class="summary-grid">${kpi('إجمالي المصروفات',money(sm.total)+' ₪','red')}${kpi('البنكية',money(sm.bank)+' ₪')}${kpi('النقدية',money(sm.cash)+' ₪')}</div><div class="table-wrap"><table class="excel"><thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>البيان</th><th>إدارة</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.type)}</td><td>${money(r.amount)}</td><td>${esc(r.note)}</td><td>${actionButtons('expense',r.id)}</td></tr>`).join(''):emptyRow(5)}</tbody></table></div>${pagerHTML('expenses')}`;return sheet('المصروفات','expenses',body);}
  async function renderFx(syncRemote){const rows=await pageData('fx','fx',syncRemote);const body=`<div class="action-row">${addButton('fx','إضافة حركة عملة','red')}</div><div class="table-wrap"><table class="excel"><thead><tr><th>التاريخ</th><th>النوع</th><th>الدولار</th><th>طريقة الدفع</th><th>سعر الشراء</th><th>سعر الصرف</th><th>القيمة بالشيكل</th><th>إدارة</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.type)}</td><td>${money(r.usd)} $</td><td>${esc(r.method)}</td><td>${n(r.buyRate).toFixed(4)}</td><td>${n(r.exchangeRate).toFixed(4)}</td><td>${money(n(r.usd)*(n(r.buyRate)||n(r.exchangeRate)))}</td><td>${actionButtons('fx',r.id)}</td></tr>`).join(''):emptyRow(8)}</tbody></table></div>${pagerHTML('fx')}`;return sheet('سجل العملات الأجنبية','fx',body);}
  async function renderBank(){
    let rows=[],totalIn=0,totalOut=0;
    if(navigator.onLine){try{const d=await api(`/metrics/bank?limit=${PAGE_SIZE()}`);rows=d.rows||[];totalIn=n(d.totalIn);totalOut=n(d.totalOut);meta.cache.bank={rows,totalIn,totalOut};saveMeta();}catch{}}
    if(!rows.length&&meta.cache.bank?.rows){({rows,totalIn,totalOut}=meta.cache.bank);}
    if(!rows.length){
      const lists=await Promise.all([dateRows('sales','0000-01-01','9999-12-31',PAGE_SIZE()),dateRows('payments','0000-01-01','9999-12-31',PAGE_SIZE()),dateRows('expenses','0000-01-01','9999-12-31',PAGE_SIZE()),dateRows('debtors','0000-01-01','9999-12-31',PAGE_SIZE()),dateRows('creditors','0000-01-01','9999-12-31',PAGE_SIZE())]);
      lists[0].filter(r=>r.type==='بيع بنكي').forEach(r=>rows.push({date:r.date,desc:`بيع - ${r.productName||r.productCode}`,in:saleTotal(r),out:0}));
      lists[1].filter(r=>r.method==='دفع بنكي').forEach(r=>rows.push({date:r.date,desc:`دفعة مورد - ${r.supplierName||r.supplierCode}`,in:0,out:n(r.amount)}));
      lists[2].filter(r=>r.type==='مصروفات بنكية').forEach(r=>rows.push({date:r.date,desc:r.note||'مصروف بنكي',in:0,out:n(r.amount)}));
      lists[3].filter(r=>r.method==='بنكي').forEach(r=>rows.push({date:r.date,desc:`مدين - ${r.name}`,in:n(r.amount),out:0}));
      lists[4].filter(r=>r.method==='بنكي').forEach(r=>rows.push({date:r.date,desc:`دائن - ${r.name}`,in:0,out:n(r.amount)}));
      rows.sort((a,b)=>String(b.date).localeCompare(String(a.date)));rows=rows.slice(0,PAGE_SIZE());totalIn=rows.reduce((s,r)=>s+n(r.in),0);totalOut=rows.reduce((s,r)=>s+n(r.out),0);
    }
    return sheet('حساب البنك','teal',`<div class="summary-grid">${kpi('إجمالي الداخل',money(totalIn)+' ₪','green')}${kpi('إجمالي الخارج',money(totalOut)+' ₪','red')}${kpi('الرصيد',money(totalIn-totalOut)+' ₪','dark')}</div><div class="table-wrap"><table class="excel"><thead><tr><th>التاريخ</th><th>البيان</th><th>داخل</th><th>خارج</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.desc)}</td><td>${money(r.in)}</td><td>${money(r.out)}</td></tr>`).join(''):emptyRow(4)}</tbody></table></div><p class="note">عند الاتصال تُقرأ الحركات من قاعدة Turso حسب الحاجة، وعند عدم الاتصال تُستخدم النسخة المحلية/المخبأة.</p>`);
  }
  async function localFinancial(start='0000-01-01',end='9999-12-31'){
    const [sales,purchases,expenses,debtors,creditors,payments,fx]=await Promise.all([
      reduceDate('sales',start,end,(a,r)=>{a.count++;a.total+=saleTotal(r);return a;},{count:0,total:0}),
      reduceDate('purchases',start,end,(a,r)=>{a.count++;a.total+=purchaseNet(r);return a;},{count:0,total:0}),
      reduceDate('expenses',start,end,(a,r)=>{a.count++;a.total+=n(r.amount);return a;},{count:0,total:0}),
      reduceDate('debtors',start,end,(a,r)=>{a.count++;a.total+=n(r.amount);return a;},{count:0,total:0}),
      reduceDate('creditors',start,end,(a,r)=>{a.count++;a.total+=n(r.amount);return a;},{count:0,total:0}),
      reduceDate('payments',start,end,(a,r)=>{a.count++;a.total+=n(r.amount);return a;},{count:0,total:0}),
      reduceDate('fx',start,end,(a)=>{a.count++;return a;},{count:0})
    ]);
    const revenue=sales.total,purchaseValue=purchases.total,expensesTotal=expenses.total;
    return{salesCount:sales.count,purchasesCount:purchases.count,expensesCount:expenses.count,debtorsCount:debtors.count,creditorsCount:creditors.count,paymentsCount:payments.count,fxCount:fx.count,revenue,purchaseValue,expensesTotal,debtorsTotal:debtors.total,creditorsTotal:creditors.total,paymentsTotal:payments.total,gross:revenue-purchaseValue,net:revenue-purchaseValue-expensesTotal};
  }
  async function financialSummary(start='0000-01-01',end='9999-12-31'){
    const key=`${start}|${end}`;
    if(navigator.onLine){try{const d=await api(`/metrics/financial?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);meta.cache.financial=meta.cache.financial||{};meta.cache.financial[key]=d;saveMeta();return d;}catch{}}
    if(meta.cache.financial?.[key])return meta.cache.financial[key];
    return localFinancial(start,end);
  }
  async function renderBalance(){const f=await financialSummary();const body=`<div class="balance-toolbar"><label for="capitalInput">رأس المال</label><input id="capitalInput" class="input" type="number" inputmode="decimal" step="0.01" value="${n(meta.capital)}"></div><div class="balance-grid"><section class="balance-card"><div class="section-band blue">الأصول</div><div class="balance-table-wrap"><table class="excel balance-table"><tbody><tr><td>إجمالي المبيعات</td><td>${money(f.revenue)} ₪</td></tr><tr><td>المدينون</td><td>${money(f.debtorsTotal)} ₪</td></tr></tbody></table></div></section><section class="balance-card"><div class="section-band blue">الالتزامات وحقوق الملكية</div><div class="balance-table-wrap"><table class="excel balance-table"><tbody><tr><td>الدائنون</td><td>${money(f.creditorsTotal)} ₪</td></tr><tr><td>رأس المال</td><td>${money(meta.capital)} ₪</td></tr></tbody></table></div></section></div><p class="note balance-note">عند عدم توفر الإنترنت يعرض التطبيق البيانات الموجودة في الكاش المحلي فقط.</p>`;return sheet('الميزانية العمومية','balance',body);}
  async function renderStockCharts(){
    let chartRows=[];
    if(navigator.onLine){try{const d=await api('/metrics/stock-categories?limit=16');chartRows=d.rows||[];meta.cache.stockCategories=chartRows;saveMeta();}catch{}}
    if(!chartRows.length&&meta.cache.stockCategories?.length)chartRows=meta.cache.stockCategories;
    if(!chartRows.length){
      const prod=new Map(),buy=new Map(),sold=new Map();
      await streamDataset('products',r=>prod.set(String(r.code),{category:r.category||'غير مصنف',oq:n(r.openingQty),oc:n(r.openingUnitCost)}));
      await streamDataset('purchases',r=>{const k=String(r.productCode||''),a=buy.get(k)||{q:0,v:0};a.q+=n(r.qty);a.v+=purchaseNet(r);buy.set(k,a);});
      await streamDataset('sales',r=>{const k=String(r.productCode||''),a=sold.get(k)||{q:0};a.q+=n(r.qty);sold.set(k,a);});
      const by=new Map();for(const [code,p] of prod){const b=buy.get(code)||{q:0,v:0},sl=sold.get(code)||{q:0},pq=p.oq+b.q,pv=p.oq*p.oc+b.v,avg=pq?pv/pq:0,rem=pq-sl.q,a=by.get(p.category)||{category:p.category,qty:0,value:0};a.qty+=rem;a.value+=rem*avg;by.set(p.category,a);}chartRows=[...by.values()].sort((a,b)=>b.value-a.value).slice(0,16);
    }
    const cats=chartRows.map(r=>r.category);setTimeout(()=>{canvasBars('stockQtyChart',cats,[{label:'الكمية المتبقية',values:chartRows.map(r=>n(r.qty))}]);canvasBars('stockValueChart',cats,[{label:'قيمة المخزون',values:chartRows.map(r=>n(r.value))}]);},0);
    return sheet('الرسومات البيانية للمخزن','teal',`<div class="chart-grid"><div class="chart-card"><h3>الكميات حسب الفئة</h3><canvas id="stockQtyChart"></canvas></div><div class="chart-card"><h3>قيمة المخزون حسب الفئة</h3><canvas id="stockValueChart"></canvas></div></div>`);
  }
  async function renderDaily(){const d=meta.selectedDate||today(),f=await financialSummary(d,d);return sheet('التقرير اليومي','navy',`<div class="action-row"><div class="inline-filter"><label>التاريخ:</label><input id="dailyDate" class="input" type="date" value="${d}"></div></div><div class="summary-grid four">${kpi('المبيعات',money(f.revenue)+' ₪','green')}${kpi('المشتريات',money(f.purchaseValue)+' ₪')}${kpi('المصروفات',money(f.expensesTotal)+' ₪','red')}${kpi('المدفوعات',money(f.paymentsTotal)+' ₪')}</div><div class="table-wrap"><table class="excel"><thead><tr><th>نوع الحركة</th><th>عدد السجلات</th><th>الإجمالي</th></tr></thead><tbody><tr><td>المبيعات</td><td>${f.salesCount}</td><td>${money(f.revenue)}</td></tr><tr><td>المشتريات</td><td>${f.purchasesCount}</td><td>${money(f.purchaseValue)}</td></tr><tr><td>المصروفات</td><td>${f.expensesCount}</td><td>${money(f.expensesTotal)}</td></tr><tr><td>المدفوعات</td><td>${f.paymentsCount}</td><td>${money(f.paymentsTotal)}</td></tr></tbody></table></div>`);}
  async function renderComprehensive(){const start=meta.reportStart||today(),end=meta.reportEnd||today(),f=await financialSummary(start,end);return sheet('التقرير الشامل','navy',`<div class="action-row"><div class="inline-filter"><label>من:</label><input id="reportStart" class="input" type="date" value="${start}"><label>إلى:</label><input id="reportEnd" class="input" type="date" value="${end}"></div></div><div class="summary-grid four">${kpi('المبيعات',money(f.revenue)+' ₪','green')}${kpi('المشتريات',money(f.purchaseValue)+' ₪')}${kpi('المصروفات',money(f.expensesTotal)+' ₪','red')}${kpi('صافي تقديري',money(f.net)+' ₪',f.net>=0?'green':'red')}</div><p class="note">هذا التقرير في وضع أوفلاين يستخدم البيانات المخزنة محليًا ضمن الفترة.</p>`);}
  async function renderIncome(){const f=await financialSummary();return sheet('قائمة الدخل','income',`<div class="table-wrap"><table class="excel"><tbody><tr><th>البيان</th><th>القيمة</th></tr><tr><td>إيرادات المبيعات</td><td>${money(f.revenue)}</td></tr><tr><td>تكلفة المشتريات المسجلة</td><td>${money(f.purchaseValue)}</td></tr><tr><td>مجمل الربح التقديري</td><td>${money(f.gross)}</td></tr><tr><td>المصروفات</td><td>${money(f.expensesTotal)}</td></tr><tr class="grand-total"><td>صافي الربح التقديري</td><td>${money(f.net)}</td></tr></tbody></table></div>`);}
  async function renderAnalysis(){const f=await financialSummary();const margin=f.revenue?f.net/f.revenue:0;return sheet('التحليل المالي','dashboard',`<div class="analysis-grid"><div class="analysis-card"><span>إجمالي المبيعات</span><strong>${money(f.revenue)} ₪</strong><small>السجلات المتاحة من Turso أو الكاش المحلي</small></div><div class="analysis-card"><span>صافي الربح التقديري</span><strong>${money(f.net)} ₪</strong><small>بعد المشتريات والمصروفات</small></div><div class="analysis-card"><span>هامش صافي الربح</span><strong>${pct(margin)}</strong><small>صافي الربح ÷ المبيعات</small></div><div class="analysis-card"><span>الذمم</span><strong>${money(f.debtorsTotal-f.creditorsTotal)} ₪</strong><small>مدينون ناقص دائنون</small></div></div>`);}

  const permissionModules=[
    ['dashboard','لوحة التحكم',false],['inventory','المخزن',true],['suppliers','الموردون',true],['debtors','المدينون',true],['purchases','المشتريات',true],['sales','المبيعات',true],['payments','المدفوعات',true],['bank','حساب البنك',false],['creditors','الدائنون',true],['balance','الميزانية العمومية',false],['expenses','المصروفات',true],['stockCharts','رسومات المخزن',false],['daily','التقرير اليومي',false],['comprehensive','التقرير الشامل',false],['income','قائمة الدخل',false],['fx','العملات الأجنبية',true],['analysis','التحليل المالي',false]
  ];
  function blankEmployeePermissions(){const modules={};for(const [id,,crud] of permissionModules)modules[id]={view:false,create:false,edit:false,delete:false};modules.users={view:false,create:false,edit:false,delete:false};modules.settings={view:false,create:false,edit:false,delete:false};return{modules,special:{manageUsers:false,manageSettings:false,export:false,import:false,print:false,sync:true}};}
  function permissionMatrixHTML(perms){const p=perms||blankEmployeePermissions();return `<div class="permission-wrap"><div class="permission-title">صلاحيات الأقسام</div><div class="permission-table"><div class="perm-head"><span>القسم</span><span>عرض</span><span>إضافة</span><span>تعديل</span><span>حذف</span></div>${permissionModules.map(([id,label,crud])=>`<div class="perm-row"><strong>${esc(label)}</strong><label><input type="checkbox" data-perm-module="${id}" data-perm-action="view" ${p.modules?.[id]?.view?'checked':''}><span></span></label><label>${crud?`<input type="checkbox" data-perm-module="${id}" data-perm-action="create" ${p.modules?.[id]?.create?'checked':''}><span></span>`:'—'}</label><label>${crud?`<input type="checkbox" data-perm-module="${id}" data-perm-action="edit" ${p.modules?.[id]?.edit?'checked':''}><span></span>`:'—'}</label><label>${crud?`<input type="checkbox" data-perm-module="${id}" data-perm-action="delete" ${p.modules?.[id]?.delete?'checked':''}><span></span>`:'—'}</label></div>`).join('')}</div><div class="permission-title">صلاحيات خاصة</div><div class="special-perms">${[['manageUsers','إدارة المستخدمين'],['manageSettings','تعديل إعدادات الشركة'],['export','تصدير نسخة احتياطية'],['import','استيراد نسخة احتياطية'],['print','الطباعة'],['sync','المزامنة السحابية']].map(([k,l])=>`<label><input type="checkbox" data-perm-special="${k}" ${p.special?.[k]?'checked':''}><span>${esc(l)}</span></label>`).join('')}</div></div>`;}
  function readPermissionsFromForm(form){const p=blankEmployeePermissions();form.querySelectorAll('[data-perm-module]').forEach(x=>{p.modules[x.dataset.permModule][x.dataset.permAction]=x.checked;});form.querySelectorAll('[data-perm-special]').forEach(x=>{p.special[x.dataset.permSpecial]=x.checked;});if(p.special.manageUsers)p.modules.users.view=true;if(p.special.manageSettings)p.modules.settings.view=true;return p;}
  async function renderUsers(){if(!specialPerm('manageUsers'))return sheet('المستخدمون والصلاحيات','navy','<div class="empty">لا تملك صلاحية إدارة المستخدمين.</div>');if(!navigator.onLine)return sheet('المستخدمون والصلاحيات','navy','<div class="offline-card">قسم المستخدمين يحتاج اتصالًا بـ Turso لتطبيق الصلاحيات فورًا.</div>');const d=await api('/users');usersCache=d.rows||[];const body=`<div class="action-row"><button class="btn green" data-user-add>${svg('plus')}إضافة موظف</button><span class="note">كل موظف يدخل بمفتاح الشركة نفسه واسم مستخدم وكلمة مرور خاصة به.</span></div><div class="table-wrap"><table class="excel"><thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>النوع</th><th>الحالة</th><th>آخر دخول</th><th>إدارة</th></tr></thead><tbody>${usersCache.length?usersCache.map(u=>`<tr><td>${esc(u.displayName)}</td><td>${esc(u.username)}</td><td>${u.role==='owner'?'مالك':'موظف'}</td><td><span class="state-pill ${u.status==='active'?'ok':'stop'}">${u.status==='active'?'فعال':'موقوف'}</span></td><td>${u.lastLoginAt?new Date(u.lastLoginAt).toLocaleString('ar-EG'):'—'}</td><td>${u.role==='owner'?'حساب محمي':`<div class="row-actions"><button class="btn small light" data-user-edit="${esc(u.id)}">${svg('edit')}تعديل</button><button class="btn small ${u.status==='active'?'red':'green'}" data-user-status="${esc(u.id)}" data-status="${u.status==='active'?'stopped':'active'}">${u.status==='active'?'إيقاف':'تشغيل'}</button></div>`}</td></tr>`).join(''):emptyRow(6)}</tbody></table></div>`;return sheet('المستخدمون والصلاحيات','navy',body);}
  async function openUserModal(id=null){if(!specialPerm('manageUsers'))return;const row=id?usersCache.find(x=>String(x.id)===String(id)):null;if(id&&!row)return;const form=document.getElementById('modalForm');document.getElementById('modalTitle').textContent=id?'تعديل الموظف':'إضافة موظف';const perms=row?.permissions||blankEmployeePermissions();form.innerHTML=`<div class="field"><label>اسم الموظف</label><input name="displayName" required value="${esc(row?.displayName||'')}"></div><div class="field"><label>اسم المستخدم</label><input name="username" required autocomplete="off" value="${esc(row?.username||'')}"></div><div class="field"><label>${id?'كلمة مرور جديدة (اختياري)':'كلمة المرور'}</label><input name="password" type="password" ${id?'':'required'} autocomplete="new-password"></div><div class="field"><label>الحالة</label><div class="toggle-line"><label><input type="radio" name="status" value="active" ${!row||row.status==='active'?'checked':''}> فعال</label><label><input type="radio" name="status" value="stopped" ${row?.status==='stopped'?'checked':''}> موقوف</label></div></div><div class="field permission-field">${permissionMatrixHTML(perms)}</div><div class="modal-actions"><button type="button" class="btn light" id="cancelModal">إلغاء</button><button type="submit" class="btn">حفظ المستخدم</button></div>`;document.getElementById('modalBackdrop').hidden=false;hydrateIcons(form);document.getElementById('cancelModal').onclick=closeModal;form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form);const payload={id:row?.id||'',displayName:fd.get('displayName'),username:fd.get('username'),password:fd.get('password'),status:fd.get('status'),permissions:readPermissionsFromForm(form)};try{await api('/users/save',{method:'POST',body:JSON.stringify(payload)});closeModal();toast('تم حفظ المستخدم والصلاحيات.');await renderCurrent(false);}catch(err){toast(err.message||'تعذر حفظ المستخدم.',true);}};}
  async function renderSettings(){if(!pageAllowed('settings'))return sheet('إعدادات الشركة','navy','<div class="empty">لا تملك صلاحية عرض الإعدادات.</div>');const st=authState.company?.settings||{},editable=specialPerm('manageSettings');const dis=editable?'':'disabled';const body=`<div class="settings-panels"><form class="settings-card settings-grid" id="companySettingsForm"><h3>بيانات الشركة</h3><label><span>اسم الشركة</span><input name="companyName" value="${esc(st.companyName||authState.company?.name||'')}" ${dis}></label><label><span>رقم الجوال</span><input name="phone" value="${esc(st.phone||'')}" ${dis}></label><label><span>واتساب</span><input name="whatsapp" value="${esc(st.whatsapp||'')}" ${dis}></label><label><span>البريد الإلكتروني</span><input name="email" type="email" value="${esc(st.email||'')}" ${dis}></label><label><span>الموقع الإلكتروني</span><input name="website" type="url" placeholder="https://..." value="${esc(st.website||'')}" ${dis}></label><label><span>الرقم الضريبي</span><input name="taxNumber" value="${esc(st.taxNumber||'')}" ${dis}></label><label><span>السجل التجاري</span><input name="commercialRegistration" value="${esc(st.commercialRegistration||'')}" ${dis}></label><label><span>العملة</span><input name="currency" value="${esc(st.currency||'₪')}" ${dis}></label><label class="wide"><span>رابط شعار الشركة</span><input name="logoUrl" type="url" placeholder="https://..." value="${esc(st.logoUrl||'')}" ${dis}></label><label class="wide"><span>العنوان</span><input name="address" value="${esc(st.address||'')}" ${dis}></label><label class="wide"><span>ملاحظات الشركة</span><textarea name="notes" ${dis}>${esc(st.notes||'')}</textarea></label>${editable?`<div class="settings-actions"><button class="btn" type="submit">حفظ بيانات الشركة</button></div>`:''}</form><form class="settings-card password-card" id="myPasswordForm"><h3>تغيير كلمة مرور حسابي</h3><label><span>كلمة المرور الحالية</span><input type="password" name="currentPassword" required autocomplete="current-password"></label><label><span>كلمة المرور الجديدة</span><input type="password" name="newPassword" required minlength="4" autocomplete="new-password"></label><div class="settings-actions"><button class="btn" type="submit">تغيير كلمة المرور</button></div></form></div>`;return sheet('إعدادات الشركة والحساب','navy',body);}
  function bindManagementEvents(){app.querySelector('[data-user-add]')?.addEventListener('click',()=>openUserModal());app.querySelectorAll('[data-user-edit]').forEach(b=>b.onclick=()=>openUserModal(b.dataset.userEdit));app.querySelectorAll('[data-user-status]').forEach(b=>b.onclick=async()=>{try{await api('/users/status',{method:'POST',body:JSON.stringify({id:b.dataset.userStatus,status:b.dataset.status})});toast('تم تحديث حالة المستخدم.');await renderCurrent(false);}catch(e){toast(e.message||'تعذر تحديث المستخدم.',true);}});const sf=document.getElementById('companySettingsForm');if(sf&&specialPerm('manageSettings'))sf.onsubmit=async e=>{e.preventDefault();const fd=new FormData(sf),settings=Object.fromEntries(fd.entries());try{const d=await api('/company/settings',{method:'POST',body:JSON.stringify({settings})});authState.company=d.company;saveAuth();applyCompanyBranding();toast('تم حفظ بيانات الشركة.');}catch(err){toast(err.message||'تعذر حفظ الإعدادات.',true);}};const pf=document.getElementById('myPasswordForm');if(pf)pf.onsubmit=async e=>{e.preventDefault();const fd=new FormData(pf);try{await api('/account/password',{method:'POST',body:JSON.stringify({currentPassword:fd.get('currentPassword'),newPassword:fd.get('newPassword')})});pf.reset();toast('تم تغيير كلمة المرور.');}catch(err){toast(err.message||'تعذر تغيير كلمة المرور.',true);}};}

  const renderers={dashboard:()=>renderDashboard(),inventory:renderInventory,suppliers:renderSuppliers,debtors:(s)=>renderLedger('debtor',s),purchases:renderPurchases,sales:renderSales,payments:renderPayments,bank:()=>renderBank(),creditors:(s)=>renderLedger('creditor',s),balance:()=>renderBalance(),expenses:renderExpenses,stockCharts:()=>renderStockCharts(),daily:()=>renderDaily(),comprehensive:()=>renderComprehensive(),income:()=>renderIncome(),fx:renderFx,analysis:()=>renderAnalysis(),users:()=>renderUsers(),settings:()=>renderSettings()};
  async function renderCurrent(syncRemote=true){if(!authState)return;if(!pageAllowed(currentPage))currentPage=visiblePages()[0]?.[0]||'dashboard';const token=++renderToken;nav.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===currentPage));document.querySelectorAll('.bottom-btn[data-quick]').forEach(b=>b.classList.toggle('active',b.dataset.quick===currentPage));pageLabel.textContent=pages.find(p=>p[0]===currentPage)?.[1]||'';localStorage.setItem(pageKey(),currentPage);app.innerHTML=loading();try{const html=await (renderers[currentPage]||renderDashboard)(syncRemote);if(token!==renderToken)return;app.innerHTML=html;bindPageEvents();bindManagementEvents();hydrateIcons(app);}catch(e){if(token!==renderToken)return;if(e.authFailure)return;app.innerHTML=sheet('تعذر عرض الصفحة','navy',`<div class="empty">${esc(e.message||e)}</div>`);}}

  async function openModal(type,id=null){const schema=schemas[type];if(!schema)return;if(!typeAllowed(type,id?'edit':'create')){toast('لا تملك صلاحية هذه العملية.',true);return;}const row=id?await getRecord(schema.dataset,id):null;const form=document.getElementById('modalForm');document.getElementById('modalTitle').textContent=`${id?'تعديل':'إضافة'} ${schema.title}`;form.innerHTML=schema.fields.map(f=>fieldHTML(f,row?.[f.name]??f.default??'')).join('')+`<div class="modal-actions"><button type="button" class="btn light" id="cancelModal">إلغاء</button><button type="submit" class="btn">حفظ</button></div>`;document.getElementById('modalBackdrop').hidden=false;hydrateIcons(form);for(const f of schema.fields){if(['combo','dynamicCombo','comboFree'].includes(f.type))setupCombo(form.querySelector(`[data-combo-name="${f.name}"]`),f,row?.[f.name]??f.default??'');}document.getElementById('cancelModal').onclick=closeModal;form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form),data={};for(const f of schema.fields){let v=fd.get(f.name)??'';if(f.type==='number')v=n(v);data[f.name]=v;}if(schema.dataset==='products'||schema.dataset==='suppliers'){const existing=await getByIndex(schema.dataset,'code',data.code);if(existing&&existing.id!==id){toast('هذا الكود مستخدم مسبقًا.',true);return;}}if(schema.dataset==='purchases'){const [s,p]=await Promise.all([getByIndex('suppliers','code',data.supplierCode),getByIndex('products','code',data.productCode)]);data.supplierName=s?.name||'';data.productName=p?.name||'';}if(schema.dataset==='sales'){const p=await getByIndex('products','code',data.productCode);data.productName=p?.name||'';}if(schema.dataset==='payments'){const s=await getByIndex('suppliers','code',data.supplierCode);data.supplierName=s?.name||'';}const rec={...(row||{}),...data,id:id||uid(),updatedAt:Date.now(),sortTs:data.date?dateToSortTs(data.date):Date.now()};await putLocalRecord(schema.dataset,rec,true);closeModal();pager(schema.dataset).before=null;pager(schema.dataset).stack=[];pager(schema.dataset).page=1;pager(schema.dataset).remoteMore={};await renderCurrent(false);toast('تم الحفظ محليًا وأضيفت العملية للمزامنة.');};form.querySelector('input,textarea')?.focus();}
  function fieldHTML(f,val){const full='',req=f.required?'required':'';if(['combo','dynamicCombo','comboFree'].includes(f.type))return `<div class="field${full}"><label>${esc(f.label)}</label><div class="search-select" data-combo-name="${esc(f.name)}"><div class="search-select-row"><input class="combo-input" type="text" autocomplete="off" placeholder="ابحث أو اختر..." ${req}><button class="combo-chevron" type="button">${svg('chevron')}</button></div><input type="hidden" name="${esc(f.name)}" value="${esc(val)}"><div class="combo-menu" hidden></div></div></div>`;if(f.type==='textarea')return `<div class="field${full}"><label>${esc(f.label)}</label><textarea name="${esc(f.name)}" ${req}>${esc(val)}</textarea></div>`;return `<div class="field${full}"><label>${esc(f.label)}</label><input name="${esc(f.name)}" type="${f.type||'text'}" value="${esc(val)}" ${f.step?`step="${f.step}"`:''} ${req}></div>`;}
  function setupCombo(el,f,currentValue){if(!el)return;const input=el.querySelector('.combo-input'),hidden=el.querySelector('input[type=hidden]'),menu=el.querySelector('.combo-menu'),toggle=el.querySelector('.combo-chevron');let items=[],active=-1,timer=null;const labelOf=r=>f.source?`${r.code} - ${r.name}`:String(r.label??r.value??r);const valueOf=r=>f.source?String(r.code):String(r.value??r);async function load(q=''){if(f.type==='combo'){const needle=String(q||'').trim().toLowerCase();items=f.options.filter(v=>!needle||String(v).toLowerCase().includes(needle)).map(v=>({value:v,label:v}));}else if(f.type==='comboFree'){const products=await localSearch('products',q,60);const cats=[...new Set(products.map(r=>r.category).filter(Boolean))];items=cats.map(v=>({value:v,label:v}));if(q.trim()&&!cats.some(v=>v.toLowerCase()===q.trim().toLowerCase()))items.unshift({value:q.trim(),label:`استخدام: ${q.trim()}`});}else{const local=await localSearch(f.source,q,30);let remote=[];if(navigator.onLine){try{remote=await remoteSearch(f.source,q,30);await cacheRemoteRows(f.source,remote);}catch{}}const map=new Map();[...local,...remote].forEach(r=>map.set(String(r.id||r.code),r));items=[...map.values()].slice(0,40);}draw();}
    function draw(){active=-1;menu.innerHTML=items.length?items.map((r,i)=>`<button type="button" class="combo-option" data-i="${i}">${esc(labelOf(r))}</button>`).join(''):`<div class="combo-empty">لا توجد نتائج</div>`;menu.hidden=false;menu.querySelectorAll('.combo-option').forEach(b=>b.onclick=()=>choose(items[n(b.dataset.i)]));}
    function choose(r){if(!r)return;hidden.value=valueOf(r);input.value=labelOf(r).replace(/^استخدام:\s*/, '');menu.hidden=true;input.setCustomValidity('');}
    async function setInitial(){if(!currentValue){input.value='';return;}if(f.source){let r=await getByIndex(f.source,'code',currentValue);if(!r&&navigator.onLine){try{const found=await remoteSearch(f.source,currentValue,10);r=found.find(x=>String(x.code)===String(currentValue));if(r)await putRemoteRecord(f.source,r);}catch{}}input.value=r?labelOf(r):String(currentValue);}else input.value=String(currentValue);}setInitial();
    input.addEventListener('focus',()=>load(input.value));input.addEventListener('input',()=>{hidden.value=f.type==='comboFree'?input.value:'';clearTimeout(timer);timer=setTimeout(()=>load(input.value),180);});toggle.onclick=()=>menu.hidden?load(input.value):(menu.hidden=true);input.addEventListener('keydown',e=>{const opts=[...menu.querySelectorAll('.combo-option')];if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();active=Math.max(0,Math.min(opts.length-1,active+(e.key==='ArrowDown'?1:-1)));opts.forEach((x,i)=>x.classList.toggle('active',i===active));opts[active]?.scrollIntoView({block:'nearest'});}if(e.key==='Enter'&&!menu.hidden&&active>=0){e.preventDefault();opts[active]?.click();}if(e.key==='Escape')menu.hidden=true;});document.addEventListener('click',e=>{if(!el.contains(e.target))menu.hidden=true;},{once:false});}
  function closeModal(){document.getElementById('modalBackdrop').hidden=true;}
  async function deleteRecord(type,id){const schema=schemas[type];if(!schema)return;if(!typeAllowed(type,'delete')){toast('لا تملك صلاحية الحذف.',true);return;}if(!confirm('هل تريد حذف هذا السجل؟'))return;await removeLocalRecord(schema.dataset,id,true);await renderCurrent(false);toast('تم الحذف محليًا وإضافة الحذف لطابور المزامنة.');}

  function bindPageEvents(){app.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>openModal(b.dataset.add));app.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openModal(b.dataset.edit,b.dataset.id));app.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteRecord(b.dataset.delete,b.dataset.id));app.querySelectorAll('[data-page-next]').forEach(b=>b.onclick=()=>{const d=b.dataset.pageNext,p=pager(d);if(!p.next)return;p.stack.push(p.before);p.before=p.next;p.page++;renderCurrent(true);});app.querySelectorAll('[data-page-prev]').forEach(b=>b.onclick=()=>{const d=b.dataset.pagePrev,p=pager(d);if(!p.stack.length)return;p.before=p.stack.pop()||null;p.page=Math.max(1,p.page-1);renderCurrent(true);});const year=document.getElementById('dashboardYear');if(year)year.onchange=()=>{meta.dashboardYear=n(year.value)||new Date().getFullYear();saveMeta();renderCurrent(true);};const daily=document.getElementById('dailyDate');if(daily)daily.onchange=()=>{meta.selectedDate=daily.value;saveMeta();renderCurrent(false);};const rs=document.getElementById('reportStart'),re=document.getElementById('reportEnd');if(rs)rs.onchange=()=>{meta.reportStart=rs.value;saveMeta();renderCurrent(false);};if(re)re.onchange=()=>{meta.reportEnd=re.value;saveMeta();renderCurrent(false);};const cap=document.getElementById('capitalInput');if(cap)cap.onchange=()=>{meta.capital=n(cap.value);saveMeta();renderCurrent(false);};}

  function canvasBars(id,labels,datasets){const c=document.getElementById(id);if(!c)return;const rect=c.getBoundingClientRect(),ratio=Math.max(1,devicePixelRatio||1);c.width=Math.max(500,rect.width*ratio);c.height=280*ratio;const ctx=c.getContext('2d');ctx.scale(ratio,ratio);const W=c.width/ratio,H=c.height/ratio,pad={l:48,r:14,t:25,b:52},cw=W-pad.l-pad.r,ch=H-pad.t-pad.b,max=Math.max(1,...datasets.flatMap(d=>d.values.map(n)))*1.12;ctx.strokeStyle='#cbd5e1';ctx.fillStyle='#64748b';ctx.font='10px Cairo, Arial, sans-serif';ctx.textAlign='right';for(let i=0;i<=4;i++){const y=pad.t+ch-(ch*i/4);ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();ctx.fillText(money(max*i/4),pad.l-5,y+4);}const groupW=cw/Math.max(1,labels.length),barW=Math.max(7,(groupW*.72)/datasets.length),colors=['#1f4e78','#15803d','#b91c1c','#00757e'];labels.forEach((lab,i)=>{datasets.forEach((ds,j)=>{const v=n(ds.values[i]),h=ch*(v/max),x=pad.l+i*groupW+groupW*.14+j*barW,y=pad.t+ch-h;ctx.fillStyle=colors[j%colors.length];ctx.fillRect(x,y,Math.max(3,barW-2),h);});ctx.save();ctx.translate(pad.l+i*groupW+groupW/2,H-28);ctx.rotate(-.15);ctx.fillStyle='#334155';ctx.textAlign='center';ctx.fillText(lab,0,0);ctx.restore();});}
  function toast(msg,error=false){const t=document.getElementById('toast');t.textContent=msg;t.style.background=error?'#991b1b':'#111827';t.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.hidden=true,2800);}
  function hydrateIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=svg(el.dataset.icon);});}
  function navInit(){const allowed=visiblePages();nav.innerHTML=allowed.map(([id,label,icon])=>`<button class="nav-btn ${id===currentPage?'active':''}" data-page="${id}"><span class="nav-icon">${svg(icon)}</span><span>${esc(label)}</span></button>`).join('');nav.onclick=e=>{const b=e.target.closest('[data-page]');if(!b||!pageAllowed(b.dataset.page))return;currentPage=b.dataset.page;renderCurrent(true);sidebar.classList.remove('open');};document.querySelectorAll('[data-quick]').forEach(b=>{const page=b.dataset.quick;if(page)b.hidden=!pageAllowed(page);b.onclick=()=>{if(page&&!pageAllowed(page))return;currentPage=page;renderCurrent(true);};});syncBtn.hidden=!specialPerm('sync');const exportBtn=document.getElementById('exportBtn'),importLabel=document.getElementById('importLabel'),printBtn=document.getElementById('printBtn');if(exportBtn)exportBtn.hidden=!specialPerm('export');if(importLabel)importLabel.hidden=!specialPerm('import');if(printBtn)printBtn.hidden=!specialPerm('print');}

  async function exportData(){const out={version:APP_VERSION,exportedAt:new Date().toISOString(),meta,datasets:{}};for(const d of DATASETS){out.datasets[d]=[];await streamDataset(d,r=>out.datasets[d].push(r));}const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`sales-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);toast('تم إنشاء النسخة الاحتياطية من البيانات المحلية.');}
  async function importData(file){try{const data=JSON.parse(await file.text());if(!data?.datasets)throw new Error('ملف غير صالح');for(const d of DATASETS){for(const r of data.datasets[d]||[])await putLocalRecord(d,r,true);}if(data.meta){meta={...meta,...data.meta};saveMeta();}await renderCurrent(false);toast('تم الاستيراد وحُفظت العمليات في طابور المزامنة.');}catch(e){toast('تعذر استيراد الملف.',true);}}
  async function clearLocal(){if(!confirm('سيتم مسح البيانات المحلية والطابور من هذا الجهاز فقط. لن يتم حذف البيانات الموجودة في قاعدة Turso. متابعة؟'))return;const db=await openDB();await new Promise((resolve,reject)=>{const stores=[...DATASETS,'syncQueue'];const t=db.transaction(stores,'readwrite');stores.forEach(s=>t.objectStore(s).clear());t.oncomplete=resolve;t.onerror=()=>reject(t.error);});pagers&&Object.keys(pagers).forEach(k=>delete pagers[k]);await refreshPendingCount();renderCurrent(false);toast('تم مسح البيانات المحلية.');}

  function initPWA(){if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;document.getElementById('installBtn').hidden=false;});window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;document.getElementById('installBtn').hidden=true;toast('تم تثبيت التطبيق.');});document.getElementById('installBtn').onclick=async()=>{if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;}else toast('استخدم خيار "إضافة إلى الشاشة الرئيسية" من قائمة المتصفح إذا لم يظهر زر التثبيت.');};}

  async function startCompanyApp(){
    if(!authState)return;
    if(!meta)meta=loadMeta();
    currentPage=localStorage.getItem(pageKey())||currentPage||'dashboard';
    if(!pageAllowed(currentPage))currentPage=visiblePages()[0]?.[0]||'dashboard';
    Object.keys(pagers).forEach(k=>delete pagers[k]);
    navInit();hydrateIcons();applyCompanyBranding();updateConnection();
    await openDB();await refreshPendingCount();scheduleCacheCleanup(300);await renderCurrent(true);scheduleSync(700);
    clearInterval(validationTimer);validationTimer=setInterval(async()=>{if(!authState)return;if(authExpiryPassed()){await forceLogout('انتهت مدة مفتاح الشركة.');return;}if(navigator.onLine){const ok=await validateSession(true);if(ok&&authState)processQueue(false);}},45000);
  }
  async function logoutUser(){try{if(navigator.onLine&&authState?.token)await api('/auth/logout',{method:'POST',skipAuthFailure:true});}catch{}await forceLogout('');}
  async function init(){
    OLD_STORAGE_KEYS.forEach(k=>localStorage.removeItem(k));initPWA();hydrateIcons();updateLoginStatus();
    const hint=loginHint();document.getElementById('companyKeyInput').value=hint.companyKey||'';document.getElementById('usernameInput').value=hint.username||'';
    authState=loadCachedAuth();
    if(authState&&!authExpiryPassed()){
      const valid=await validateSession(true);if(valid&&authState){meta=loadMeta();showApp();await startCompanyApp();return;}
    }
    if(authState&&authExpiryPassed()){authState=null;saveAuth();}
    showLogin();
  }

  loginForm.onsubmit=async e=>{e.preventDefault();const btn=document.getElementById('loginBtn'),key=document.getElementById('companyKeyInput').value.trim(),username=document.getElementById('usernameInput').value.trim(),password=document.getElementById('passwordInput').value;setLoginMessage('');btn.disabled=true;btn.textContent='جاري الدخول...';try{await doLogin(key,username,password);}catch(err){setLoginMessage(err.message||'تعذر تسجيل الدخول.',true);}finally{btn.disabled=false;btn.textContent='دخول سريع';}};
  document.getElementById('menuBtn').onclick=()=>sidebar.classList.toggle('open');
  document.getElementById('modalClose').onclick=closeModal;
  document.getElementById('modalBackdrop').onclick=e=>{if(e.target.id==='modalBackdrop')closeModal();};
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  syncBtn.onclick=()=>processQueue(true);
  document.getElementById('exportBtn').onclick=()=>{if(specialPerm('export'))exportData();else toast('لا تملك صلاحية التصدير.',true);};
  document.getElementById('importInput').onchange=e=>{if(e.target.files[0]&&specialPerm('import'))importData(e.target.files[0]);else if(e.target.files[0])toast('لا تملك صلاحية الاستيراد.',true);e.target.value='';};
  document.getElementById('printBtn').onclick=()=>{if(specialPerm('print'))window.print();else toast('لا تملك صلاحية الطباعة.',true);};
  document.getElementById('logoutBtn').onclick=logoutUser;
  window.addEventListener('online',async()=>{updateLoginStatus();updateConnection();if(authState){const ok=await validateSession(true);if(ok&&authState){processQueue(false);renderCurrent(true);}}});
  window.addEventListener('offline',()=>{updateLoginStatus();updateConnection();});
  window.addEventListener('focus',()=>{if(authState&&navigator.onLine)validateSession(true);});
  init().catch(e=>{console.error(e);showLogin('تعذر تهيئة التطبيق. حاول إعادة فتح الصفحة.');});
})();
