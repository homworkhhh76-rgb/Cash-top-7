(() => {
  'use strict';

  const APP_VERSION = '6.8.0-classic-inventory';
  const DB_NAME_BASE = 'general-sales-company-v4';
  const DB_VERSION = 1;
  const AUTH_KEY = 'general-sales-auth-v7-direct';
  const LOGIN_HINT_KEY = 'general-sales-login-hint-v4';
  let authState = null;
  let validationTimer = null;
  let lastValidatedAt = 0;
  const VALIDATION_TTL = 4 * 60 * 1000;
  const REMOTE_PAGE_TTL = 90 * 1000;
  const REMOTE_SEARCH_TTL = 45 * 1000;
  const remoteSearchCache = new Map();
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
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    filter:'<path d="M4 5h16l-6.5 7.2V19l-3 1v-7.8L4 5Z"/>'
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
  function applyCompanyBranding(){if(!authState)return;const st=authState.company?.settings||{},name=st.companyName||authState.company?.name||'نظام المبيعات',logo=st.logoUrl||'logo.png';const img=document.getElementById('companyLogo');if(img){img.src=logo;img.onerror=()=>{img.onerror=null;img.src='logo.png';};}document.getElementById('companyName').textContent=name;document.getElementById('companySubline').textContent=[st.phone,st.address].filter(Boolean).join(' • ')||'المبيعات والحسابات والمخزون';const display=authState.user?.displayName||authState.user?.username||'المستخدم';document.getElementById('userDisplayName').textContent=display;document.getElementById('userRoleLabel').textContent=authState.user?.role==='owner'?'مالك الشركة':'موظف';document.getElementById('userAvatar').textContent=display.trim().slice(0,1)||'م';}
  function showLogin(reason=''){appShell.hidden=true;authScreen.hidden=false;authScreen.style.display='grid';updateLoginStatus();const h=loginHint();document.getElementById('companyKeyInput').value=h.companyKey||'';document.getElementById('usernameInput').value=h.username||'';document.getElementById('passwordInput').value='';if(reason)setLoginMessage(reason,true);setTimeout(()=>document.getElementById(h.companyKey?'passwordInput':'companyKeyInput')?.focus(),50);}
  function showApp(){authScreen.hidden=true;authScreen.style.display='none';appShell.hidden=false;setLoginMessage('');applyCompanyBranding();}
  async function forceLogout(reason='يرجى تسجيل الدخول من جديد.'){clearInterval(validationTimer);validationTimer=null;if(dbHandle){try{dbHandle.close();}catch{}dbHandle=null;}authState=null;saveAuth();showLogin(reason);}
  function authFailureCode(code){return ['SESSION_REQUIRED','SESSION_EXPIRED','LICENSE_EXPIRED','COMPANY_STOPPED','COMPANY_DELETED','USER_STOPPED'].includes(code);}
  async function validateSession(silent=true,force=false){if(!authState)return false;if(authExpiryPassed()){await forceLogout('يرجى تسجيل الدخول من جديد.');return false;}if(!navigator.onLine)return true;if(!force&&lastValidatedAt&&Date.now()-lastValidatedAt<VALIDATION_TTL)return true;try{const d=await api('/auth/validate',{method:'POST',publicRequest:false,skipAuthFailure:true});lastValidatedAt=Date.now();authState.company=d.company;authState.user=d.user;saveAuth();applyCompanyBranding();if(!appShell.hidden){navInit();if(!pageAllowed(currentPage)){currentPage=visiblePages()[0]?.[0]||'dashboard';localStorage.setItem(pageKey(),currentPage);await renderCurrent(false);}}return true;}catch(e){if(e.authFailure){await forceLogout(e.message||'يرجى تسجيل الدخول من جديد.');return false;}if(!silent)toast('تعذر التحقق الآن، وسيستمر العمل من النسخة المحلية.',true);return true;}}
  async function doLogin(companyKey,username,password){if(!navigator.onLine)throw new Error('يلزم اتصال بالإنترنت لتسجيل الدخول لأول مرة.');const d=await api('/auth/login',{method:'POST',body:JSON.stringify({companyKey,username,password}),publicRequest:true,skipAuthFailure:true});authState={token:d.token,sessionExpiresAt:d.sessionExpiresAt,company:d.company,user:d.user};lastValidatedAt=Date.now();saveAuth();saveLoginHint(companyKey,username);if(dbHandle){try{dbHandle.close();}catch{}dbHandle=null;}meta=loadMeta();currentPage=localStorage.getItem(pageKey())||'dashboard';if(!pageAllowed(currentPage))currentPage=visiblePages()[0]?.[0]||'dashboard';showApp();await startCompanyApp();}

  function loadMeta(){
    const base={capital:0,fxRate:3.7,dashboardYear:new Date().getFullYear(),selectedDate:today(),reportStart:today(),reportEnd:today(),remoteSeen:{},remoteFetchedAt:{},cache:{},cacheTimes:{},salesFilter:{open:false,preset:'all',date:'',start:'',end:'',code:''}};
    try {
      const saved=JSON.parse(localStorage.getItem(metaKey())||'{}'), merged=Object.assign(base,saved||{});
      merged.salesFilter=Object.assign({open:false,preset:'all',date:'',start:'',end:'',code:''},saved?.salesFilter||{});
      return merged;
    }
    catch { return base; }
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
  function searchText(r){ return `${r.name||''} ${r.code||''} ${r.category||''} ${r.unit||''} ${r.productName||''} ${r.productCode||''} ${r.supplierName||''} ${r.supplierCode||''} ${r.customerName||''} ${r.invoiceNo||''} ${r.warehouse||''} ${r.movementType||''} ${r.type||''} ${r.method||''} ${r.note||''}`.trim().toLowerCase(); }
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
  function invalidateLocalReportCaches(dataset){if(!meta)return;if(['sales','purchases','payments','debtors','creditors','expenses','fx','products','suppliers'].includes(dataset)){meta.cache=meta.cache||{};delete meta.cache.bank;delete meta.cache.dashboard;delete meta.cache.financial;delete meta.cache.stockCategories;meta.cacheTimes={};meta.remoteFetchedAt=meta.remoteFetchedAt||{};for(const key of Object.keys(meta.remoteFetchedAt)){if(key.startsWith(dataset+'|'))delete meta.remoteFetchedAt[key];}saveMeta();}}
  async function putLocalRecord(dataset, record, queue=true){
    const rec=normalizeRecord(dataset,record); const stores=queue?[dataset,'syncQueue']:[dataset];
    const write=()=>tx(stores,'readwrite',t=>{ t.objectStore(dataset).put(rec); if(queue) t.objectStore('syncQueue').put({opKey:`${dataset}:${rec.id}`,dataset,itemId:rec.id,type:'set',data:rec,createdAt:Date.now(),tries:0,nextTryAt:0,lastError:''}); });
    try{await write();}catch(e){if(!isQuotaError(e))throw e;await runCacheCleanup(true);await write();}
    invalidateLocalReportCaches(dataset);scheduleSync(); refreshPendingCount(); scheduleCacheCleanup(); return rec;
  }
  async function removeLocalRecord(dataset,id,queue=true){
    const stores=queue?[dataset,'syncQueue']:[dataset]; await tx(stores,'readwrite',t=>{ t.objectStore(dataset).delete(String(id)); if(queue)t.objectStore('syncQueue').put({opKey:`${dataset}:${id}`,dataset,itemId:String(id),type:'delete',data:{id:String(id),updatedAt:Date.now(),sortTs:Date.now()},createdAt:Date.now(),tries:0,nextTryAt:0,lastError:''}); }); invalidateLocalReportCaches(dataset);scheduleSync();refreshPendingCount();
  }

  async function saveSalesInvoiceBatch(records=[], deleteIds=[]){
    const now=Date.now(), normalized=records.map((r,i)=>normalizeRecord('sales',{...r,updatedAt:Math.max(n(r.updatedAt),now+i)}));
    const idsToDelete=[...new Set((deleteIds||[]).map(String).filter(Boolean).filter(id=>!normalized.some(r=>String(r.id)===id)))];
    const write=()=>tx(['sales','syncQueue'],'readwrite',t=>{
      const sales=t.objectStore('sales'),queue=t.objectStore('syncQueue');
      normalized.forEach((rec,i)=>{
        sales.put(rec);
        queue.put({opKey:`sales:${rec.id}`,dataset:'sales',itemId:rec.id,type:'set',data:rec,createdAt:now+i,tries:0,nextTryAt:0,lastError:''});
      });
      idsToDelete.forEach((id,i)=>{
        sales.delete(id);
        queue.put({opKey:`sales:${id}`,dataset:'sales',itemId:id,type:'delete',data:{id,updatedAt:now+normalized.length+i,sortTs:now+normalized.length+i},createdAt:now+normalized.length+i,tries:0,nextTryAt:0,lastError:''});
      });
    });
    try{await write();}catch(e){if(!isQuotaError(e))throw e;await runCacheCleanup(true);await write();}
    invalidateLocalReportCaches('sales');scheduleSync();await refreshPendingCount();scheduleCacheCleanup();return normalized;
  }

  async function saleInvoiceLinesFromRow(row){
    if(!row)return[];
    const invoiceNo=String(row.invoiceNo||'').trim();
    if(!invoiceNo)return[row];
    const map=new Map();
    await streamDataset('sales',r=>{if(String(r.invoiceNo||'')===invoiceNo)map.set(String(r.id),r);});
    if(navigator.onLine){
      try{
        const remote=await remoteSearch('sales',invoiceNo,80);
        for(const r of remote){if(String(r.invoiceNo||'')===invoiceNo){map.set(String(r.id),r);await putRemoteRecord('sales',r);}}
      }catch{}
    }
    if(!map.size)map.set(String(row.id),row);
    return [...map.values()].sort((a,b)=>(n(a.lineNo)-n(b.lineNo))||(n(a.sortTs)-n(b.sortTs)));
  }

  function nextInvoiceNo(){
    const d=new Date(),stamp=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    return `S-${stamp}-${String(Date.now()).slice(-5)}`;
  }

  async function recentStockMovements(limit=36){
    const [sales,purchases]=await Promise.all([
      dateRows('sales','0000-01-01','9999-12-31',Math.max(12,Math.ceil(limit*.65))),
      dateRows('purchases','0000-01-01','9999-12-31',Math.max(8,Math.ceil(limit*.45)))
    ]);
    return [
      ...sales.map(r=>({date:r.date||'',kind:'صادر',ref:r.invoiceNo||'فاتورة مبيعات',code:r.productCode||'',name:r.productName||'',qty:n(r.qty),warehouse:r.warehouse||'المخزن الرئيسي',note:r.lineNote||r.customerName||r.note||''})),
      ...purchases.map(r=>({date:r.date||'',kind:'وارد',ref:r.invoiceNo||'فاتورة مشتريات',code:r.productCode||'',name:r.productName||'',qty:n(r.qty),warehouse:r.warehouse||'المخزن الرئيسي',note:r.supplierName||''}))
    ].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,limit);
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
    if(!window.CashTopCloud?.request){const err=new Error('ملف الاتصال بقاعدة البيانات غير محمل.');err.code='CLOUD_ADAPTER_MISSING';throw err;}
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
  async function remoteSearch(dataset,q,limit=40){if(!navigator.onLine)return[];const term=String(q||'').trim().toLowerCase(),key=`${dataset}|${term}|${limit}`,cached=remoteSearchCache.get(key);if(cached&&Date.now()-cached.at<REMOTE_SEARCH_TTL)return cached.rows;const qs=new URLSearchParams({dataset,q:term,limit:String(limit)}),d=await api(`/records/search?${qs}`),rows=d.rows||[];remoteSearchCache.set(key,{at:Date.now(),rows});if(remoteSearchCache.size>80){const first=remoteSearchCache.keys().next().value;remoteSearchCache.delete(first);}return rows;}
  async function writeRemote(op){return api('/records/write',{method:'POST',body:JSON.stringify({dataset:op.dataset,id:op.itemId,action:op.type,record:op.data})});}
  async function cacheRemoteRows(dataset,rows){const list=(rows||[]).map(r=>normalizeRecord(dataset,r));if(!list.length)return;const write=()=>tx([dataset],'readwrite',t=>{const st=t.objectStore(dataset);list.forEach(r=>st.put(r));});try{await write();}catch(e){if(!isQuotaError(e))throw e;await runCacheCleanup(true);await write();}scheduleCacheCleanup();}
  async function refreshRemotePage(pageId,dataset,before){
    if(!navigator.onLine)return;try{if(!before)await pullCurrentChanges(dataset,2);const d=await remotePage(dataset,before);const p=pager(dataset),key=cursorKey(before);p.remoteMore=p.remoteMore||{};p.remoteMore[key]=Boolean(d?.hasMore);if(d?.rows?.length)await cacheRemoteRows(dataset,d.rows);meta.remoteFetchedAt=meta.remoteFetchedAt||{};meta.remoteFetchedAt[`${dataset}|${key}`]=Date.now();saveMeta();if(currentPage===pageId)renderCurrent(false);updateConnection();}catch(e){updateConnection();}
  }
  async function localLatestUpdatedAt(dataset){
    const db=await openDB();return new Promise((resolve,reject)=>{const req=db.transaction(dataset).objectStore(dataset).index('updatedAt').openCursor(null,'prev');req.onsuccess=()=>resolve(n(req.result?.value?.updatedAt));req.onerror=()=>reject(req.error);});
  }
  async function pullCurrentChanges(dataset,maxPages=2){
    if(!navigator.onLine)return;
    let since=n(meta.remoteSeen?.[dataset]);
    if(!since){const latest=await localLatestUpdatedAt(dataset).catch(()=>0);if(!latest){meta.remoteSeen[dataset]=Date.now();saveMeta();return;}since=latest;meta.remoteSeen[dataset]=since;saveMeta();}
    try{
      for(let page=0;page<Math.max(1,maxPages);page++){
        const d=await api(`/records/changes?dataset=${encodeURIComponent(dataset)}&since=${since}&limit=100`),rows=d.rows||[];let max=since;
        for(const row of rows){max=Math.max(max,n(row.updatedAt));if(row.deleted)await deleteRemoteRecord(dataset,row.id);else await putRemoteRecord(dataset,row.record);}
        since=max;meta.remoteSeen[dataset]=since;saveMeta();if(rows.length<100)break;
      }
      scheduleCacheCleanup();
    }catch{}
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
    if(authExpiryPassed()){await forceLogout('يرجى تسجيل الدخول من جديد.');return;}
    if(!navigator.onLine){updateConnection();if(manual)toast('لا يوجد اتصال. العمليات باقية محليًا وستزامن تلقائيًا.',true);return;}
    syncRunning=true;syncBtn.classList.add('syncing');syncBtn.setAttribute('aria-busy','true');
    try{
      const valid=await validateSession(true);if(!valid||!authState)return;
      let loops=0,totalOk=0,totalFailed=0;
      while(loops++<8){const items=await dueQueue(24,manual&&loops===1);if(!items.length)break;await runPool(items,async op=>{try{await writeRemote(op);await deleteQueueOp(op.opKey);totalOk++;}catch(e){if(e.authFailure)throw e;await updateQueueFailure(op,e);totalFailed++;}},1);if(items.length<24)break;}
      scheduleCacheCleanup(250);
      if(manual)toast(totalFailed?`تمت مزامنة ${totalOk} وبقي ${totalFailed} للمحاولة لاحقًا.`:`تمت المزامنة بنجاح${totalOk?` (${totalOk} عملية)`:''}.`,false);
    }catch(e){if(e.authFailure){await forceLogout(e.message||'يرجى تسجيل الدخول من جديد.');}else if(manual)toast('تعذر الاتصال بقاعدة البيانات. الطابور محفوظ وسيستمر تلقائيًا.',true);}
    finally{syncBtn.classList.remove('syncing');syncBtn.removeAttribute('aria-busy');syncRunning=false;if(authState){await refreshPendingCount();updateConnection();}}
  }
  async function refreshPendingCount(){try{const db=await openDB();const count=await new Promise((resolve,reject)=>{const r=db.transaction('syncQueue').objectStore('syncQueue').count();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});pendingBadge.textContent=count>999?'999+':String(count);pendingBadge.hidden=!count;return count;}catch{return 0;}}
  function updateConnection(){connectionText.textContent=navigator.onLine?'متصل - المزامنة جاهزة':'غير متصل - العمل من النسخة المحلية';connectionText.style.color=navigator.onLine?'#15803d':'#b91c1c';}

  function pager(dataset){return pagers[dataset]||(pagers[dataset]={before:null,stack:[],page:1,next:null,hasMore:false,remoteMore:{}});}
  function pagerHTML(dataset){const p=pager(dataset);return `<div class="pager"><button class="btn light" data-page-prev="${dataset}" ${p.stack.length?'':'disabled'}>السابق</button><span class="page-count">صفحة ${p.page}</span><button class="btn light" data-page-next="${dataset}" ${p.hasMore?'':'disabled'}>التالي</button></div>`;}
  function salesFilterState(){meta.salesFilter=Object.assign({open:false,preset:'all',date:'',start:'',end:'',code:''},meta.salesFilter||{});return meta.salesFilter;}
  function isoLocalDate(d){const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;}
  function daysAgo(days){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-Math.max(0,n(days)));return isoLocalDate(d);}
  function salesFilterBounds(f=salesFilterState()){
    const t=today(),preset=f.preset||'all';
    if(preset==='day')return{start:t,end:t};
    if(preset==='week')return{start:daysAgo(6),end:t};
    if(preset==='month')return{start:daysAgo(29),end:t};
    if(preset==='year')return{start:daysAgo(364),end:t};
    if(preset==='date'){const d=f.date||t;return{start:d,end:d};}
    if(preset==='range'){let a=f.start||t,b=f.end||t;if(a>b)[a,b]=[b,a];return{start:a,end:b};}
    return{start:'',end:''};
  }
  function salesFilterActive(f=salesFilterState()){const b=salesFilterBounds(f);return Boolean(String(f.code||'').trim()||b.start||b.end);}
  function resetSalesPager(){const p=pager('sales');p.before=null;p.stack=[];p.page=1;p.next=null;p.hasMore=false;p.remoteMore={};}
  function salesFilterKey(f=salesFilterState(),before=null){const b=salesFilterBounds(f);return JSON.stringify([f.preset,b.start,b.end,String(f.code||'').trim(),cursorKey(before)]);}
  async function localFilteredSalesPage(before=null,filter=salesFilterState(),limit=PAGE_SIZE()){
    const bounds=salesFilterBounds(filter),code=String(filter.code||'').trim(),db=await openDB();
    return new Promise((resolve,reject)=>{
      const idx=db.transaction('sales').objectStore('sales').index('sort'),range=before?IDBKeyRange.upperBound([n(before.sortTs),String(before.id)],true):null,req=idx.openCursor(range,'prev'),rows=[];
      req.onsuccess=()=>{const c=req.result;if(!c){finish();return;}const r=c.value,date=String(r.date||'');
        const dateOk=(!bounds.start||date>=bounds.start)&&(!bounds.end||date<=bounds.end),codeOk=!code||String(r.productCode||'')===code;
        if(dateOk&&codeOk)rows.push(r);
        if(rows.length>=limit+1){finish();return;}c.continue();
      };
      req.onerror=()=>reject(req.error);
      function finish(){const hasMore=rows.length>limit;if(hasMore)rows.pop();const last=rows[rows.length-1];resolve({rows,hasMore,next:last?{sortTs:last.sortTs,id:last.id}:null});}
    });
  }
  const salesFilterPageCache=new Map();
  async function remoteFilteredSalesPage(before=null,filter=salesFilterState()){
    const bounds=salesFilterBounds(filter),qs=new URLSearchParams({dataset:'sales',limit:String(PAGE_SIZE())});
    if(bounds.start)qs.set('start',bounds.start);if(bounds.end)qs.set('end',bounds.end);
    const code=String(filter.code||'').trim();if(code)qs.set('code',code);
    if(before?.sortTs&&before?.id){qs.set('beforeSortTs',String(before.sortTs));qs.set('beforeId',String(before.id));}
    return api(`/records/filter?${qs}`);
  }
  async function salesPageData(syncRemote){
    const f=salesFilterState();
    if(!salesFilterActive(f))return pageData('sales','sales',syncRemote);
    const p=pager('sales'),cacheKey=salesFilterKey(f,p.before),cached=salesFilterPageCache.get(cacheKey);
    if(navigator.onLine&&(syncRemote||!cached||Date.now()-cached.at>60000)){
      try{
        const d=await remoteFilteredSalesPage(p.before,f),rows=d.rows||[];
        if(rows.length)await cacheRemoteRows('sales',rows);
        p.next=d.next||null;p.hasMore=Boolean(d.hasMore);
        salesFilterPageCache.set(cacheKey,{at:Date.now(),rows,next:p.next,hasMore:p.hasMore});
        return rows;
      }catch{}
    }
    if(cached){p.next=cached.next||null;p.hasMore=Boolean(cached.hasMore);return cached.rows||[];}
    const d=await localFilteredSalesPage(p.before,f);p.next=d.next;p.hasMore=d.hasMore;return d.rows;
  }
  function salesFilterPanelHTML(){
    const f=salesFilterState(),b=salesFilterBounds(f),active=salesFilterActive(f),presets=[['all','الكل'],['day','آخر يوم'],['week','آخر أسبوع'],['month','آخر شهر'],['year','آخر سنة'],['date','تاريخ محدد'],['range','من تاريخ إلى تاريخ']];
    return `<div class="sales-filter-panel ${f.open?'open':''}" id="salesFilterPanel" ${f.open?'':'hidden'}>
      <div class="sales-filter-presets">${presets.map(([v,l])=>`<button type="button" class="filter-chip ${f.preset===v?'active':''}" data-sales-preset="${v}">${l}</button>`).join('')}</div>
      <div class="sales-filter-fields">
        <label class="sales-filter-date ${f.preset==='date'?'show':''}"><span>التاريخ</span><input class="input numeric-ltr" id="salesFilterDate" type="date" value="${esc(f.date||today())}"></label>
        <label class="sales-filter-range ${f.preset==='range'?'show':''}"><span>من</span><input class="input numeric-ltr" id="salesFilterStart" type="date" value="${esc(f.start||b.start||today())}"></label>
        <label class="sales-filter-range ${f.preset==='range'?'show':''}"><span>إلى</span><input class="input numeric-ltr" id="salesFilterEnd" type="date" value="${esc(f.end||b.end||today())}"></label>
        <label class="sales-filter-code"><span>كود الصنف</span><input class="input numeric-ltr" id="salesFilterCode" type="text" inputmode="numeric" value="${esc(f.code||'')}" placeholder="اكتب كود الصنف"></label>
        <div class="sales-filter-actions"><button type="button" class="btn" id="applySalesFilter">${svg('filter')}تطبيق</button><button type="button" class="btn light" id="clearSalesFilter">مسح الفلترة</button></div>
      </div>
      ${active?`<div class="sales-filter-active">الفلترة مفعلة${f.code?` • كود الصنف: <strong>${esc(f.code)}</strong>`:''}${b.start?` • من ${esc(b.start)} إلى ${esc(b.end)}`:''}</div>`:''}
    </div>`;
  }
  function sheet(title,cls,body,subtitle=''){return `<section class="sheet"><div class="sheet-title ${cls}">${esc(title)}</div>${subtitle?`<div class="sheet-subtitle">${esc(subtitle)}</div>`:''}<div class="sheet-body">${body}</div></section>`;}
  function kpi(label,value,cls=''){return `<div class="kpi ${cls}"><span>${esc(label)}</span><strong>${value}</strong></div>`;}
  function emptyRow(cols,text='لا توجد سجلات حتى الآن'){return `<tr><td class="empty" colspan="${cols}">${esc(text)}</td></tr>`;}
  function actionButtons(type,id){const parts=[];if(typeAllowed(type,'edit'))parts.push(`<button class="btn small light" data-edit="${type}" data-id="${esc(id)}">${svg('edit')}تعديل</button>`);if(typeAllowed(type,'delete'))parts.push(`<button class="btn small red" data-delete="${type}" data-id="${esc(id)}">${svg('trash')}حذف</button>`);return parts.length?`<div class="row-actions">${parts.join('')}</div>`:'—';}
  function addButton(type,label='إضافة سجل',cls=''){return typeAllowed(type,'create')?`<button class="btn ${cls}" data-add="${type}">${svg('plus')}${esc(label)}</button>`:'';}
  function loading(){return `<section class="sheet"><div class="loading-box"><div class="loading-line"></div><div class="loading-line"></div><div class="loading-line"></div></div></section>`;}

  function cursorKey(before){return before?`${n(before.sortTs)}|${String(before.id)}`:'start';}
  async function pageData(pageId,dataset,syncRemote){const p=pager(dataset),key=cursorKey(p.before),data=await localPage(dataset,p.before);p.next=data.next;p.hasMore=data.hasMore||Boolean(p.remoteMore?.[key]);const fetched=n(meta.remoteFetchedAt?.[`${dataset}|${key}`]);const stale=!fetched||Date.now()-fetched>REMOTE_PAGE_TTL;if(syncRemote&&navigator.onLine&&(stale||!data.rows.length))setTimeout(()=>refreshRemotePage(pageId,dataset,p.before),0);return data.rows;}
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
    const dashboardCache=meta.cache.dashboard?.[year],dashboardAt=n(meta.cacheTimes?.[`dashboard:${year}`]);
    if(dashboardCache?.length&&Date.now()-dashboardAt<120000)rows=dashboardCache;
    if(navigator.onLine&&(!rows.length||Date.now()-dashboardAt>=120000)){try{const d=await api(`/metrics/dashboard?year=${year}`);rows=d.months||[];meta.cache.dashboard=meta.cache.dashboard||{};meta.cache.dashboard[year]=rows;meta.cacheTimes=meta.cacheTimes||{};meta.cacheTimes[`dashboard:${year}`]=Date.now();saveMeta();}catch{}}
    if(!rows.length&&dashboardCache)rows=dashboardCache;
    if(!rows.length){const months=Array.from({length:12},(_,i)=>({month:String(i+1).padStart(2,'0'),revenue:0,cogs:0,gross:0,expenses:0,net:0}));const by=Object.fromEntries(months.map(x=>[x.month,x]));await streamDataset('sales',r=>{if((r.date||'').startsWith(`${year}-`)){const m=r.date.slice(5,7);by[m].revenue+=saleTotal(r);}});await streamDataset('expenses',r=>{if((r.date||'').startsWith(`${year}-`)){const m=r.date.slice(5,7);by[m].expenses+=n(r.amount);}});rows=months.map(x=>({...x,gross:x.revenue-x.cogs,net:x.revenue-x.cogs-x.expenses}));}
    const names=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];const total=rows.reduce((a,r)=>{a.revenue+=n(r.revenue);a.cogs+=n(r.cogs);a.gross+=n(r.gross);a.expenses+=n(r.expenses);a.net+=n(r.net);return a;},{revenue:0,cogs:0,gross:0,expenses:0,net:0});
    const body=`<div class="action-row"><div class="inline-filter"><label>السنة:</label><input class="input" id="dashboardYear" type="number" min="2000" max="2100" value="${year}"></div><span class="note">التقارير السحابية تُحسب كإجماليات بدون تنزيل كل السجلات.</span></div><div class="summary-grid four">${kpi('إجمالي المبيعات',money(total.revenue)+' ₪','dark')}${kpi('مجمل الربح',money(total.gross)+' ₪','green')}${kpi('المصروفات',money(total.expenses)+' ₪','red')}${kpi('صافي الربح',money(total.net)+' ₪',total.net>=0?'green':'red')}</div><div class="table-wrap"><table class="excel"><thead><tr><th>الشهر</th><th>المبيعات</th><th>تكلفة البضاعة</th><th>مجمل الربح</th><th>المصروفات</th><th>صافي الربح</th><th>الهامش</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${names[i]||r.month}</td><td>${money(r.revenue)}</td><td>${money(r.cogs)}</td><td>${money(r.gross)}</td><td>${money(r.expenses)}</td><td>${money(r.net)}</td><td>${pct(n(r.revenue)?n(r.net)/n(r.revenue):0)}</td></tr>`).join('')}</tbody></table></div><div class="chart-grid"><div class="chart-card"><h3>المبيعات الشهرية</h3><canvas id="dashboardChart1"></canvas></div><div class="chart-card"><h3>صافي الربح الشهري</h3><canvas id="dashboardChart2"></canvas></div></div>`;
    setTimeout(()=>{canvasBars('dashboardChart1',names,[{label:'المبيعات',values:rows.map(r=>n(r.revenue))},{label:'مجمل الربح',values:rows.map(r=>n(r.gross))}]);canvasBars('dashboardChart2',names,[{label:'صافي الربح',values:rows.map(r=>n(r.net))}]);},0);return sheet('لوحة التحكم والتحليل المالي','dashboard',body);
  }
  async function renderInventory(syncRemote){
    const products=await pageData('inventory','products',syncRemote);
    const codes=products.map(r=>String(r.code));
    const stats=await inventoryStatsBatch(codes);
    const rows=products.map(p=>({
      ...p,
      ...(stats[String(p.code)]||{purchasedQty:0,purchaseValue:0,soldQty:0,salesValue:0,remainingQty:0,avgCost:0,endingInventory:0,profit:0})
    })).sort((a,b)=>String(a.category||'غير مصنف').localeCompare(String(b.category||'غير مصنف'),'ar') || String(a.code||'').localeCompare(String(b.code||''),'ar',{numeric:true}));

    const totalOf=list=>{
      const t=list.reduce((a,r)=>{a.purchasedQty+=n(r.purchasedQty);a.soldQty+=n(r.soldQty);a.purchaseValue+=n(r.purchaseValue);a.salesValue+=n(r.salesValue);a.remainingQty+=n(r.remainingQty);a.endingInventory+=n(r.endingInventory);a.profit+=n(r.profit);return a;},{purchasedQty:0,soldQty:0,purchaseValue:0,salesValue:0,remainingQty:0,endingInventory:0,profit:0});
      t.avgCost=t.purchasedQty?t.purchaseValue/t.purchasedQty:0;
      return t;
    };
    const groupColors={'رجالي':'#ff0000','محير':'#7030a0','ولادي':'#8064a2','تركي':'#c00000','صيني':'#002060'};
    const palette=['#7c3aed','#0f766e','#b45309','#0369a1','#be123c','#4f46e5','#15803d','#9f1239'];
    const colorFor=cat=>{
      if(groupColors[cat])return groupColors[cat];
      let h=0;for(const ch of String(cat||'غير مصنف'))h=((h<<5)-h+ch.charCodeAt(0))|0;
      return palette[Math.abs(h)%palette.length];
    };
    const categories=[...new Set(rows.map(r=>String(r.category||'غير مصنف')))],allRows=[];
    for(const cat of categories){
      const catRows=rows.filter(r=>String(r.category||'غير مصنف')===cat);
      for(const r of catRows){
        allRows.push(`<tr>
          <td>${esc(r.code)}</td>
          <td class="text-right">${esc(r.name)}</td>
          <td>${esc(r.unit)}</td>
          <td>${qty(r.purchasedQty)}</td>
          <td>${qty(r.soldQty)}</td>
          <td>${money(r.purchaseValue)}</td>
          <td>${money(r.salesValue)}</td>
          <td>${qty(r.remainingQty)}</td>
          <td>${money(r.avgCost)}</td>
          <td>${money(r.endingInventory)}</td>
          <td>${money(r.profit)}</td>
          <td>${actionButtons('product',r.id)}</td>
        </tr>`);
      }
      const c=totalOf(catRows);
      allRows.push(`<tr class="group-row" style="--group-color:${colorFor(cat)}"><td colspan="3">إجمالي ${esc(cat)}</td><td>${qty(c.purchasedQty)}</td><td>${qty(c.soldQty)}</td><td>${money(c.purchaseValue)}</td><td>${money(c.salesValue)}</td><td>${qty(c.remainingQty)}</td><td>${money(c.avgCost)}</td><td>${money(c.endingInventory)}</td><td>${money(c.profit)}</td><td>—</td></tr>`);
    }
    const total=totalOf(rows);
    const body=`<div class="action-row classic-inventory-actions">${addButton('product','إضافة صنف','green')}<span class="note">المخزون يُحسب تلقائيًا من رصيد أول المدة + المشتريات - المبيعات.</span></div>
      <div class="table-wrap inventory-classic-wrap"><table class="excel inventory-table classic-inventory-table"><thead>
        <tr class="inventory-summary-row"><th>الإجمالي</th><th colspan="2"></th><th>${qty(total.purchasedQty)}</th><th>${qty(total.soldQty)}</th><th>${money(total.purchaseValue)}</th><th>${money(total.salesValue)}</th><th>${qty(total.remainingQty)}</th><th>${money(total.avgCost)}</th><th>${money(total.endingInventory)}</th><th>${money(total.profit)}</th><th>إدارة</th></tr>
        <tr><th>كود الصنف</th><th>اسم الصنف</th><th>الوحدة</th><th>الكمية المشتراة</th><th>الكمية المباعة</th><th>إجمالي المشتريات</th><th>إجمالي المبيعات</th><th>الكمية المتبقية</th><th>متوسط السعر</th><th>مخزون آخر المدة</th><th>الربح</th><th>إدارة</th></tr>
      </thead><tbody>${allRows.length?allRows.join(''):emptyRow(12)}</tbody></table></div>${pagerHTML('products')}`;
    return sheet('غزل للأحذية 📦 - نظام إدارة المخزن','inventory',body);
  }
  async function renderSuppliers(syncRemote){const rows=await pageData('suppliers','suppliers',syncRemote);const stats=await supplierStatsBatch(rows.map(r=>String(r.code)));const totals=Object.values(stats).reduce((a,s)=>({due:a.due+n(s.due),paid:a.paid+n(s.paid),balance:a.balance+n(s.balance)}),{due:0,paid:0,balance:0});const body=`<div class="action-row">${addButton('supplier','إضافة مورد','red')}</div><div class="summary-grid">${kpi('مستحقات الصفحة',money(totals.due)+' ₪','cyan')}${kpi('مدفوعات الصفحة',money(totals.paid)+' ₪','cyan')}${kpi('رصيد الصفحة',money(totals.balance)+' ₪','cyan')}</div><div class="table-wrap"><table class="excel"><thead><tr><th>رقم المورد</th><th>اسم المورد</th><th>المستحقات</th><th>البنكي</th><th>النقدي</th><th>المدفوع</th><th>المتبقي</th><th>إدارة</th></tr></thead><tbody>${rows.length?rows.map(r=>{const s=stats[String(r.code)]||{};return`<tr><td>${esc(r.code)}</td><td>${esc(r.name)}</td><td>${money(s.due)}</td><td>${money(s.bank)}</td><td>${money(s.cash)}</td><td>${money(s.paid)}</td><td class="bold">${money(s.balance)}</td><td>${actionButtons('supplier',r.id)}</td></tr>`}).join(''):emptyRow(8)}</tbody></table></div>${pagerHTML('suppliers')}`;return sheet('سجل الموردين وحسابات الأرصدة','suppliers',body);}
  async function renderLedger(kind,syncRemote){const dataset=kind==='debtor'?'debtors':'creditors',pageId=dataset;const rows=await pageData(pageId,dataset,syncRemote);const sm=await datasetSummary(dataset);const party=kind==='debtor'?'اسم الزبون / الجهة':'اسم الجهة';const body=`<div class="action-row">${addButton(kind,'إضافة حركة')}</div><div class="summary-grid">${kpi('الإجمالي',money(sm.total)+' ₪')}${kpi('البنكي',money(sm.bank)+' ₪')}${kpi('النقدي',money(sm.cash)+' ₪')}</div><div class="table-wrap"><table class="excel"><thead><tr><th>التاريخ</th><th>${party}</th><th>طريقة الدفع</th><th>المبلغ</th><th>الملاحظات</th><th>إدارة</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.name)}</td><td>${esc(r.method)}</td><td>${money(r.amount)}</td><td>${esc(r.note)}</td><td>${actionButtons(kind,r.id)}</td></tr>`).join(''):emptyRow(6)}</tbody></table></div>${pagerHTML(dataset)}`;return sheet(kind==='debtor'?'سجل المدينين والذمم المالية':'سجل الدائنين والذمم الدائنة','navy',body);}
  async function renderPurchases(syncRemote){const rows=await pageData('purchases','purchases',syncRemote);const body=`<div class="action-row">${addButton('purchase','إضافة مشتريات','red')}<span class="note">اختيار المورد والمنتج يدعم البحث بالاسم أو الكود.</span></div><div class="table-wrap"><table class="excel"><thead><tr><th>التاريخ</th><th>المورد</th><th>المنتج</th><th>السعر</th><th>الكمية</th><th>الإجمالي</th><th>الخصم</th><th>الصافي</th><th>إدارة</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.supplierName||r.supplierCode)}</td><td>${esc(r.productName||r.productCode)}</td><td>${money(r.price)}</td><td>${qty(r.qty)}</td><td>${money(n(r.price)*n(r.qty))}</td><td>${money(r.discount)}</td><td>${money(purchaseNet(r))}</td><td>${actionButtons('purchase',r.id)}</td></tr>`).join(''):emptyRow(9)}</tbody></table></div>${pagerHTML('purchases')}`;return sheet('سجل المشتريات','purchases',body);}
  async function renderSales(syncRemote){
    const rows=await salesPageData(syncRemote),groups=new Map();
    for(const r of rows){const key=String(r.invoiceNo||`legacy:${r.id}`);if(!groups.has(key))groups.set(key,{key,invoiceNo:r.invoiceNo||'—',date:r.date||'',customerName:r.customerName||'',warehouse:r.warehouse||'المخزن الرئيسي',note:r.note||'',items:[],total:0,cash:0,bank:0,due:0,anchorId:r.id});const g=groups.get(key),v=saleTotal(r),payment=normalizeSalePayment(r.paymentMethod||r.type);g.items.push(r);g.total+=v;if(payment==='بيع بنكي')g.bank+=v;else if(payment==='بيع عالحساب')g.due+=v;else g.cash+=v;}
    const invoices=[...groups.values()];
    const details=g=>g.items.slice(0,3).map(x=>`${esc(x.productCode||'')} - ${esc(x.productName||'')} × ${qty(x.qty)} <span class="sale-pay-tag">${esc(normalizeSalePayment(x.paymentMethod||x.type).replace('بيع ','').replace('عالحساب','على الحساب'))}</span>`).join('<br>')+(g.items.length>3?`<br><span class="note">+ ${g.items.length-3} أصناف</span>`:'');
    const actions=g=>{const p=[];if(typeAllowed('sale','edit'))p.push(`<button class="btn small light" data-invoice-edit="${esc(g.anchorId)}">${svg('edit')}تعديل الفاتورة</button>`);if(typeAllowed('sale','delete'))p.push(`<button class="btn small red" data-invoice-delete="${esc(g.anchorId)}">${svg('trash')}حذف الفاتورة</button>`);return p.length?`<div class="row-actions">${p.join('')}</div>`:'—';};
    const pageTotals=invoices.reduce((a,g)=>({total:a.total+g.total,cash:a.cash+g.cash,bank:a.bank+g.bank,due:a.due+g.due}),{total:0,cash:0,bank:0,due:0});const paySummary=g=>`<div class="invoice-pay-breakdown"><span>نقدي ${money(g.cash)}</span><span>بنكي ${money(g.bank)}</span><span>حساب ${money(g.due)}</span></div>`;const filter=salesFilterState();const body=`<div class="action-row sales-actions-row">${addButton('sale','فاتورة مبيعات جديدة')}<button type="button" class="btn light icon-filter ${salesFilterActive(filter)?'active':''}" id="salesFilterToggle" title="فلترة المبيعات">${svg('filter')}<span>فلترة</span></button><span class="note">يمكنك الفلترة بالتاريخ أو كود الصنف للوصول إلى البيع وتعديله بسرعة.</span></div>${salesFilterPanelHTML()}<div class="summary-grid four">${kpi('إجمالي البيع',money(pageTotals.total)+' ₪','dark')}${kpi('النقدي',money(pageTotals.cash)+' ₪','green')}${kpi('البنكي',money(pageTotals.bank)+' ₪','cyan')}${kpi('على الحساب',money(pageTotals.due)+' ₪')}</div><div class="table-wrap"><table class="excel sales-invoice-list"><thead><tr><th>التاريخ</th><th>رقم الفاتورة</th><th>الزبون</th><th>توزيع الدفع</th><th>المخزن</th><th>الأصناف</th><th>الإجمالي</th><th>إدارة</th></tr></thead><tbody>${invoices.length?invoices.map(g=>`<tr><td>${esc(g.date)}</td><td><strong>${esc(g.invoiceNo)}</strong></td><td>${esc(g.customerName||'زبون نقدي')}</td><td>${paySummary(g)}</td><td>${esc(g.warehouse)}</td><td class="text-right invoice-items-cell">${details(g)}</td><td><strong>${money(g.total)}</strong></td><td>${actions(g)}</td></tr>`).join(''):emptyRow(8)}</tbody></table></div>${pagerHTML('sales')}`;return sheet('فواتير المبيعات','sales',body,'فاتورة متعددة الأصناف وطرق الدفع');}
  async function renderPayments(syncRemote){const rows=await pageData('payments','payments',syncRemote);const body=`<div class="action-row">${addButton('payment','إضافة دفعة')}</div><div class="table-wrap"><table class="excel"><thead><tr><th>التاريخ</th><th>المورد</th><th>طريقة الدفع</th><th>المبلغ</th><th>إدارة</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.supplierName||r.supplierCode)}</td><td>${esc(r.method)}</td><td>${money(r.amount)}</td><td>${actionButtons('payment',r.id)}</td></tr>`).join(''):emptyRow(5)}</tbody></table></div>${pagerHTML('payments')}`;return sheet('المدفوعات للموردين','teal',body);}
  async function renderExpenses(syncRemote){const rows=await pageData('expenses','expenses',syncRemote);const sm=await datasetSummary('expenses');const body=`<div class="action-row">${addButton('expense','إضافة مصروف','red')}</div><div class="summary-grid">${kpi('إجمالي المصروفات',money(sm.total)+' ₪','red')}${kpi('البنكية',money(sm.bank)+' ₪')}${kpi('النقدية',money(sm.cash)+' ₪')}</div><div class="table-wrap"><table class="excel"><thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>البيان</th><th>إدارة</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.type)}</td><td>${money(r.amount)}</td><td>${esc(r.note)}</td><td>${actionButtons('expense',r.id)}</td></tr>`).join(''):emptyRow(5)}</tbody></table></div>${pagerHTML('expenses')}`;return sheet('المصروفات','expenses',body);}
  async function renderFx(syncRemote){const rows=await pageData('fx','fx',syncRemote);const body=`<div class="action-row">${addButton('fx','إضافة حركة عملة','red')}</div><div class="table-wrap"><table class="excel"><thead><tr><th>التاريخ</th><th>النوع</th><th>الدولار</th><th>طريقة الدفع</th><th>سعر الشراء</th><th>سعر الصرف</th><th>القيمة بالشيكل</th><th>إدارة</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.type)}</td><td>${money(r.usd)} $</td><td>${esc(r.method)}</td><td>${n(r.buyRate).toFixed(4)}</td><td>${n(r.exchangeRate).toFixed(4)}</td><td>${money(n(r.usd)*(n(r.buyRate)||n(r.exchangeRate)))}</td><td>${actionButtons('fx',r.id)}</td></tr>`).join(''):emptyRow(8)}</tbody></table></div>${pagerHTML('fx')}`;return sheet('سجل العملات الأجنبية','fx',body);}
  async function renderBank(){
    let rows=[],totalIn=0,totalOut=0;
    const bankAt=n(meta.cacheTimes?.bank);if(meta.cache.bank?.rows&&Date.now()-bankAt<90000)({rows,totalIn,totalOut}=meta.cache.bank);
    if(navigator.onLine&&(!rows.length||Date.now()-bankAt>=90000)){try{const d=await api(`/metrics/bank?limit=${PAGE_SIZE()}`);rows=d.rows||[];totalIn=n(d.totalIn);totalOut=n(d.totalOut);meta.cache.bank={rows,totalIn,totalOut};meta.cacheTimes=meta.cacheTimes||{};meta.cacheTimes.bank=Date.now();saveMeta();}catch{}}
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
    return sheet('حساب البنك','teal',`<div class="summary-grid">${kpi('إجمالي الداخل',money(totalIn)+' ₪','green')}${kpi('إجمالي الخارج',money(totalOut)+' ₪','red')}${kpi('الرصيد',money(totalIn-totalOut)+' ₪','dark')}</div><div class="table-wrap"><table class="excel"><thead><tr><th>التاريخ</th><th>البيان</th><th>داخل</th><th>خارج</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.desc)}</td><td>${money(r.in)}</td><td>${money(r.out)}</td></tr>`).join(''):emptyRow(4)}</tbody></table></div><p class="note">عند الاتصال تُقرأ الحركات من قاعدة البيانات حسب الحاجة، وعند عدم الاتصال تُستخدم النسخة المحلية/المخبأة.</p>`);
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
    const key=`${start}|${end}`,cacheKey=`financial:${key}`,cached=meta.cache.financial?.[key],at=n(meta.cacheTimes?.[cacheKey]);
    if(cached&&Date.now()-at<120000)return cached;
    if(navigator.onLine){try{const d=await api(`/metrics/financial?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);meta.cache.financial=meta.cache.financial||{};meta.cache.financial[key]=d;meta.cacheTimes=meta.cacheTimes||{};meta.cacheTimes[cacheKey]=Date.now();saveMeta();return d;}catch{}}
    if(cached)return cached;
    return localFinancial(start,end);
  }
  async function renderBalance(){const f=await financialSummary();const body=`<div class="balance-toolbar"><label for="capitalInput">رأس المال</label><input id="capitalInput" class="input" type="number" inputmode="decimal" step="0.01" value="${n(meta.capital)}"></div><div class="balance-grid"><section class="balance-card"><div class="section-band blue">الأصول</div><div class="balance-table-wrap"><table class="excel balance-table"><tbody><tr><td>إجمالي المبيعات</td><td>${money(f.revenue)} ₪</td></tr><tr><td>المدينون</td><td>${money(f.debtorsTotal)} ₪</td></tr></tbody></table></div></section><section class="balance-card"><div class="section-band blue">الالتزامات وحقوق الملكية</div><div class="balance-table-wrap"><table class="excel balance-table"><tbody><tr><td>الدائنون</td><td>${money(f.creditorsTotal)} ₪</td></tr><tr><td>رأس المال</td><td>${money(meta.capital)} ₪</td></tr></tbody></table></div></section></div><p class="note balance-note">عند عدم توفر الإنترنت يعرض التطبيق البيانات الموجودة في الكاش المحلي فقط.</p>`;return sheet('الميزانية العمومية','balance',body);}
  async function renderStockCharts(){
    let chartRows=[];const stockAt=n(meta.cacheTimes?.stockCategories);if(meta.cache.stockCategories?.length&&Date.now()-stockAt<120000)chartRows=meta.cache.stockCategories;
    if(navigator.onLine&&(!chartRows.length||Date.now()-stockAt>=120000)){try{const d=await api('/metrics/stock-categories?limit=16');chartRows=d.rows||[];meta.cache.stockCategories=chartRows;meta.cacheTimes=meta.cacheTimes||{};meta.cacheTimes.stockCategories=Date.now();saveMeta();}catch{}}
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
  async function renderAnalysis(){const f=await financialSummary();const margin=f.revenue?f.net/f.revenue:0;return sheet('التحليل المالي','dashboard',`<div class="analysis-grid"><div class="analysis-card"><span>إجمالي المبيعات</span><strong>${money(f.revenue)} ₪</strong><small>السجلات المتاحة من السحابة أو النسخة المحلية</small></div><div class="analysis-card"><span>صافي الربح التقديري</span><strong>${money(f.net)} ₪</strong><small>بعد المشتريات والمصروفات</small></div><div class="analysis-card"><span>هامش صافي الربح</span><strong>${pct(margin)}</strong><small>صافي الربح ÷ المبيعات</small></div><div class="analysis-card"><span>الذمم</span><strong>${money(f.debtorsTotal-f.creditorsTotal)} ₪</strong><small>مدينون ناقص دائنون</small></div></div>`);}

  const permissionModules=[
    ['dashboard','لوحة التحكم',false],['inventory','المخزن',true],['suppliers','الموردون',true],['debtors','المدينون',true],['purchases','المشتريات',true],['sales','المبيعات',true],['payments','المدفوعات',true],['bank','حساب البنك',false],['creditors','الدائنون',true],['balance','الميزانية العمومية',false],['expenses','المصروفات',true],['stockCharts','رسومات المخزن',false],['daily','التقرير اليومي',false],['comprehensive','التقرير الشامل',false],['income','قائمة الدخل',false],['fx','العملات الأجنبية',true],['analysis','التحليل المالي',false]
  ];
  function blankEmployeePermissions(){const modules={};for(const [id,,crud] of permissionModules)modules[id]={view:false,create:false,edit:false,delete:false};modules.users={view:false,create:false,edit:false,delete:false};modules.settings={view:false,create:false,edit:false,delete:false};return{modules,special:{manageUsers:false,manageSettings:false,export:false,import:false,print:false,sync:true}};}
  function permissionMatrixHTML(perms){const p=perms||blankEmployeePermissions();return `<div class="permission-wrap"><div class="permission-title">صلاحيات الأقسام</div><div class="permission-table"><div class="perm-head"><span>القسم</span><span>عرض</span><span>إضافة</span><span>تعديل</span><span>حذف</span></div>${permissionModules.map(([id,label,crud])=>`<div class="perm-row"><strong>${esc(label)}</strong><label><input type="checkbox" data-perm-module="${id}" data-perm-action="view" ${p.modules?.[id]?.view?'checked':''}><span></span></label><label>${crud?`<input type="checkbox" data-perm-module="${id}" data-perm-action="create" ${p.modules?.[id]?.create?'checked':''}><span></span>`:'—'}</label><label>${crud?`<input type="checkbox" data-perm-module="${id}" data-perm-action="edit" ${p.modules?.[id]?.edit?'checked':''}><span></span>`:'—'}</label><label>${crud?`<input type="checkbox" data-perm-module="${id}" data-perm-action="delete" ${p.modules?.[id]?.delete?'checked':''}><span></span>`:'—'}</label></div>`).join('')}</div><div class="permission-title">صلاحيات خاصة</div><div class="special-perms">${[['manageUsers','إدارة المستخدمين'],['manageSettings','تعديل إعدادات الشركة'],['export','تصدير نسخة احتياطية'],['import','استيراد نسخة احتياطية'],['print','الطباعة'],['sync','المزامنة السحابية']].map(([k,l])=>`<label><input type="checkbox" data-perm-special="${k}" ${p.special?.[k]?'checked':''}><span>${esc(l)}</span></label>`).join('')}</div></div>`;}
  function readPermissionsFromForm(form){const p=blankEmployeePermissions();form.querySelectorAll('[data-perm-module]').forEach(x=>{p.modules[x.dataset.permModule][x.dataset.permAction]=x.checked;});form.querySelectorAll('[data-perm-special]').forEach(x=>{p.special[x.dataset.permSpecial]=x.checked;});if(p.special.manageUsers)p.modules.users.view=true;if(p.special.manageSettings)p.modules.settings.view=true;return p;}
  async function renderUsers(){if(!specialPerm('manageUsers'))return sheet('المستخدمون والصلاحيات','navy','<div class="empty">لا تملك صلاحية إدارة المستخدمين.</div>');if(!navigator.onLine)return sheet('المستخدمون والصلاحيات','navy','<div class="offline-card">قسم المستخدمين يحتاج اتصالًا بالإنترنت لتطبيق الصلاحيات فورًا.</div>');const d=await api('/users');usersCache=d.rows||[];const body=`<div class="action-row"><button class="btn green" data-user-add>${svg('plus')}إضافة موظف</button><span class="note">كل موظف يدخل بمفتاح الشركة نفسه واسم مستخدم وكلمة مرور خاصة به.</span></div><div class="table-wrap"><table class="excel"><thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>النوع</th><th>الحالة</th><th>آخر دخول</th><th>إدارة</th></tr></thead><tbody>${usersCache.length?usersCache.map(u=>`<tr><td>${esc(u.displayName)}</td><td>${esc(u.username)}</td><td>${u.role==='owner'?'مالك':'موظف'}</td><td><span class="state-pill ${u.status==='active'?'ok':'stop'}">${u.status==='active'?'فعال':'موقوف'}</span></td><td>${u.lastLoginAt?new Date(u.lastLoginAt).toLocaleString('ar-EG'):'—'}</td><td>${u.role==='owner'?'حساب محمي':`<div class="row-actions"><button class="btn small light" data-user-edit="${esc(u.id)}">${svg('edit')}تعديل</button><button class="btn small ${u.status==='active'?'red':'green'}" data-user-status="${esc(u.id)}" data-status="${u.status==='active'?'stopped':'active'}">${u.status==='active'?'إيقاف':'تشغيل'}</button></div>`}</td></tr>`).join(''):emptyRow(6)}</tbody></table></div>`;return sheet('المستخدمون والصلاحيات','navy',body);}
  async function openUserModal(id=null){if(!specialPerm('manageUsers'))return;const row=id?usersCache.find(x=>String(x.id)===String(id)):null;if(id&&!row)return;const form=document.getElementById('modalForm');document.getElementById('modalTitle').textContent=id?'تعديل الموظف':'إضافة موظف';const perms=row?.permissions||blankEmployeePermissions();form.innerHTML=`<div class="field"><label>اسم الموظف</label><input name="displayName" required value="${esc(row?.displayName||'')}"></div><div class="field"><label>اسم المستخدم</label><input name="username" required autocomplete="off" value="${esc(row?.username||'')}"></div><div class="field"><label>${id?'كلمة مرور جديدة (اختياري)':'كلمة المرور'}</label><input name="password" type="password" ${id?'':'required'} autocomplete="new-password"></div><div class="field"><label>الحالة</label><div class="toggle-line"><label><input type="radio" name="status" value="active" ${!row||row.status==='active'?'checked':''}> فعال</label><label><input type="radio" name="status" value="stopped" ${row?.status==='stopped'?'checked':''}> موقوف</label></div></div><div class="field permission-field">${permissionMatrixHTML(perms)}</div><div class="modal-actions"><button type="button" class="btn light" id="cancelModal">إلغاء</button><button type="submit" class="btn">حفظ المستخدم</button></div>`;document.getElementById('modalBackdrop').hidden=false;hydrateIcons(form);prepareNumericInputs(form);document.getElementById('cancelModal').onclick=closeModal;form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form);const payload={id:row?.id||'',displayName:fd.get('displayName'),username:fd.get('username'),password:fd.get('password'),status:fd.get('status'),permissions:readPermissionsFromForm(form)};try{await api('/users/save',{method:'POST',body:JSON.stringify(payload)});closeModal();toast('تم حفظ المستخدم والصلاحيات.');await renderCurrent(false);}catch(err){toast(err.message||'تعذر حفظ المستخدم.',true);}};}
  async function renderSettings(){if(!pageAllowed('settings'))return sheet('إعدادات الشركة','navy','<div class="empty">لا تملك صلاحية عرض الإعدادات.</div>');const st=authState.company?.settings||{},editable=specialPerm('manageSettings');const dis=editable?'':'disabled';const body=`<div class="settings-panels"><form class="settings-card settings-grid" id="companySettingsForm"><h3>بيانات الشركة</h3><label><span>اسم الشركة</span><input name="companyName" value="${esc(st.companyName||authState.company?.name||'')}" ${dis}></label><label><span>رقم الجوال</span><input name="phone" value="${esc(st.phone||'')}" ${dis}></label><label><span>واتساب</span><input name="whatsapp" value="${esc(st.whatsapp||'')}" ${dis}></label><label><span>البريد الإلكتروني</span><input name="email" type="email" value="${esc(st.email||'')}" ${dis}></label><label><span>الموقع الإلكتروني</span><input name="website" type="url" placeholder="https://..." value="${esc(st.website||'')}" ${dis}></label><label><span>الرقم الضريبي</span><input name="taxNumber" value="${esc(st.taxNumber||'')}" ${dis}></label><label><span>السجل التجاري</span><input name="commercialRegistration" value="${esc(st.commercialRegistration||'')}" ${dis}></label><label><span>العملة</span><input name="currency" value="${esc(st.currency||'₪')}" ${dis}></label><label class="wide"><span>رابط شعار الشركة</span><input name="logoUrl" type="url" placeholder="https://..." value="${esc(st.logoUrl||'')}" ${dis}></label><label class="wide"><span>العنوان</span><input name="address" value="${esc(st.address||'')}" ${dis}></label><label class="wide"><span>ملاحظات الشركة</span><textarea name="notes" ${dis}>${esc(st.notes||'')}</textarea></label>${editable?`<div class="settings-actions"><button class="btn" type="submit">حفظ بيانات الشركة</button></div>`:''}</form><form class="settings-card password-card" id="myPasswordForm"><h3>تغيير كلمة مرور حسابي</h3><label><span>كلمة المرور الحالية</span><input type="password" name="currentPassword" required autocomplete="current-password"></label><label><span>كلمة المرور الجديدة</span><input type="password" name="newPassword" required minlength="4" autocomplete="new-password"></label><div class="settings-actions"><button class="btn" type="submit">تغيير كلمة المرور</button></div></form></div>`;return sheet('إعدادات الشركة والحساب','navy',body);}
  function bindManagementEvents(){app.querySelector('[data-user-add]')?.addEventListener('click',()=>openUserModal());app.querySelectorAll('[data-user-edit]').forEach(b=>b.onclick=()=>openUserModal(b.dataset.userEdit));app.querySelectorAll('[data-user-status]').forEach(b=>b.onclick=async()=>{try{await api('/users/status',{method:'POST',body:JSON.stringify({id:b.dataset.userStatus,status:b.dataset.status})});toast('تم تحديث حالة المستخدم.');await renderCurrent(false);}catch(e){toast(e.message||'تعذر تحديث المستخدم.',true);}});const sf=document.getElementById('companySettingsForm');if(sf&&specialPerm('manageSettings'))sf.onsubmit=async e=>{e.preventDefault();const fd=new FormData(sf),settings=Object.fromEntries(fd.entries());try{const d=await api('/company/settings',{method:'POST',body:JSON.stringify({settings})});authState.company=d.company;saveAuth();applyCompanyBranding();toast('تم حفظ بيانات الشركة.');}catch(err){toast(err.message||'تعذر حفظ الإعدادات.',true);}};const pf=document.getElementById('myPasswordForm');if(pf)pf.onsubmit=async e=>{e.preventDefault();const fd=new FormData(pf);try{await api('/account/password',{method:'POST',body:JSON.stringify({currentPassword:fd.get('currentPassword'),newPassword:fd.get('newPassword')})});pf.reset();toast('تم تغيير كلمة المرور.');}catch(err){toast(err.message||'تعذر تغيير كلمة المرور.',true);}};}

  const renderers={dashboard:()=>renderDashboard(),inventory:renderInventory,suppliers:renderSuppliers,debtors:(s)=>renderLedger('debtor',s),purchases:renderPurchases,sales:renderSales,payments:renderPayments,bank:()=>renderBank(),creditors:(s)=>renderLedger('creditor',s),balance:()=>renderBalance(),expenses:renderExpenses,stockCharts:()=>renderStockCharts(),daily:()=>renderDaily(),comprehensive:()=>renderComprehensive(),income:()=>renderIncome(),fx:renderFx,analysis:()=>renderAnalysis(),users:()=>renderUsers(),settings:()=>renderSettings()};
  async function renderCurrent(syncRemote=true){if(!authState)return;if(!pageAllowed(currentPage))currentPage=visiblePages()[0]?.[0]||'dashboard';const token=++renderToken;nav.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===currentPage));document.querySelectorAll('[data-quick]').forEach(b=>b.classList.toggle('active',b.dataset.quick===currentPage));pageLabel.textContent=pages.find(p=>p[0]===currentPage)?.[1]||'';localStorage.setItem(pageKey(),currentPage);app.innerHTML=loading();try{const html=await (renderers[currentPage]||renderDashboard)(syncRemote);if(token!==renderToken)return;app.innerHTML=html;bindPageEvents();bindManagementEvents();hydrateIcons(app);prepareNumericInputs(app);}catch(e){if(token!==renderToken)return;if(e.authFailure)return;app.innerHTML=sheet('تعذر عرض الصفحة','navy',`<div class="empty">${esc(e.message||e)}</div>`);}}

  async function openModal(type,id=null){if(type==='sale')return openSalesInvoice(id);const schema=schemas[type];if(!schema)return;if(!typeAllowed(type,id?'edit':'create')){toast('لا تملك صلاحية هذه العملية.',true);return;}const row=id?await getRecord(schema.dataset,id):null;const form=document.getElementById('modalForm');document.getElementById('modalTitle').textContent=`${id?'تعديل':'إضافة'} ${schema.title}`;form.classList.remove('aseel-invoice-form');document.querySelector('.modal')?.classList.remove('invoice-modal');form.innerHTML=schema.fields.map(f=>fieldHTML(f,row?.[f.name]??f.default??'')).join('')+`<div class="modal-actions"><button type="button" class="btn light" id="cancelModal">إلغاء</button><button type="submit" class="btn">حفظ</button></div>`;document.getElementById('modalBackdrop').hidden=false;hydrateIcons(form);prepareNumericInputs(form);for(const f of schema.fields){if(['combo','dynamicCombo','comboFree'].includes(f.type))setupCombo(form.querySelector(`[data-combo-name="${f.name}"]`),f,row?.[f.name]??f.default??'');}document.getElementById('cancelModal').onclick=closeModal;form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form),data={};for(const f of schema.fields){let v=fd.get(f.name)??'';if(f.type==='number')v=n(v);data[f.name]=v;}if(schema.dataset==='products'||schema.dataset==='suppliers'){const existing=await getByIndex(schema.dataset,'code',data.code);if(existing&&existing.id!==id){toast('هذا الكود مستخدم مسبقًا.',true);return;}}if(schema.dataset==='purchases'){const [s,p]=await Promise.all([getByIndex('suppliers','code',data.supplierCode),getByIndex('products','code',data.productCode)]);data.supplierName=s?.name||'';data.productName=p?.name||'';data.warehouse=data.warehouse||'المخزن الرئيسي';}if(schema.dataset==='payments'){const s=await getByIndex('suppliers','code',data.supplierCode);data.supplierName=s?.name||'';}const rec={...(row||{}),...data,id:id||uid(),updatedAt:Date.now(),sortTs:data.date?dateToSortTs(data.date):Date.now()};await putLocalRecord(schema.dataset,rec,true);closeModal();pager(schema.dataset).before=null;pager(schema.dataset).stack=[];pager(schema.dataset).page=1;pager(schema.dataset).remoteMore={};await renderCurrent(false);toast('تم الحفظ محليًا وأضيفت العملية للمزامنة.');};form.querySelector('input,textarea')?.focus();}

  function normalizeSalePayment(value){
    const v=String(value||'').trim();
    if(v.includes('بنكي'))return 'بيع بنكي';
    if(v.includes('حساب'))return 'بيع عالحساب';
    return 'بيع نقدي';
  }
  function invoiceLineHTML(line={},index=0){
    const payment=normalizeSalePayment(line.paymentMethod||line.type),avg=n(line.avgPrice||line.avgCost||0),lineProfit=('profit' in line)?n(line.profit):(n(line.price||0)-avg)*n(line.qty||1);
    return `<div class="invoice-line" data-line-index="${index}">
      <div class="line-no">${index+1}</div>
      <div><select class="invoice-input line-payment" data-line-payment aria-label="طريقة دفع الصنف"><option value="بيع نقدي" ${payment==='بيع نقدي'?'selected':''}>نقدي</option><option value="بيع بنكي" ${payment==='بيع بنكي'?'selected':''}>بنكي</option><option value="بيع عالحساب" ${payment==='بيع عالحساب'?'selected':''}>على الحساب</option></select></div>
      <div class="line-code"><div class="search-select" data-combo-name="invoiceProduct${index}"><div class="search-select-row"><input class="combo-input numeric-ltr" lang="en-US" dir="ltr" type="text" inputmode="numeric" autocomplete="off" placeholder="كود الصنف" required><button class="combo-chevron" type="button">${svg('chevron')}</button></div><input type="hidden" data-line-product name="lineProduct${index}" value="${esc(line.productCode||'')}"><div class="combo-menu" hidden></div></div></div>
      <div><input class="invoice-input line-product-name" data-line-name type="text" value="${esc(line.productName||'')}" placeholder="اسم الصنف" readonly></div>
      <div><input class="invoice-input numeric-ltr" lang="en-US" dir="ltr" inputmode="decimal" data-line-price type="number" min="0" step="0.01" value="${esc(line.price||0)}" required></div>
      <div><input class="invoice-input numeric-ltr" lang="en-US" dir="ltr" inputmode="decimal" data-line-qty type="number" min="0.01" step="0.01" value="${esc(line.qty||1)}" required></div>
      <div class="line-total" data-line-total>${money(n(line.qty||1)*n(line.price||0))}</div>
      <div><input class="invoice-input numeric-ltr line-readonly" lang="en-US" dir="ltr" data-line-avg type="text" value="${n(avg).toFixed(2)}" readonly></div>
      <div><input class="invoice-input numeric-ltr line-readonly line-profit" lang="en-US" dir="ltr" data-line-profit type="text" value="${n(lineProfit).toFixed(2)}" readonly></div>
      <div><input class="invoice-input" data-line-note type="text" value="${esc(line.lineNote||'')}" placeholder="البيان"></div>
      <div><button type="button" class="line-remove" title="حذف الصنف">${svg('trash')}</button></div>
    </div>`;
  }

  async function openSalesInvoice(anchorId=null){
    if(!typeAllowed('sale',anchorId?'edit':'create')){toast('لا تملك صلاحية هذه العملية.',true);return;}
    const anchor=anchorId?await getRecord('sales',anchorId):null,oldLines=anchor?await saleInvoiceLinesFromRow(anchor):[];
    const head=oldLines[0]||{},form=document.getElementById('modalForm'),modal=document.querySelector('.modal');
    modal?.classList.add('invoice-modal');form.classList.add('aseel-invoice-form');
    document.getElementById('modalTitle').textContent=anchor?'تعديل فاتورة مبيعات':'فاتورة مبيعات جديدة';
    const invoiceNo=head.invoiceNo||nextInvoiceNo(),date=head.date||today(),customer=head.customerName||'',warehouse=head.warehouse||'المخزن الرئيسي',note=head.note||'';
    const lines=oldLines.length?oldLines:[{productCode:'',qty:1,price:0,type:'بيع نقدي'}];
    form.innerHTML=`<div class="aseel-invoice">
      <section class="invoice-head-grid">
        <label><span>رقم الفاتورة</span><input class="invoice-input numeric-ltr" lang="en-US" dir="ltr" name="invoiceNo" value="${esc(invoiceNo)}" required></label>
        <label><span>التاريخ</span><input class="invoice-input numeric-ltr" lang="en-US" dir="ltr" name="date" type="date" value="${esc(date)}" required></label>
        <label><span>اسم الزبون</span><input class="invoice-input" name="customerName" value="${esc(customer)}" placeholder="اسم الزبون"></label>
        <label><span>المخزن</span><input class="invoice-input" name="warehouse" value="${esc(warehouse)}" placeholder="المخزن الرئيسي"></label>
        <label class="invoice-head-wide"><span>ملاحظات الفاتورة</span><input class="invoice-input" name="note" value="${esc(note)}" placeholder="ملاحظات الفاتورة"></label>
      </section>
      <section class="invoice-lines-box">
        <div class="invoice-lines-head"><span>#</span><span>طريقة الدفع</span><span>كود الصنف</span><span>اسم الصنف</span><span>السعر</span><span>الكمية</span><span>الإجمالي</span><span>متوسط السعر</span><span>الربح</span><span>البيان</span><span></span></div>
        <div id="invoiceLines">${lines.map((l,i)=>invoiceLineHTML(l,i)).join('')}</div>
        <button type="button" class="btn light add-invoice-line" id="addInvoiceLine">${svg('plus')}إضافة صنف</button>
      </section>
      <section class="invoice-summary">
        <div class="cash"><span>إجمالي النقدي</span><strong id="invoiceCash">0.00</strong></div>
        <div class="bank"><span>إجمالي البنكي</span><strong id="invoiceBank">0.00</strong></div>
        <div class="due"><span>إجمالي على الحساب</span><strong id="invoiceDue">0.00</strong></div>
        <div class="grand"><span>إجمالي البيع</span><strong id="invoiceSubTotal">0.00</strong></div>
      </section>
      <div class="invoice-stock-note">${svg('package')} عند الحفظ تُسجل الكمية «صادر» في يومية المخزن بنفس تاريخ الفاتورة. تعديل أو حذف الفاتورة يعكس أثرها من المخزون تلقائيًا.</div>
      <div class="modal-actions invoice-actions"><button type="button" class="btn light" id="cancelModal">إلغاء</button><button type="submit" class="btn green">حفظ الفاتورة</button></div>
    </div>`;
    document.getElementById('modalBackdrop').hidden=false;hydrateIcons(form);prepareNumericInputs(form);
    const linesBox=document.getElementById('invoiceLines');
    const invoiceCostCache=new Map();
    async function getAvgCost(code){
      code=String(code||'').trim();if(!code)return 0;
      if(invoiceCostCache.has(code))return invoiceCostCache.get(code);
      let avg=0;try{const st=await inventoryStatsBatch([code]);avg=n(st?.[code]?.avgCost);}catch{}
      invoiceCostCache.set(code,avg);return avg;
    }
    async function bindLine(el,index,line={}){
      const combo=el.querySelector('.search-select');
      setupCombo(combo,{name:`invoiceProduct${index}`,type:'dynamicCombo',source:'products',required:true,displayValueOnly:true},line.productCode||'');
      const q=el.querySelector('[data-line-qty]'),p=el.querySelector('[data-line-price]'),payment=el.querySelector('[data-line-payment]'),rm=el.querySelector('.line-remove'),name=el.querySelector('[data-line-name]'),avgEl=el.querySelector('[data-line-avg]'),profitEl=el.querySelector('[data-line-profit]'),hidden=el.querySelector('[data-line-product]'),codeInput=el.querySelector('.combo-input');
      let avgCost=n(line.avgPrice||line.avgCost||0);
      const paint=()=>{const total=n(q.value)*n(p.value),profit=(n(p.value)-avgCost)*n(q.value);el.dataset.avgCost=String(avgCost);el.querySelector('[data-line-total]').textContent=total.toFixed(2);avgEl.value=avgCost.toFixed(2);profitEl.value=profit.toFixed(2);profitEl.classList.toggle('loss',profit<0);updateInvoiceTotals();};
      const applyProduct=async product=>{
        const code=String(product?.code||hidden.value||codeInput.value||'').trim();if(!code)return;
        hidden.value=code;codeInput.value=code;name.value=String(product?.name||'');
        if(!n(p.value)){const suggested=n(product?.salePrice||product?.price||product?.sellingPrice);if(suggested)p.value=suggested;}
        avgCost=await getAvgCost(code);paint();
      };
      combo.addEventListener('combochange',e=>applyProduct(e.detail?.row||null));
      codeInput.addEventListener('blur',async()=>{
        const typed=String(codeInput.value||'').trim();if(!typed)return;
        let product=await getByIndex('products','code',typed);if(!product&&navigator.onLine){try{const found=await remoteSearch('products',typed,12);product=found.find(x=>String(x.code)===typed)||null;if(product)await putRemoteRecord('products',product);}catch{}}
        if(product)await applyProduct(product);
      });
      q.oninput=paint;p.oninput=paint;payment.onchange=paint;
      rm.onclick=()=>{if(linesBox.children.length<=1){toast('يجب أن تحتوي الفاتورة على صنف واحد على الأقل.',true);return;}el.remove();renumberInvoiceLines();updateInvoiceTotals();};
      if(line.productCode){let product=await getByIndex('products','code',String(line.productCode));if(product)await applyProduct(product);else {name.value=line.productName||'';avgCost=n(line.avgPrice||line.avgCost||0);paint();}}else paint();
    }
    function renumberInvoiceLines(){[...linesBox.children].forEach((el,i)=>{el.dataset.lineIndex=i;el.querySelector('.line-no').textContent=i+1;});}
    function invoiceTotals(){
      return [...linesBox.children].reduce((a,el)=>{
        const value=n(el.querySelector('[data-line-qty]').value)*n(el.querySelector('[data-line-price]').value),payment=normalizeSalePayment(el.querySelector('[data-line-payment]').value);
        a.total+=value;if(payment==='بيع بنكي')a.bank+=value;else if(payment==='بيع عالحساب')a.due+=value;else a.cash+=value;return a;
      },{total:0,cash:0,bank:0,due:0});
    }
    function updateInvoiceTotals(){
      const t=invoiceTotals();
      document.getElementById('invoiceCash').textContent=money(t.cash);
      document.getElementById('invoiceBank').textContent=money(t.bank);
      document.getElementById('invoiceDue').textContent=money(t.due);
      document.getElementById('invoiceSubTotal').textContent=money(t.total);
    }
    for(const [i,el] of [...linesBox.children].entries())await bindLine(el,i,lines[i]||{});
    document.getElementById('addInvoiceLine').onclick=async()=>{const i=linesBox.children.length,wrap=document.createElement('div');wrap.innerHTML=invoiceLineHTML({},i);const el=wrap.firstElementChild;linesBox.appendChild(el);await bindLine(el,i,{});el.querySelector('.combo-input')?.focus();updateInvoiceTotals();};
    document.getElementById('cancelModal').onclick=closeModal;updateInvoiceTotals();

    form.onsubmit=async e=>{
      e.preventDefault();
      const invoiceNo=String(form.elements.invoiceNo.value||'').trim(),date=form.elements.date.value||today(),customerName=String(form.elements.customerName.value||'').trim(),warehouse=String(form.elements.warehouse.value||'').trim()||'المخزن الرئيسي',note=String(form.elements.note.value||'').trim();
      if(!invoiceNo){toast('اكتب رقم الفاتورة.',true);return;}
      const lineEls=[...linesBox.children],raw=lineEls.map(el=>({productCode:String(el.querySelector('[data-line-product]').value||'').trim(),qty:n(el.querySelector('[data-line-qty]').value),price:n(el.querySelector('[data-line-price]').value),type:normalizeSalePayment(el.querySelector('[data-line-payment]').value),avgPrice:n(el.dataset.avgCost),lineNote:String(el.querySelector('[data-line-note]').value||'').trim()}));
      if(raw.some(x=>!x.productCode||x.qty<=0)){toast('اختر الصنف وأدخل كمية صحيحة لكل سطر.',true);return;}
      const codes=[...new Set(raw.map(x=>x.productCode))],productMap=new Map();
      for(const code of codes){let p=await getByIndex('products','code',code);if(!p&&navigator.onLine){try{const found=await remoteSearch('products',code,12);p=found.find(x=>String(x.code)===code)||null;if(p)await putRemoteRecord('products',p);}catch{}}if(!p){toast(`الصنف ${code} غير موجود.`,true);return;}productMap.set(code,p);}
      const baseTs=dateToSortTs(date),totals=raw.reduce((a,x)=>{const v=x.qty*x.price;a.total+=v;if(x.type==='بيع بنكي')a.bank+=v;else if(x.type==='بيع عالحساب')a.due+=v;else a.cash+=v;return a;},{total:0,cash:0,bank:0,due:0}),now=Date.now(),records=raw.map((x,i)=>{const old=oldLines[i]||{},p=productMap.get(x.productCode)||{},lineTotal=x.qty*x.price;const avgPrice=n(x.avgPrice),profit=(x.price-avgPrice)*x.qty;return {...old,id:old.id||uid(),invoiceNo,date,customerName,type:x.type,paymentMethod:x.type,warehouse,note,lineNote:x.lineNote,productCode:x.productCode,productName:p.name||'',unit:p.unit||'',qty:x.qty,price:x.price,avgPrice,profit,lineNo:i+1,movementType:'صادر',movementDate:date,invoiceTotal:totals.total,invoiceCashTotal:i===0?totals.cash:0,invoiceBankTotal:i===0?totals.bank:0,invoiceDueTotal:i===0?totals.due:0,invoiceHead:i===0,paidCash:x.type==='بيع نقدي'?lineTotal:0,paidBank:x.type==='بيع بنكي'?lineTotal:0,dueAmount:x.type==='بيع عالحساب'?lineTotal:0,updatedAt:now+i,sortTs:baseTs+i};});
      const deleteIds=oldLines.slice(records.length).map(x=>x.id);
      await saveSalesInvoiceBatch(records,deleteIds);salesFilterPageCache.clear();
      closeModal();const pgr=pager('sales');pgr.before=null;pgr.stack=[];pgr.page=1;pgr.remoteMore={};await renderCurrent(false);toast('تم حفظ الفاتورة وتسجيل حركة المخزون بنفس تاريخها.');
    };
    form.querySelector('.combo-input')?.focus();
  }

  async function deleteSalesInvoice(anchorId){
    if(!typeAllowed('sale','delete')){toast('لا تملك صلاحية الحذف.',true);return;}
    const anchor=await getRecord('sales',anchorId);if(!anchor)return;
    const lines=await saleInvoiceLinesFromRow(anchor),label=anchor.invoiceNo?`الفاتورة ${anchor.invoiceNo}`:'هذا البيع';
    if(!confirm(`هل تريد حذف ${label} بالكامل؟ سيتم عكس الكميات من المخزون.`))return;
    await saveSalesInvoiceBatch([],lines.map(x=>x.id));salesFilterPageCache.clear();await renderCurrent(false);toast('تم حذف الفاتورة وعكس أثرها من المخزون.');
  }

  function fieldHTML(f,val){const full='',req=f.required?'required':'',isNum=f.type==='number',isDate=f.type==='date',isCode=/code/i.test(f.name||'');if(['combo','dynamicCombo','comboFree'].includes(f.type))return `<div class="field${full}"><label>${esc(f.label)}</label><div class="search-select" data-combo-name="${esc(f.name)}"><div class="search-select-row"><input class="combo-input ${isCode?'numeric-ltr':''}" ${isCode?'lang="en-US" dir="ltr" inputmode="numeric"':''} type="text" autocomplete="off" placeholder="ابحث أو اختر..." ${req}><button class="combo-chevron" type="button">${svg('chevron')}</button></div><input type="hidden" name="${esc(f.name)}" value="${esc(val)}"><div class="combo-menu" hidden></div></div></div>`;if(f.type==='textarea')return `<div class="field${full}"><label>${esc(f.label)}</label><textarea name="${esc(f.name)}" ${req}>${esc(val)}</textarea></div>`;return `<div class="field${full}"><label>${esc(f.label)}</label><input name="${esc(f.name)}" class="${isNum||isDate||isCode?'numeric-ltr':''}" ${isNum||isDate||isCode?'lang="en-US" dir="ltr"':''} ${isNum?'inputmode="decimal"':''} ${isCode&&!isNum?'inputmode="numeric"':''} type="${f.type||'text'}" value="${esc(val)}" ${f.step?`step="${f.step}"`:''} ${req}></div>`;}
  function setupCombo(el,f,currentValue){if(!el)return;const input=el.querySelector('.combo-input'),hidden=el.querySelector('input[type=hidden]'),menu=el.querySelector('.combo-menu'),toggle=el.querySelector('.combo-chevron');let items=[],active=-1,timer=null;const labelOf=r=>f.source?`${r.code} - ${r.name}`:String(r.label??r.value??r);const valueOf=r=>f.source?String(r.code):String(r.value??r);async function load(q=''){if(f.type==='combo'){const needle=String(q||'').trim().toLowerCase();items=f.options.filter(v=>!needle||String(v).toLowerCase().includes(needle)).map(v=>({value:v,label:v}));}else if(f.type==='comboFree'){const products=await localSearch('products',q,60);const cats=[...new Set(products.map(r=>r.category).filter(Boolean))];items=cats.map(v=>({value:v,label:v}));if(q.trim()&&!cats.some(v=>v.toLowerCase()===q.trim().toLowerCase()))items.unshift({value:q.trim(),label:`استخدام: ${q.trim()}`});}else{const local=await localSearch(f.source,q,30);let remote=[];const term=String(q||'').trim();if(navigator.onLine&&local.length<12&&(term.length>=2||local.length===0)){try{remote=await remoteSearch(f.source,term,24);await cacheRemoteRows(f.source,remote);}catch{}}const map=new Map();[...local,...remote].forEach(r=>map.set(String(r.id||r.code),r));items=[...map.values()].slice(0,40);}draw();}
    function draw(){active=-1;menu.innerHTML=items.length?items.map((r,i)=>`<button type="button" class="combo-option" data-i="${i}">${esc(labelOf(r))}</button>`).join(''):`<div class="combo-empty">لا توجد نتائج</div>`;menu.hidden=false;menu.querySelectorAll('.combo-option').forEach(b=>b.onclick=()=>choose(items[n(b.dataset.i)]));}
    function choose(r){if(!r)return;hidden.value=valueOf(r);input.value=f.displayValueOnly?valueOf(r):labelOf(r).replace(/^استخدام:\s*/, '');menu.hidden=true;input.setCustomValidity('');el.dispatchEvent(new CustomEvent('combochange',{detail:{row:r,value:valueOf(r)}}));}
    async function setInitial(){if(!currentValue){input.value='';return;}if(f.source){let r=await getByIndex(f.source,'code',currentValue);if(!r&&navigator.onLine){try{const found=await remoteSearch(f.source,currentValue,10);r=found.find(x=>String(x.code)===String(currentValue));if(r)await putRemoteRecord(f.source,r);}catch{}}input.value=r?(f.displayValueOnly?valueOf(r):labelOf(r)):String(currentValue);}else input.value=String(currentValue);}setInitial();
    input.addEventListener('focus',()=>load(input.value));input.addEventListener('input',()=>{hidden.value=f.type==='comboFree'?input.value:'';clearTimeout(timer);timer=setTimeout(()=>load(input.value),180);});toggle.onclick=()=>menu.hidden?load(input.value):(menu.hidden=true);input.addEventListener('keydown',e=>{const opts=[...menu.querySelectorAll('.combo-option')];if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();active=Math.max(0,Math.min(opts.length-1,active+(e.key==='ArrowDown'?1:-1)));opts.forEach((x,i)=>x.classList.toggle('active',i===active));opts[active]?.scrollIntoView({block:'nearest'});}if(e.key==='Enter'&&!menu.hidden&&active>=0){e.preventDefault();opts[active]?.click();}if(e.key==='Escape')menu.hidden=true;});document.addEventListener('click',e=>{if(!el.contains(e.target))menu.hidden=true;},{once:false});}
  function closeModal(){document.getElementById('modalBackdrop').hidden=true;document.getElementById('modalForm')?.classList.remove('aseel-invoice-form');document.querySelector('.modal')?.classList.remove('invoice-modal');}
  function bindSalesFilterEvents(){
    const toggle=document.getElementById('salesFilterToggle'),panel=document.getElementById('salesFilterPanel');if(!toggle)return;
    toggle.onclick=()=>{const f=salesFilterState();f.open=!f.open;saveMeta();if(panel)panel.hidden=!f.open;toggle.classList.toggle('active',salesFilterActive(f));};
    document.querySelectorAll('[data-sales-preset]').forEach(btn=>btn.onclick=()=>{
      const f=salesFilterState(),preset=btn.dataset.salesPreset||'all';f.preset=preset;f.open=true;
      if(preset==='date'&&!f.date)f.date=today();if(preset==='range'){if(!f.start)f.start=daysAgo(6);if(!f.end)f.end=today();}
      if(['all','day','week','month','year'].includes(preset)){resetSalesPager();salesFilterPageCache.clear();saveMeta();renderCurrent(true);}else{saveMeta();renderCurrent(false);}
    });
    const apply=document.getElementById('applySalesFilter');if(apply)apply.onclick=()=>{
      const f=salesFilterState();f.date=document.getElementById('salesFilterDate')?.value||f.date;f.start=document.getElementById('salesFilterStart')?.value||f.start;f.end=document.getElementById('salesFilterEnd')?.value||f.end;f.code=westernDigits(document.getElementById('salesFilterCode')?.value||'').trim();f.open=true;resetSalesPager();salesFilterPageCache.clear();saveMeta();renderCurrent(true);
    };
    const clear=document.getElementById('clearSalesFilter');if(clear)clear.onclick=()=>{meta.salesFilter={open:true,preset:'all',date:'',start:'',end:'',code:''};resetSalesPager();salesFilterPageCache.clear();saveMeta();renderCurrent(true);};
    const code=document.getElementById('salesFilterCode');if(code)code.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();document.getElementById('applySalesFilter')?.click();}};
  }
  function westernDigits(value){return String(value??'').replace(/[٠-٩]/g,d=>'0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]).replace(/[۰-۹]/g,d=>'0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]);}
  function normalizeInputDigits(e){const el=e.target;if(!(el instanceof HTMLInputElement||el instanceof HTMLTextAreaElement))return;const before=el.value,after=westernDigits(before);if(after!==before){const pos=el.selectionStart;el.value=after;try{if(pos!=null)el.setSelectionRange(pos,pos);}catch{}}}
  function prepareNumericInputs(root=document){root.querySelectorAll?.('input[type="number"],input[type="date"],input[inputmode="numeric"],input[inputmode="decimal"],.numeric-ltr').forEach(el=>{el.lang='en-US';el.dir='ltr';});}
  async function deleteRecord(type,id){if(type==='sale')return deleteSalesInvoice(id);const schema=schemas[type];if(!schema)return;if(!typeAllowed(type,'delete')){toast('لا تملك صلاحية الحذف.',true);return;}if(!confirm('هل تريد حذف هذا السجل؟'))return;await removeLocalRecord(schema.dataset,id,true);await renderCurrent(false);toast('تم الحذف محليًا وإضافة الحذف لطابور المزامنة.');}

  function bindPageEvents(){bindSalesFilterEvents();app.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>openModal(b.dataset.add));app.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openModal(b.dataset.edit,b.dataset.id));app.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteRecord(b.dataset.delete,b.dataset.id));app.querySelectorAll('[data-invoice-edit]').forEach(b=>b.onclick=()=>openSalesInvoice(b.dataset.invoiceEdit));app.querySelectorAll('[data-invoice-delete]').forEach(b=>b.onclick=()=>deleteSalesInvoice(b.dataset.invoiceDelete));app.querySelectorAll('[data-page-next]').forEach(b=>b.onclick=()=>{const d=b.dataset.pageNext,p=pager(d);if(!p.next)return;p.stack.push(p.before);p.before=p.next;p.page++;renderCurrent(true);});app.querySelectorAll('[data-page-prev]').forEach(b=>b.onclick=()=>{const d=b.dataset.pagePrev,p=pager(d);if(!p.stack.length)return;p.before=p.stack.pop()||null;p.page=Math.max(1,p.page-1);renderCurrent(true);});const year=document.getElementById('dashboardYear');if(year)year.onchange=()=>{meta.dashboardYear=n(year.value)||new Date().getFullYear();saveMeta();renderCurrent(true);};const daily=document.getElementById('dailyDate');if(daily)daily.onchange=()=>{meta.selectedDate=daily.value;saveMeta();renderCurrent(false);};const rs=document.getElementById('reportStart'),re=document.getElementById('reportEnd');if(rs)rs.onchange=()=>{meta.reportStart=rs.value;saveMeta();renderCurrent(false);};if(re)re.onchange=()=>{meta.reportEnd=re.value;saveMeta();renderCurrent(false);};const cap=document.getElementById('capitalInput');if(cap)cap.onchange=()=>{meta.capital=n(cap.value);saveMeta();renderCurrent(false);};}

  function canvasBars(id,labels,datasets){const c=document.getElementById(id);if(!c)return;const rect=c.getBoundingClientRect(),ratio=Math.max(1,devicePixelRatio||1);c.width=Math.max(500,rect.width*ratio);c.height=280*ratio;const ctx=c.getContext('2d');ctx.scale(ratio,ratio);const W=c.width/ratio,H=c.height/ratio,pad={l:48,r:14,t:25,b:52},cw=W-pad.l-pad.r,ch=H-pad.t-pad.b,max=Math.max(1,...datasets.flatMap(d=>d.values.map(n)))*1.12;ctx.strokeStyle='#cbd5e1';ctx.fillStyle='#64748b';ctx.font='10px Cairo, Arial, sans-serif';ctx.textAlign='right';for(let i=0;i<=4;i++){const y=pad.t+ch-(ch*i/4);ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();ctx.fillText(money(max*i/4),pad.l-5,y+4);}const groupW=cw/Math.max(1,labels.length),barW=Math.max(7,(groupW*.72)/datasets.length),colors=['#1f4e78','#15803d','#b91c1c','#00757e'];labels.forEach((lab,i)=>{datasets.forEach((ds,j)=>{const v=n(ds.values[i]),h=ch*(v/max),x=pad.l+i*groupW+groupW*.14+j*barW,y=pad.t+ch-h;ctx.fillStyle=colors[j%colors.length];ctx.fillRect(x,y,Math.max(3,barW-2),h);});ctx.save();ctx.translate(pad.l+i*groupW+groupW/2,H-28);ctx.rotate(-.15);ctx.fillStyle='#334155';ctx.textAlign='center';ctx.fillText(lab,0,0);ctx.restore();});}
  function toast(msg,error=false){const t=document.getElementById('toast');t.textContent=msg;t.style.background=error?'#991b1b':'#111827';t.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.hidden=true,2800);}
  function hydrateIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=svg(el.dataset.icon);});}
  function navInit(){const allowed=visiblePages();nav.innerHTML=allowed.map(([id,label,icon])=>`<button class="nav-btn ${id===currentPage?'active':''}" data-page="${id}"><span class="nav-icon">${svg(icon)}</span><span>${esc(label)}</span></button>`).join('');nav.onclick=e=>{const b=e.target.closest('[data-page]');if(!b||!pageAllowed(b.dataset.page))return;currentPage=b.dataset.page;closeSidebar();renderCurrent(true);};document.querySelectorAll('[data-quick]').forEach(b=>{const page=b.dataset.quick;if(page)b.hidden=!pageAllowed(page);b.classList.toggle('active',page===currentPage);b.onclick=()=>{if(page&&!pageAllowed(page))return;currentPage=page;renderCurrent(true);};});syncBtn.hidden=!specialPerm('sync');const exportBtn=document.getElementById('exportBtn'),importLabel=document.getElementById('importLabel'),printBtn=document.getElementById('printBtn');if(exportBtn)exportBtn.hidden=!specialPerm('export');if(importLabel)importLabel.hidden=!specialPerm('import');if(printBtn)printBtn.hidden=!specialPerm('print');}

  async function exportData(){const out={version:APP_VERSION,exportedAt:new Date().toISOString(),meta,datasets:{}};for(const d of DATASETS){out.datasets[d]=[];await streamDataset(d,r=>out.datasets[d].push(r));}const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`sales-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);toast('تم إنشاء النسخة الاحتياطية من البيانات المحلية.');}
  async function importData(file){try{const data=JSON.parse(await file.text());if(!data?.datasets)throw new Error('ملف غير صالح');for(const d of DATASETS){for(const r of data.datasets[d]||[])await putLocalRecord(d,r,true);}if(data.meta){meta={...meta,...data.meta};saveMeta();}await renderCurrent(false);toast('تم الاستيراد وحُفظت العمليات في طابور المزامنة.');}catch(e){toast('تعذر استيراد الملف.',true);}}
  async function clearLocal(){if(!confirm('سيتم مسح البيانات المحلية والطابور من هذا الجهاز فقط. لن يتم حذف البيانات الموجودة في السحابة. متابعة؟'))return;const db=await openDB();await new Promise((resolve,reject)=>{const stores=[...DATASETS,'syncQueue'];const t=db.transaction(stores,'readwrite');stores.forEach(s=>t.objectStore(s).clear());t.oncomplete=resolve;t.onerror=()=>reject(t.error);});pagers&&Object.keys(pagers).forEach(k=>delete pagers[k]);await refreshPendingCount();renderCurrent(false);toast('تم مسح البيانات المحلية.');}

  document.addEventListener('input',normalizeInputDigits,true);

  function initPWA(){if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;document.getElementById('installBtn').hidden=false;});window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;document.getElementById('installBtn').hidden=true;toast('تم تثبيت التطبيق.');});document.getElementById('installBtn').onclick=async()=>{if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;}else toast('استخدم خيار "إضافة إلى الشاشة الرئيسية" من قائمة المتصفح إذا لم يظهر زر التثبيت.');};}

  async function startCompanyApp(){
    if(!authState)return;
    if(!meta)meta=loadMeta();
    currentPage=localStorage.getItem(pageKey())||currentPage||'dashboard';
    if(!pageAllowed(currentPage))currentPage=visiblePages()[0]?.[0]||'dashboard';
    Object.keys(pagers).forEach(k=>delete pagers[k]);
    navInit();hydrateIcons();applyCompanyBranding();updateConnection();
    await openDB();await refreshPendingCount();scheduleCacheCleanup(300);await renderCurrent(false);scheduleSync(900);if(navigator.onLine)setTimeout(()=>{const d=({inventory:'products',suppliers:'suppliers',debtors:'debtors',purchases:'purchases',sales:'sales',payments:'payments',creditors:'creditors',expenses:'expenses',fx:'fx'})[currentPage];if(d)refreshRemotePage(currentPage,d,null).catch(()=>{});},250);
    clearInterval(validationTimer);validationTimer=setInterval(async()=>{if(!authState)return;if(authExpiryPassed()){await forceLogout('يرجى تسجيل الدخول من جديد.');return;}if(navigator.onLine){const ok=await validateSession(true,false);if(ok&&authState)processQueue(false);}},5*60*1000);
  }
  async function logoutUser(){try{if(navigator.onLine&&authState?.token)await api('/auth/logout',{method:'POST',skipAuthFailure:true});}catch{}await forceLogout('');}
  async function init(){
    OLD_STORAGE_KEYS.forEach(k=>localStorage.removeItem(k));initPWA();hydrateIcons();updateLoginStatus();
    const hint=loginHint();document.getElementById('companyKeyInput').value=hint.companyKey||'';document.getElementById('usernameInput').value=hint.username||'';
    authState=loadCachedAuth();
    if(authState&&!authExpiryPassed()){
      meta=loadMeta();showApp();await startCompanyApp();setTimeout(()=>validateSession(true,true).catch(()=>{}),0);return;
    }
    if(authState&&authExpiryPassed()){authState=null;saveAuth();}
    showLogin();
  }

  function openSidebar(){const bd=document.getElementById('sidebarBackdrop');sidebar.classList.add('open');sidebar.setAttribute('aria-hidden','false');if(bd)bd.hidden=false;document.body.classList.add('sidebar-open');}
  function closeSidebar(){const bd=document.getElementById('sidebarBackdrop');sidebar.classList.remove('open');sidebar.setAttribute('aria-hidden','true');if(bd)bd.hidden=true;document.body.classList.remove('sidebar-open');}
  loginForm.onsubmit=async e=>{e.preventDefault();const btn=document.getElementById('loginBtn'),key=document.getElementById('companyKeyInput').value.trim(),username=document.getElementById('usernameInput').value.trim(),password=document.getElementById('passwordInput').value;setLoginMessage('');btn.disabled=true;btn.textContent='جاري الدخول...';try{await doLogin(key,username,password);}catch(err){setLoginMessage(err.message||'تعذر تسجيل الدخول.',true);}finally{btn.disabled=false;btn.textContent='دخول سريع';}};
  document.getElementById('menuBtn').onclick=()=>sidebar.classList.contains('open')?closeSidebar():openSidebar();
  document.getElementById('sidebarCloseBtn').onclick=closeSidebar;
  document.getElementById('sidebarBackdrop').onclick=closeSidebar;
  document.getElementById('modalClose').onclick=closeModal;
  document.getElementById('modalBackdrop').onclick=e=>{if(e.target.id==='modalBackdrop')closeModal();};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeSidebar();}});
  syncBtn.onclick=()=>processQueue(true);
  document.getElementById('exportBtn').onclick=()=>{if(specialPerm('export'))exportData();else toast('لا تملك صلاحية التصدير.',true);};
  document.getElementById('importInput').onchange=e=>{if(e.target.files[0]&&specialPerm('import'))importData(e.target.files[0]);else if(e.target.files[0])toast('لا تملك صلاحية الاستيراد.',true);e.target.value='';};
  document.getElementById('printBtn').onclick=()=>{if(specialPerm('print'))window.print();else toast('لا تملك صلاحية الطباعة.',true);};
  document.getElementById('logoutBtn').onclick=logoutUser;
  window.addEventListener('online',async()=>{updateLoginStatus();updateConnection();if(authState){const ok=await validateSession(true);if(ok&&authState){processQueue(false);renderCurrent(true);}}});
  window.addEventListener('offline',()=>{updateLoginStatus();updateConnection();});
  window.addEventListener('focus',()=>{if(authState&&navigator.onLine&&Date.now()-lastValidatedAt>VALIDATION_TTL)validateSession(true,false);});
  init().catch(e=>{console.error(e);showLogin('تعذر تهيئة التطبيق. حاول إعادة فتح الصفحة.');});
})();
