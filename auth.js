// ===== AUTH MODULE =====
// All helpers prefixed with _a to avoid any global name conflicts
var DEFAULT_AUTH_USERS=[
  {id:"admin",username:"admin",password:"admin",name:"Administrator",role:"Admin",shift:"24/7",color:"av-e",email:"admin@soc.io",isAdmin:true,active:true},
  {id:"m1",username:"alice.chen",password:"soc123",name:"Alice Chen",role:"Senior Analyst",shift:"Day",color:"av-a",email:"alice@soc.io",isAdmin:false,active:true},
  {id:"m2",username:"bob.martinez",password:"soc123",name:"Bob Martinez",role:"Threat Hunter",shift:"Day",color:"av-d",email:"bob@soc.io",isAdmin:false,active:true},
  {id:"m3",username:"carol.white",password:"soc123",name:"Carol White",role:"IR Specialist",shift:"Night",color:"av-b",email:"carol@soc.io",isAdmin:false,active:true},
  {id:"m4",username:"david.kim",password:"soc123",name:"David Kim",role:"Tier 2 Analyst",shift:"Day",color:"av-c",email:"david@soc.io",isAdmin:false,active:true},
  {id:"m5",username:"eve.johnson",password:"soc123",name:"Eve Johnson",role:"Junior Analyst",shift:"Night",color:"av-e",email:"eve@soc.io",isAdmin:false,active:true}
];
var ALL_ROLES=["Admin","Senior Analyst","Threat Hunter","IR Specialist","Tier 2 Analyst","Junior Analyst","SOC Manager","Forensic Analyst","Malware Analyst"];
var ALL_SHIFTS=["Day","Night","Weekend","24/7"];
var AV_GRAD={"av-a":"linear-gradient(135deg,#3b82f6,#2563eb)","av-b":"linear-gradient(135deg,#10b981,#059669)","av-c":"linear-gradient(135deg,#f59e0b,#d97706)","av-d":"linear-gradient(135deg,#8b5cf6,#7c3aed)","av-e":"linear-gradient(135deg,#ef4444,#dc2626)","av-f":"linear-gradient(135deg,#06b6d4,#0891b2)","av-g":"linear-gradient(135deg,#f97316,#ea580c)","av-h":"linear-gradient(135deg,#84cc16,#65a30d)"};
var SOC_SESSION=null;

// ── Prefixed helpers (no global name conflicts) ─────────────────────────────
function _aEl(t){return document.createElement(t);}
function _aCss(e,s){if(e&&e.style)e.style.cssText=s;}
function _aTxt(e,t){if(e)e.textContent=t;}

// ── User store ───────────────────────────────────────────────────────────────
function _loadUsers(){
  try{var r=localStorage.getItem("soc_users");if(r){var u=JSON.parse(r);if(Array.isArray(u)&&u.length)return u;}}catch(e){}
  var c=DEFAULT_AUTH_USERS.map(function(u){return Object.assign({},u);});
  localStorage.setItem("soc_users",JSON.stringify(c));return c;
}
function _saveUsers(u){localStorage.setItem("soc_users",JSON.stringify(u));}
function _getUsers(){return _loadUsers();}

// ── Session ──────────────────────────────────────────────────────────────────
function authInit(){
  try{
    var raw=localStorage.getItem("soc_session");
    if(!raw){window.location.href="login.html";return false;}
    var s=JSON.parse(raw);
    if(!s||s.expires<Date.now()){localStorage.removeItem("soc_session");window.location.href="login.html";return false;}
    var u=_getUsers().find(function(x){return x.id===s.id;});
    if(u&&u.active===false){localStorage.removeItem("soc_session");window.location.href="login.html";return false;}
    SOC_SESSION=s;return true;
  }catch(e){window.location.href="login.html";return false;}
}
function authLogout(){
  if(!confirm("Sign out of SOC Operations Center?"))return;
  localStorage.removeItem("soc_session");window.location.href="login.html";
}
function authGetSession(){return SOC_SESSION;}
function authIsAdmin(){return SOC_SESSION&&SOC_SESSION.isAdmin===true;}

// ── Topbar widget ────────────────────────────────────────────────────────────
function authInjectTopbar(){
  if(!SOC_SESSION)return;
  var s=SOC_SESSION;
  var grad=AV_GRAD[s.color]||AV_GRAD["av-a"];
  var ini=s.name?s.name[0].toUpperCase():"?";

  // Inject CSS — use _authStyleEl as variable name (NOT css, NOT el)
  if(!document.getElementById("auth-css")){
    var _authStyleEl=_aEl("style");
    _authStyleEl.id="auth-css";
    _authStyleEl.textContent=
      "@keyframes amIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}"+
      "@keyframes asIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}"+
      ".ami:hover{background:rgba(29,108,240,.15)!important;color:#60a5fa!important}"+
      ".ami.dng:hover{background:rgba(255,45,85,.1)!important;color:#ff8099!important}"+
      ".umrow:hover{background:rgba(29,108,240,.08)!important}";
    document.head.appendChild(_authStyleEl);
  }

  // ── Wrapper ──
  var _w=_aEl("div");_w.id="authWidget";_aCss(_w,"position:relative;display:flex;align-items:center");

  // ── Button ──
  var _btn=_aEl("button");_btn.id="authBtn";
  _aCss(_btn,"display:flex;align-items:center;gap:8px;background:rgba(13,37,69,.5);border:1px solid #1a3a6e;border-radius:8px;padding:5px 10px 5px 6px;cursor:pointer;font-family:monospace;font-size:10px;color:#e8f4ff;transition:all .15s;outline:none");

  var _av=_aEl("div");_av.id="authAvatar";
  _aCss(_av,"width:28px;height:28px;border-radius:7px;background:"+grad+";display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:#fff;flex-shrink:0");
  _aTxt(_av,ini);

  var _nb=_aEl("div");_aCss(_nb,"line-height:1.3;text-align:left");
  var _nd=_aEl("div");_nd.id="authName";_aCss(_nd,"font-weight:600;color:#e8f4ff;font-size:11px;letter-spacing:.04em");_aTxt(_nd,s.name);
  var _rd=_aEl("div");_rd.id="authRole";_aCss(_rd,"font-size:9px;color:#3d6080;letter-spacing:.06em");_aTxt(_rd,s.isAdmin?"🔐 ADMIN":s.role.toUpperCase());
  _nb.appendChild(_nd);_nb.appendChild(_rd);
  var _ar=_aEl("span");_aCss(_ar,"font-size:8px;color:#3d6080;margin-left:3px");_aTxt(_ar,"▾");
  _btn.appendChild(_av);_btn.appendChild(_nb);_btn.appendChild(_ar);

  // ── Dropdown ──
  var _mn=_aEl("div");_mn.id="authMenu";
  _aCss(_mn,"display:none;position:absolute;top:calc(100% + 8px);right:0;background:#050e1f;border:1px solid #1a3a6e;border-radius:10px;min-width:260px;padding:6px;box-shadow:0 8px 40px rgba(0,0,0,.7);z-index:9999");

  // Profile header
  var _ph=_aEl("div");_aCss(_ph,"display:flex;align-items:center;gap:10px;padding:12px;background:rgba(13,37,69,.4);border-radius:8px;margin-bottom:6px");
  var _ba=_aEl("div");_ba.id="authMenuAv";_aCss(_ba,"width:42px;height:42px;border-radius:10px;background:"+grad+";display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;color:#fff;flex-shrink:0");_aTxt(_ba,ini);
  var _ib=_aEl("div");
  var _in1=_aEl("div");_aCss(_in1,"font-weight:700;color:#e8f4ff;font-size:13px");_aTxt(_in1,s.name);
  var _in2=_aEl("div");_aCss(_in2,"font-size:10px;color:#8ab4d4;font-family:monospace;margin-top:1px");_aTxt(_in2,s.email);
  var _in3=_aEl("span");
  _aCss(_in3,"display:inline-block;margin-top:5px;font-size:9px;font-family:monospace;letter-spacing:.08em;padding:2px 7px;border-radius:4px;"+(s.isAdmin?"background:rgba(255,45,85,.15);color:#ff2d55;border:1px solid rgba(255,45,85,.3)":"background:rgba(59,142,248,.12);color:#60a5fa;border:1px solid rgba(59,142,248,.25)"));
  _aTxt(_in3,s.isAdmin?"🔐 ADMIN":s.role);
  _ib.appendChild(_in1);_ib.appendChild(_in2);_ib.appendChild(_in3);
  _ph.appendChild(_ba);_ph.appendChild(_ib);_mn.appendChild(_ph);

  // Session grid
  var _sg=_aEl("div");_aCss(_sg,"display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:2px 4px 10px");
  [["Shift",s.shift],["Status","Active"],["Login",new Date(s.loginTime).toLocaleTimeString()],["Expires",new Date(s.expires).toLocaleTimeString()]].forEach(function(it){
    var _b=_aEl("div");_aCss(_b,"background:rgba(5,14,31,.8);border:1px solid rgba(13,37,69,.9);border-radius:6px;padding:6px 8px");
    var _l=_aEl("div");_aCss(_l,"font-size:9px;color:#3d6080;font-family:monospace;letter-spacing:.08em;margin-bottom:1px");_aTxt(_l,it[0]);
    var _v=_aEl("div");_aCss(_v,"font-size:11px;color:#8ab4d4;font-family:monospace");_aTxt(_v,it[1]);
    _b.appendChild(_l);_b.appendChild(_v);_sg.appendChild(_b);
  });
  _mn.appendChild(_sg);

  function _mDiv(){var _d=_aEl("div");_aCss(_d,"height:1px;background:rgba(13,37,69,.9);margin:3px 0");return _d;}
  function _mLbl(t){var _d=_aEl("div");_aCss(_d,"font-size:8px;color:#3d6080;font-family:monospace;letter-spacing:.14em;padding:5px 12px 2px");_aTxt(_d,t);return _d;}
  function _mItem(_menu,icon,label,fn,danger){
    var _a=_aEl("a");_a.href="javascript:void(0)";_a.className="ami"+(danger?" dng":"");
    _aCss(_a,"display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:7px;font-size:11px;color:"+(danger?"#ff8099":"#8ab4d4")+";text-decoration:none;transition:all .12s;cursor:pointer");
    var _ic=_aEl("span");_aCss(_ic,"font-size:13px");_aTxt(_ic,icon);
    var _tx=_aEl("span");_aTxt(_tx,label);
    _a.appendChild(_ic);_a.appendChild(_tx);
    _a.addEventListener("click",function(){_menu.style.display="none";fn();});
    return _a;
  }

  _mn.appendChild(_mDiv());
  _mn.appendChild(_mLbl("ACCOUNT"));
  _mn.appendChild(_mItem(_mn,"👤","View Profile",authShowProfile,false));
  _mn.appendChild(_mItem(_mn,"🔑","Change Password",authChangePassword,false));
  if(s.isAdmin){
    _mn.appendChild(_mDiv());
    _mn.appendChild(_mLbl("ADMINISTRATION"));
    _mn.appendChild(_mItem(_mn,"⚙️","Admin Panel",authShowAdminPanel,false));
    _mn.appendChild(_mItem(_mn,"👥","User Management",authShowUserManagement,false));
  }
  _mn.appendChild(_mDiv());
  _mn.appendChild(_mItem(_mn,"🚪","Sign Out",authLogout,true));

  _w.appendChild(_btn);_w.appendChild(_mn);

  _btn.addEventListener("click",function(e){
    e.stopPropagation();
    var open=_mn.style.display!=="none";
    _mn.style.display=open?"none":"block";
    if(!open)_mn.style.animation="amIn .15s ease-out both";
  });
  document.addEventListener("click",function(){_mn.style.display="none";});
  _mn.addEventListener("click",function(e){e.stopPropagation();});
  _btn.addEventListener("mouseenter",function(){_btn.style.background="rgba(29,108,240,.15)";_btn.style.borderColor="#3b8ef8";});
  _btn.addEventListener("mouseleave",function(){_btn.style.background="rgba(13,37,69,.5)";_btn.style.borderColor="#1a3a6e";});

  var _ta=document.querySelector(".topbar-actions");
  if(_ta)_ta.insertBefore(_w,_ta.firstChild);
}

// ── Profile modal ─────────────────────────────────────────────────────────────
function authShowProfile(){
  var s=SOC_SESSION;if(!s||typeof showModal!=="function")return;
  var grad=AV_GRAD[s.color]||AV_GRAD["av-a"];
  var dur=Math.round((Date.now()-new Date(s.loginTime).getTime())/60000);
  var _body=_aEl("div");

  var _hdr=_aEl("div");_aCss(_hdr,"text-align:center;padding:8px 0 18px");
  var _avEl=_aEl("div");_aCss(_avEl,"width:72px;height:72px;border-radius:18px;background:"+grad+";display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:700;color:#fff;margin:0 auto 12px;box-shadow:0 0 30px rgba(59,130,246,.3)");_aTxt(_avEl,s.name[0]);
  var _nm=_aEl("div");_aCss(_nm,"font-size:18px;font-weight:700;color:var(--t1)");_aTxt(_nm,s.name);
  var _em=_aEl("div");_aCss(_em,"font-size:11px;color:var(--t3);font-family:var(--mono);margin-top:3px");_aTxt(_em,s.email);
  var _rb=_aEl("span");
  _aCss(_rb,"font-size:10px;font-family:var(--mono);letter-spacing:.1em;padding:3px 10px;border-radius:5px;margin-top:10px;display:inline-block;"+(s.isAdmin?"background:rgba(255,45,85,.12);color:#ef4444;border:1px solid rgba(255,45,85,.3)":"background:rgba(59,130,246,.1);color:#60a5fa;border:1px solid rgba(59,130,246,.2)"));
  _aTxt(_rb,s.isAdmin?"🔐 ADMIN":s.role);
  _hdr.appendChild(_avEl);_hdr.appendChild(_nm);_hdr.appendChild(_em);_hdr.appendChild(_rb);_body.appendChild(_hdr);

  var _grid=_aEl("div");_grid.className="g3";_aCss(_grid,"gap:8px;margin-bottom:16px");
  [["Shift",s.shift,"#f59e0b"],["Online",dur+"m","#10b981"],["Access",s.isAdmin?"FULL":"ANALYST",s.isAdmin?"#ef4444":"#3b82f6"]].forEach(function(it){
    var _box=_aEl("div");_aCss(_box,"background:rgba(13,37,69,.4);border:1px solid rgba(29,69,107,.5);border-radius:8px;padding:12px;text-align:center");
    var _val=_aEl("div");_aCss(_val,"font-size:16px;font-weight:700;font-family:var(--mono);color:"+it[2]);_aTxt(_val,it[1]);
    var _lbl=_aEl("div");_aCss(_lbl,"font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin-top:3px;font-family:var(--mono)");_aTxt(_lbl,it[0]);
    _box.appendChild(_val);_box.appendChild(_lbl);_grid.appendChild(_box);
  });
  _body.appendChild(_grid);

  var _ses=_aEl("div");_aCss(_ses,"background:rgba(13,37,69,.4);border:1px solid rgba(29,69,107,.6);border-radius:8px;padding:12px");
  var _sh=_aEl("div");_aCss(_sh,"font-size:9px;color:var(--t3);font-family:var(--mono);letter-spacing:.1em;margin-bottom:8px");_aTxt(_sh,"SESSION");_ses.appendChild(_sh);
  [["Username",s.username],["User ID",s.id],["Login",new Date(s.loginTime).toLocaleString()],["Expires",new Date(s.expires).toLocaleString()]].forEach(function(it){
    var _row=_aEl("div");_aCss(_row,"display:flex;justify-content:space-between;align-items:center;font-size:10px;padding:5px 0;border-bottom:1px solid rgba(13,37,69,.6)");
    var _k=_aEl("span");_aCss(_k,"color:var(--t3);font-family:var(--mono)");_aTxt(_k,it[0]);
    var _v=_aEl("span");_aCss(_v,"color:var(--t2);font-family:var(--mono)");_aTxt(_v,it[1]);
    _row.appendChild(_k);_row.appendChild(_v);_ses.appendChild(_row);
  });
  _body.appendChild(_ses);
  showModal("sm","👤 Analyst Profile",_body,[{label:"Sign Out",cls:"bs",fn:authLogout},{label:"Close",cls:"bp",fn:closeModal}]);
}

// ── Admin panel ───────────────────────────────────────────────────────────────
function authShowAdminPanel(){
  if(!authIsAdmin()||typeof showModal!=="function")return;
  var users=_getUsers();
  var active=users.filter(function(u){return u.active!==false;}).length;
  var admins=users.filter(function(u){return u.isAdmin;}).length;
  var _body=_aEl("div");

  var _sb=_aEl("div");_aCss(_sb,"display:flex;gap:10px;margin-bottom:16px");
  [["Total",users.length,"#60a5fa"],["Active",active,"#10b981"],["Admins",admins,"#ef4444"],["Analysts",users.length-admins,"#a78bfa"]].forEach(function(it){
    var _b=_aEl("div");_aCss(_b,"flex:1;background:rgba(13,37,69,.4);border:1px solid rgba(29,69,107,.5);border-radius:8px;padding:11px;text-align:center");
    var _v=_aEl("div");_aCss(_v,"font-size:20px;font-weight:700;font-family:var(--mono);color:"+it[2]);_aTxt(_v,String(it[1]));
    var _l=_aEl("div");_aCss(_l,"font-size:9px;color:var(--t3);font-family:var(--mono);text-transform:uppercase;letter-spacing:.08em;margin-top:2px");_aTxt(_l,it[0]);
    _b.appendChild(_v);_b.appendChild(_l);_sb.appendChild(_b);
  });
  _body.appendChild(_sb);

  var _tw=_aEl("div");_tw.className="tw";_aCss(_tw,"margin-bottom:14px");
  var _tbl=_aEl("table");_tbl.className="tbl";
  var _thead=_aEl("thead");var _htr=_aEl("tr");
  ["User","Role","Shift","Access","Action"].forEach(function(h){var _th=_aEl("th");_aTxt(_th,h);_htr.appendChild(_th);});
  _thead.appendChild(_htr);_tbl.appendChild(_thead);
  var _tbody=_aEl("tbody");
  users.forEach(function(u){
    var isMe=u.id===SOC_SESSION.id;
    var grad=AV_GRAD[u.color]||AV_GRAD["av-a"];
    var _tr=_aEl("tr");if(isMe)_aCss(_tr,"background:rgba(59,130,246,.05)");
    var _td1=_aEl("td");
    var _nc=_aEl("div");_aCss(_nc,"display:flex;align-items:center;gap:8px");
    var _avs=_aEl("div");_aCss(_avs,"width:26px;height:26px;border-radius:6px;background:"+grad+";display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff");_aTxt(_avs,u.name[0]);
    var _nd2=_aEl("div");
    var _n1=_aEl("div");_aCss(_n1,"font-size:11px;font-weight:600;color:var(--t1)");_aTxt(_n1,u.name+(isMe?" (you)":""));
    var _n2=_aEl("div");_aCss(_n2,"font-size:9px;color:var(--t3);font-family:var(--mono)");_aTxt(_n2,"@"+u.username);
    _nd2.appendChild(_n1);_nd2.appendChild(_n2);_nc.appendChild(_avs);_nc.appendChild(_nd2);_td1.appendChild(_nc);_tr.appendChild(_td1);
    var _td2=_aEl("td");_aCss(_td2,"font-size:10px;color:var(--t3)");_aTxt(_td2,u.role);_tr.appendChild(_td2);
    var _td3=_aEl("td");_aCss(_td3,"font-size:10px;color:var(--t3)");_aTxt(_td3,u.shift);_tr.appendChild(_td3);
    var _td4=_aEl("td");
    var _badge=_aEl("span");
    _aCss(_badge,"font-size:9px;font-family:monospace;padding:2px 7px;border-radius:4px;"+(u.active===false?"background:rgba(100,116,139,.1);color:#64748b;border:1px solid rgba(100,116,139,.25)":u.isAdmin?"background:rgba(255,45,85,.12);color:#ef4444;border:1px solid rgba(255,45,85,.3)":"background:rgba(59,142,248,.1);color:#60a5fa;border:1px solid rgba(59,142,248,.25)"));
    _aTxt(_badge,u.active===false?"INACTIVE":u.isAdmin?"🔐 ADMIN":"ANALYST");
    _td4.appendChild(_badge);_tr.appendChild(_td4);
    var _td5=_aEl("td");
    var _editBtn=_aEl("button");_editBtn.className="btn bs";_aCss(_editBtn,"font-size:9px;padding:3px 9px");_aTxt(_editBtn,"✏ Edit");
    (function(uid){_editBtn.addEventListener("click",function(){closeModal();setTimeout(function(){authShowUserManagement(uid);},80);});})(u.id);
    _td5.appendChild(_editBtn);_tr.appendChild(_td5);
    _tbody.appendChild(_tr);
  });
  _tbl.appendChild(_tbody);_tw.appendChild(_tbl);_body.appendChild(_tw);

  var _ft=_aEl("div");_aCss(_ft,"display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:rgba(13,37,69,.3);border:1px solid rgba(29,69,107,.5);border-radius:8px");
  var _ftt=_aEl("span");_aCss(_ftt,"font-size:10px;color:var(--t3);font-family:var(--mono)");_aTxt(_ftt,"Click ✏ Edit or open full User Management");
  var _umBtn=_aEl("button");_umBtn.className="btn bp";_aCss(_umBtn,"font-size:10px");_aTxt(_umBtn,"👥 User Management →");
  _umBtn.addEventListener("click",function(){closeModal();setTimeout(authShowUserManagement,80);});
  _ft.appendChild(_ftt);_ft.appendChild(_umBtn);_body.appendChild(_ft);

  showModal("lg","⚙️ Admin Panel",_body,[{label:"Sign Out",cls:"bs",fn:authLogout},{label:"Close",cls:"bp",fn:closeModal}]);
}

// ── User Management ───────────────────────────────────────────────────────────
function authShowUserManagement(selectId){
  if(!authIsAdmin()||typeof showModal!=="function")return;
  var activeId=selectId||null;

  function buildUserList(){
    var users=_getUsers();
    var _frag=_aEl("div");
    users.forEach(function(u){
      var sel=u.id===activeId;
      var isMe=u.id===SOC_SESSION.id;
      var grad=AV_GRAD[u.color]||AV_GRAD["av-a"];
      var _row=_aEl("div");_row.className="umrow";_row.dataset.uid=u.id;
      _aCss(_row,"display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:7px;cursor:pointer;border:1px solid "+(sel?"rgba(59,142,248,.4)":"rgba(13,37,69,.9)")+";background:"+(sel?"rgba(29,108,240,.1)":"rgba(5,14,31,.5)")+";margin-bottom:5px;transition:all .15s");
      var _av2=_aEl("div");_aCss(_av2,"width:30px;height:30px;border-radius:7px;background:"+grad+";display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0");_aTxt(_av2,u.name[0]);
      var _info=_aEl("div");_aCss(_info,"flex:1;min-width:0");
      var _uname=_aEl("div");_aCss(_uname,"font-size:11px;font-weight:600;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis");_aTxt(_uname,u.name+(isMe?" (you)":""));
      var _uhndl=_aEl("div");_aCss(_uhndl,"font-size:9px;color:var(--t3);font-family:var(--mono)");_aTxt(_uhndl,"@"+u.username);
      _info.appendChild(_uname);_info.appendChild(_uhndl);
      var _tag=_aEl("span");_aCss(_tag,"font-size:8px;font-family:monospace;padding:2px 6px;border-radius:3px;flex-shrink:0;"+(u.active===false?"background:rgba(100,116,139,.1);color:#64748b":u.isAdmin?"background:rgba(255,45,85,.12);color:#ef4444":"background:rgba(59,142,248,.1);color:#60a5fa"));
      _aTxt(_tag,u.active===false?"OFF":u.isAdmin?"ADM":"USR");
      _row.appendChild(_av2);_row.appendChild(_info);_row.appendChild(_tag);
      _frag.appendChild(_row);
    });
    return _frag;
  }

  function buildEditPane(uid){
    var _pane=_aEl("div");_aCss(_pane,"height:100%");
    if(!uid){
      _aCss(_pane,"display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--t3);font-family:var(--mono);font-size:12px;gap:12px");
      var _arr=_aEl("div");_aCss(_arr,"font-size:32px");_aTxt(_arr,"👈");
      var _msg=_aEl("div");_aTxt(_msg,"Select a user to edit");
      _pane.appendChild(_arr);_pane.appendChild(_msg);return _pane;
    }
    var users=_getUsers();
    var u=users.find(function(x){return x.id===uid;});
    if(!u){_aTxt(_pane,"User not found");return _pane;}
    var isMe=u.id===SOC_SESSION.id;
    var grad=AV_GRAD[u.color]||AV_GRAD["av-a"];
    _aCss(_pane,"animation:asIn .2s ease-out both");

    var _hd=_aEl("div");_aCss(_hd,"display:flex;align-items:center;gap:12px;padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid rgba(13,37,69,.9)");
    var _hav=_aEl("div");_hav.id="um-av-prev";_aCss(_hav,"width:48px;height:48px;border-radius:12px;background:"+grad+";display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff");_aTxt(_hav,u.name[0]);
    var _hi=_aEl("div");
    var _hn=_aEl("div");_aCss(_hn,"font-size:14px;font-weight:700;color:var(--t1)");_aTxt(_hn,u.name);
    var _hid=_aEl("div");_aCss(_hid,"font-size:10px;color:var(--t3);font-family:var(--mono)");_aTxt(_hid,"ID: "+u.id+" · @"+u.username);
    _hi.appendChild(_hn);_hi.appendChild(_hid);_hd.appendChild(_hav);_hd.appendChild(_hi);_pane.appendChild(_hd);

    var _form=_aEl("div");_aCss(_form,"display:flex;flex-direction:column;gap:11px");
    var _r1=_aEl("div");_aCss(_r1,"display:grid;grid-template-columns:1fr 1fr;gap:9px");
    _r1.appendChild(_umFld("Full Name","um-name",u.name,"text","Full name"));
    _r1.appendChild(_umFld("Username","um-uname",u.username,"text","username"));
    _form.appendChild(_r1);
    _form.appendChild(_umFld("Email","um-email",u.email,"email","user@soc.io"));

    var _r2=_aEl("div");_aCss(_r2,"display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px");
    _r2.appendChild(_umSel("Role","um-role",ALL_ROLES,u.role,null));
    _r2.appendChild(_umSel("Shift","um-shift",ALL_SHIFTS,u.shift,null));
    _r2.appendChild(_umSel("Avatar","um-color",Object.keys(AV_GRAD),u.color,function(val){
      var _hav2=document.getElementById("um-av-prev");if(_hav2)_hav2.style.background=AV_GRAD[val]||AV_GRAD["av-a"];
    }));
    _form.appendChild(_r2);

    var _r3=_aEl("div");_aCss(_r3,"display:grid;grid-template-columns:1fr 1fr;gap:9px");
    _r3.appendChild(_umFld("New Password","um-pass","","password","leave blank to keep"));
    _r3.appendChild(_umFld("Confirm Pass","um-pass2","","password","confirm new password"));
    _form.appendChild(_r3);

    var _ac=_aEl("div");_aCss(_ac,"background:rgba(13,37,69,.35);border:1px solid rgba(29,69,107,.6);border-radius:8px;padding:12px 14px");
    var _ach=_aEl("div");_aCss(_ach,"font-size:9px;color:var(--t3);font-family:var(--mono);letter-spacing:.12em;margin-bottom:4px");_aTxt(_ach,"ACCESS CONTROLS");_ac.appendChild(_ach);
    _ac.appendChild(_umToggle("um-admin","Admin Privileges","Full access: user management, all settings",u.isAdmin===true,isMe&&u.isAdmin===true));
    _ac.appendChild(_umToggle("um-active","Account Active","Allow this user to log in to the platform",u.active!==false,isMe));
    _form.appendChild(_ac);

    var _btns=_aEl("div");_aCss(_btns,"display:flex;gap:8px;justify-content:flex-end;padding-top:2px");
    if(uid!=="admin"&&!isMe){
      var _delBtn=_aEl("button");_delBtn.className="btn bs";_aCss(_delBtn,"color:#ef4444;border-color:rgba(255,45,85,.3);font-size:10px");_aTxt(_delBtn,"🗑 Delete");
      (function(id){_delBtn.addEventListener("click",function(){authDeleteUser(id);});})(uid);
      _btns.appendChild(_delBtn);
    }
    var _canBtn=_aEl("button");_canBtn.className="btn bs";_aCss(_canBtn,"font-size:10px");_aTxt(_canBtn,"Cancel");
    _canBtn.addEventListener("click",function(){authShowUserManagement();});
    var _savBtn=_aEl("button");_savBtn.className="btn bp";_aCss(_savBtn,"font-size:10px");_aTxt(_savBtn,"💾 Save Changes");
    (function(id){_savBtn.addEventListener("click",function(){authSaveUser(id);});})(uid);
    _btns.appendChild(_canBtn);_btns.appendChild(_savBtn);_form.appendChild(_btns);
    _pane.appendChild(_form);
    return _pane;
  }

  var _wrap=_aEl("div");_aCss(_wrap,"display:flex;gap:14px;height:430px");
  var _left=_aEl("div");_aCss(_left,"width:198px;flex-shrink:0;display:flex;flex-direction:column");
  var _lhdr=_aEl("div");_aCss(_lhdr,"font-size:8px;color:#3d6080;font-family:monospace;letter-spacing:.14em;padding:3px 2px 6px");_aTxt(_lhdr,"TEAM MEMBERS");
  var _llist=_aEl("div");_llist.id="um-list";_aCss(_llist,"flex:1;overflow-y:auto;padding-right:3px");
  _llist.appendChild(buildUserList());
  var _addBtn=_aEl("button");_addBtn.className="btn bp";_aCss(_addBtn,"margin-top:8px;font-size:10px;width:100%");_aTxt(_addBtn,"+ Add New User");
  _addBtn.addEventListener("click",authAddNewUser);
  _left.appendChild(_lhdr);_left.appendChild(_llist);_left.appendChild(_addBtn);
  var _divider=_aEl("div");_aCss(_divider,"width:1px;background:rgba(13,37,69,.9);flex-shrink:0");
  var _right=_aEl("div");_right.id="um-edit";_aCss(_right,"flex:1;overflow-y:auto;padding-left:4px");
  _right.appendChild(buildEditPane(activeId));
  _wrap.appendChild(_left);_wrap.appendChild(_divider);_wrap.appendChild(_right);

  showModal("lg","👥 User Management — Access Controls",_wrap,[{label:"Sign Out",cls:"bs",fn:authLogout},{label:"Close",cls:"bp",fn:closeModal}]);

  setTimeout(function(){
    function bindRows(){
      document.querySelectorAll(".umrow").forEach(function(row){
        row.addEventListener("click",function(){
          activeId=row.dataset.uid;
          var _edit=document.getElementById("um-edit");
          if(_edit){while(_edit.firstChild)_edit.removeChild(_edit.firstChild);_edit.appendChild(buildEditPane(activeId));}
          document.querySelectorAll(".umrow").forEach(function(r){
            var sel=r.dataset.uid===activeId;
            r.style.borderColor=sel?"rgba(59,142,248,.4)":"rgba(13,37,69,.9)";
            r.style.background=sel?"rgba(29,108,240,.1)":"rgba(5,14,31,.5)";
          });
        });
      });
    }
    bindRows();
    window._umRefresh=function(){
      var _lst=document.getElementById("um-list");
      if(_lst){while(_lst.firstChild)_lst.removeChild(_lst.firstChild);_lst.appendChild(buildUserList());}
      bindRows();
    };
  },60);
}

// ── Form helpers (all prefixed) ───────────────────────────────────────────────
function _umFld(label,id,val,type,ph){
  var _wrap=_aEl("div");
  var _lbl=_aEl("label");_lbl.className="fl";
  _aCss(_lbl,"font-size:9px;color:var(--t3);font-family:var(--mono);letter-spacing:.1em;display:block;margin-bottom:5px");
  _aTxt(_lbl,label.toUpperCase());
  var _inp=_aEl("input");_inp.className="inp";_inp.id=id;_inp.type=type;_inp.value=val;_inp.placeholder=ph;
  _wrap.appendChild(_lbl);_wrap.appendChild(_inp);return _wrap;
}
function _umSel(label,id,opts,sel,onChange){
  var _wrap=_aEl("div");
  var _lbl=_aEl("label");_lbl.className="fl";
  _aCss(_lbl,"font-size:9px;color:var(--t3);font-family:var(--mono);letter-spacing:.1em;display:block;margin-bottom:5px");
  _aTxt(_lbl,label.toUpperCase());
  var _s=_aEl("select");_s.className="sel";_s.id=id;
  opts.forEach(function(o){var _op=_aEl("option");_op.value=o;_aTxt(_op,o);if(o===sel)_op.selected=true;_s.appendChild(_op);});
  if(onChange)_s.addEventListener("change",function(){onChange(_s.value);});
  _wrap.appendChild(_lbl);_wrap.appendChild(_s);return _wrap;
}
function _umToggle(id,label,desc,checked,disabled){
  var _wrap=_aEl("div");_aCss(_wrap,"display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid rgba(13,37,69,.8)");
  var _txt=_aEl("div");
  var _tl=_aEl("div");_aCss(_tl,"font-size:11px;color:var(--t1);font-weight:600");_aTxt(_tl,label);
  var _td=_aEl("div");_aCss(_td,"font-size:9px;color:var(--t3);margin-top:2px");_aTxt(_td,desc+(disabled?" · cannot modify own account":""));
  _txt.appendChild(_tl);_txt.appendChild(_td);
  var _tog=_aEl("span");_tog.id=id;
  _aCss(_tog,"margin-top:2px;width:38px;height:20px;border-radius:10px;display:inline-flex;align-items:center;position:relative;flex-shrink:0;cursor:"+(disabled?"not-allowed":"pointer")+";transition:background .2s;background:"+(checked?"#10b981":"rgba(13,37,69,.9)")+";border:1px solid rgba(255,255,255,.08)");
  var _knob=_aEl("span");_aCss(_knob,"position:absolute;width:14px;height:14px;border-radius:50%;background:#fff;top:2px;left:2px;transition:transform .2s;transform:"+(checked?"translateX(18px)":"translateX(0)"));
  _tog.appendChild(_knob);
  if(!disabled){
    _tog.addEventListener("click",function(){
      var on=_tog.style.background==="rgb(16, 185, 129)";
      _tog.style.background=on?"rgba(13,37,69,.9)":"#10b981";
      _knob.style.transform=on?"translateX(0)":"translateX(18px)";
    });
  }
  _wrap.appendChild(_txt);_wrap.appendChild(_tog);return _wrap;
}

// ── Save user ─────────────────────────────────────────────────────────────────
function authSaveUser(uid){
  var users=_getUsers();
  var idx=users.findIndex(function(u){return u.id===uid;});
  if(idx===-1){alert("User not found");return;}
  var u=users[idx],isMe=uid===SOC_SESSION.id;
  var _g=function(id){return (document.getElementById(id)||{value:""}).value;};
  var nm=_g("um-name").trim(),un=_g("um-uname").trim().toLowerCase(),em=_g("um-email").trim();
  var ro=_g("um-role"),sh=_g("um-shift"),co=_g("um-color");
  var pw=_g("um-pass"),pw2=_g("um-pass2");
  if(!nm||!un||!em){alert("Name, username and email required");return;}
  if(pw&&pw!==pw2){alert("Passwords do not match");return;}
  if(pw&&pw.length<4){alert("Password too short (min 4)");return;}
  if(users.find(function(x){return x.username===un&&x.id!==uid;})){alert("Username already taken");return;}
  var _admEl=document.getElementById("um-admin"),_actEl=document.getElementById("um-active");
  var newAdm=_admEl?_admEl.style.background==="rgb(16, 185, 129)":u.isAdmin;
  var newAct=_actEl?_actEl.style.background==="rgb(16, 185, 129)":(u.active!==false);
  if(isMe&&u.isAdmin&&!newAdm){alert("Cannot remove own admin privileges");return;}
  if(isMe&&!newAct){alert("Cannot deactivate own account");return;}
  users[idx]=Object.assign({},u,{name:nm,username:un,email:em,role:ro,shift:sh,color:co,isAdmin:newAdm,active:newAct,password:pw?pw:u.password});
  _saveUsers(users);
  if(isMe){
    SOC_SESSION=Object.assign({},SOC_SESSION,{name:nm,email:em,role:ro,shift:sh,color:co,isAdmin:newAdm});
    localStorage.setItem("soc_session",JSON.stringify(SOC_SESSION));
    var _g2=AV_GRAD[co]||AV_GRAD["av-a"];
    ["authAvatar","authMenuAv"].forEach(function(id){var _e=document.getElementById(id);if(_e){_e.style.background=_g2;_aTxt(_e,nm[0]);}});
    var _ne=document.getElementById("authName");if(_ne)_aTxt(_ne,nm);
    var _re=document.getElementById("authRole");if(_re)_aTxt(_re,newAdm?"🔐 ADMIN":ro.toUpperCase());
  }
  if(typeof addNotification==="function")addNotification("✅ '"+nm+"' updated");
  if(typeof window._umRefresh==="function")window._umRefresh();
  var _ep=document.getElementById("um-edit");
  if(_ep){
    var _flash=_aEl("div");
    _aCss(_flash,"padding:16px;font-family:var(--mono);font-size:12px;color:#10b981;text-align:center;animation:asIn .3s ease-out both");
    _aTxt(_flash,"✅ Changes saved! Select user to continue editing.");
    while(_ep.firstChild)_ep.removeChild(_ep.firstChild);
    _ep.appendChild(_flash);
  }
}

// ── Delete user ───────────────────────────────────────────────────────────────
function authDeleteUser(uid){
  if(uid==="admin"){alert("Cannot delete administrator");return;}
  if(uid===SOC_SESSION.id){alert("Cannot delete own account");return;}
  var users=_getUsers();
  var u=users.find(function(x){return x.id===uid;});
  if(!u||!confirm("Delete '"+u.name+"'? Cannot be undone."))return;
  _saveUsers(users.filter(function(x){return x.id!==uid;}));
  if(typeof addNotification==="function")addNotification("🗑 '"+u.name+"' deleted");
  closeModal();setTimeout(authShowUserManagement,80);
}

// ── Add new user ──────────────────────────────────────────────────────────────
function authAddNewUser(){
  if(typeof showModal!=="function")return;
  var _body=_aEl("div");_aCss(_body,"display:flex;flex-direction:column;gap:12px;padding:4px 0");
  var _r1=_aEl("div");_aCss(_r1,"display:grid;grid-template-columns:1fr 1fr;gap:10px");
  _r1.appendChild(_umFld("Full Name","nu-name","","text","Jane Smith"));
  _r1.appendChild(_umFld("Username","nu-uname","","text","jane.smith"));
  _body.appendChild(_r1);
  _body.appendChild(_umFld("Email","nu-email","","email","jane@soc.io"));
  var _r2=_aEl("div");_aCss(_r2,"display:grid;grid-template-columns:1fr 1fr;gap:10px");
  _r2.appendChild(_umFld("Password","nu-pass","","password","min 4 chars"));
  _r2.appendChild(_umFld("Confirm","nu-pass2","","password","confirm"));
  _body.appendChild(_r2);
  var _r3=_aEl("div");_aCss(_r3,"display:grid;grid-template-columns:1fr 1fr;gap:10px");
  _r3.appendChild(_umSel("Role","nu-role",ALL_ROLES,ALL_ROLES[0],null));
  _r3.appendChild(_umSel("Shift","nu-shift",ALL_SHIFTS,ALL_SHIFTS[0],null));
  _body.appendChild(_r3);
  _body.appendChild(_umToggle("nu-admin","Admin Privileges","Full system access and user management",false,false));
  showModal("sm","➕ Add New User",_body,[{label:"Create User",cls:"bp",fn:function(){
    var nm=document.getElementById("nu-name").value.trim();
    var un=document.getElementById("nu-uname").value.trim().toLowerCase();
    var em=document.getElementById("nu-email").value.trim();
    var pw=document.getElementById("nu-pass").value;
    var pw2=document.getElementById("nu-pass2").value;
    var ro=document.getElementById("nu-role").value;
    var sh=document.getElementById("nu-shift").value;
    var _adminTog=document.getElementById("nu-admin");
    var adm=_adminTog?_adminTog.style.background==="rgb(16, 185, 129)":false;
    if(!nm||!un||!em||!pw){alert("All fields required");return;}
    if(pw!==pw2){alert("Passwords do not match");return;}
    if(pw.length<4){alert("Password too short");return;}
    var users=_getUsers();
    if(users.find(function(u){return u.username===un;})){alert("Username already exists");return;}
    var nu={id:"u"+Date.now(),username:un,password:pw,name:nm,role:ro,shift:sh,color:"av-a",email:em,isAdmin:adm,active:true};
    users.push(nu);_saveUsers(users);
    if(typeof addNotification==="function")addNotification("✅ '"+nm+"' created");
    closeModal();setTimeout(function(){authShowUserManagement(nu.id);},80);
  }},{label:"Cancel",cls:"bs",fn:function(){closeModal();setTimeout(authShowUserManagement,80);}}]);
}

// ── Change own password ────────────────────────────────────────────────────────
function authChangePassword(){
  if(typeof showModal!=="function")return;
  var _body=_aEl("div");_aCss(_body,"display:flex;flex-direction:column;gap:13px;padding:4px 0");
  _body.appendChild(_umFld("Current Password","cp-old","","password","current password"));
  _body.appendChild(_umFld("New Password","cp-new","","password","new password (min 4)"));
  _body.appendChild(_umFld("Confirm New Password","cp-conf","","password","confirm new password"));
  showModal("sm","🔑 Change Password",_body,[{label:"Update Password",cls:"bp",fn:function(){
    var old=document.getElementById("cp-old").value;
    var nw=document.getElementById("cp-new").value;
    var cf=document.getElementById("cp-conf").value;
    if(!old||!nw||!cf){alert("All fields required");return;}
    if(nw!==cf){alert("Passwords do not match");return;}
    if(nw.length<4){alert("Min 4 characters");return;}
    var users=_getUsers();
    var idx=users.findIndex(function(u){return u.id===SOC_SESSION.id;});
    if(idx===-1||users[idx].password!==old){alert("Current password incorrect");return;}
    users[idx].password=nw;_saveUsers(users);closeModal();
    if(typeof addNotification==="function")addNotification("🔑 Password updated");
  }},{label:"Cancel",cls:"bs",fn:closeModal}]);
}