// ===== DASHBOARD (main) =====
// dashboard.js — SOC Operations Center v6 · Main Dashboard Logic
var alerts=[], filteredAlerts=[], stats=null;
var sF="all", pF="all", dF="all", srch="";
var notifs=[], overrides={}, demoMode=false;
var members=JSON.parse(localStorage.getItem("soc_members")||"null");
var groups=JSON.parse(localStorage.getItem("soc_groups")||"null");
overrides=JSON.parse(localStorage.getItem("soc_overrides")||"{}");

var DEFAULT_MEMBERS=[
  {id:"m1",name:"Alice Chen",  role:"Senior Analyst",    shift:"Day",  color:"av-a",email:"alice@soc.io"},
  {id:"m2",name:"Bob Martinez",role:"Threat Hunter",     shift:"Day",  color:"av-d",email:"bob@soc.io"},
  {id:"m3",name:"Carol White", role:"IR Specialist",     shift:"Night",color:"av-b",email:"carol@soc.io"},
  {id:"m4",name:"David Kim",   role:"Tier 2 Analyst",   shift:"Day",  color:"av-c",email:"david@soc.io"},
  {id:"m5",name:"Eve Johnson", role:"Junior Analyst",    shift:"Night",color:"av-e",email:"eve@soc.io"},
];
var DEFAULT_GROUPS=[
  {id:"g1",name:"Day Shift",         icon:"☀️",color:"#f59e0b",members:["m1","m2","m4"]},
  {id:"g2",name:"Night Shift",       icon:"🌙",color:"#8b5cf6",members:["m3","m5"]},
  {id:"g3",name:"Incident Response", icon:"🚨",color:"#ef4444",members:["m1","m3"]},
];
if(!members)members=DEFAULT_MEMBERS.map(function(m){return Object.assign({},m);});
if(!groups) groups=DEFAULT_GROUPS.map(function(g){return Object.assign({},g,{members:g.members.slice()});});

var AV_COLS=["av-a","av-b","av-c","av-d","av-e","av-f","av-g","av-h"];
var ROLES=["Senior Analyst","Threat Hunter","IR Specialist","Tier 2 Analyst","Junior Analyst","SOC Manager","Forensic Analyst","Malware Analyst"];
var SHIFTS=["Day","Night","Weekend"];

function saveM(){localStorage.setItem("soc_members",JSON.stringify(members));localStorage.setItem("soc_groups",JSON.stringify(groups));}
function saveOv(){localStorage.setItem("soc_overrides",JSON.stringify(overrides));}

// ── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded",function(){
  try{if(typeof authInjectTopbar==="function")authInjectTopbar();}catch(authErr){console.warn("Auth widget error:",authErr);}
  try{bindNav();}catch(e){console.warn(e);}
  try{bindControls();}catch(e){console.warn(e);}
  loadData();
  setInterval(loadData,30000);
  try{initLiveFeed(function(aid){var a=alerts.find(function(x){return x.alert_id===aid;});if(a)openAlertProfile(a);});}catch(e){console.warn(e);}
});

// ── Data Load ─────────────────────────────────────────────────────────────────
async function loadData(){
  var loaded=false;
  try{
    var ctrl=new AbortController();
    var tid=setTimeout(function(){ctrl.abort();},5000);
    var fetchAlerts=fetch(API_BASE_URL+"/api/alerts",{signal:ctrl.signal,mode:"cors"});
    var fetchStats =fetch(API_BASE_URL+"/api/stats", {signal:ctrl.signal,mode:"cors"});
    var r1=await fetchAlerts;
    var r2=await fetchStats;
    clearTimeout(tid);
    if(r1.ok && r2.ok){
      var a=await r1.json();
      var s=await r2.json();
      if(Array.isArray(a) && a.length){
        alerts=a; stats=s; loaded=true;
      }
    }
  }catch(e){ /* network/CORS/timeout — fall through to demo */ }

  if(!loaded){
    if(!alerts.length){ alerts=genDemoAlerts(); }
    stats=genDemoStats(alerts);
    setDemoMode(true);
  } else {
    setDemoMode(false);
  }

  renderStats();
  applyFilters();
  addNotification(demoMode?"📊 Demo mode: "+alerts.length+" NSL-KDD alerts":"✅ Live API: "+alerts.length+" alerts");
  var av=document.querySelector(".ntab.active");
  if(av){
    var v=av.getAttribute("data-v");
    if(v==="analytics")renderAnalytics();
    if(v==="team")renderTeam();
    if(v==="attack-map")updateAttackMap(alerts);
    if(v==="threat-intel")renderThreatIntel();
  }
}

function genDemoAlerts(){
  var types=["ddos_attack","dos_attack","brute_force","web_attack","sql_injection","malware_detection","port_scan","data_exfiltration","vulnerability_exploit"];
  var assets=["Web Server","File Server","Domain Controller","Gateway Router","Firewall","Windows 10 VM1","Ubuntu 14.04","Windows 7 Pro"];
  var crits=["critical","high","medium","low"];
  var sevs=["critical","critical","high","high","medium","medium","low"];
  var stats_pool=["new","new","new","investigating","investigating","resolved","resolved","false_positive","escalated"];
  var ips=["205.174.165.68","185.220.101.5","198.51.100.23","91.189.88.152","45.67.89.123","103.216.221.19","203.0.113.45","62.210.37.82"];
  var sigs={"ddos_attack":"DDoS","dos_attack":"DoS Hulk","brute_force":"SSH-Patator","web_attack":"Web Attack – XSS","sql_injection":"Web Attack – Sql Injection","malware_detection":"Bot","port_scan":"PortScan","data_exfiltration":"Infiltration","vulnerability_exploit":"Heartbleed"};
  var out=[]; var now=Date.now();
  for(var i=0;i<100;i++){
    var t=types[i%types.length], sev=sevs[Math.floor(Math.random()*sevs.length)];
    var st=stats_pool[Math.floor(Math.random()*stats_pool.length)];
    var ip=ips[Math.floor(Math.random()*ips.length)];
    var ai=Math.floor(Math.random()*assets.length);
    var risk=Math.round(20+Math.random()*78);
    out.push({alert_id:"ALT-"+String(i+1001),timestamp:new Date(now-Math.random()*604800000).toISOString(),
      alert_type:t,severity:sev,priority_level:["critical","high"].includes(sev)?(sev==="critical"?"immediate":"high"):"normal",
      status:st,risk_score:risk,model_confidence:risk/100,asset_name:assets[ai],
      asset_criticality:crits[Math.floor(Math.random()*crits.length)],
      source_ip:ip,dest_ip:"192.168.10."+(Math.floor(Math.random()*254)+1),dest_port:Math.floor(Math.random()*9000)+80,
      assigned_to:st!=="new"?DEFAULT_MEMBERS[Math.floor(Math.random()*DEFAULT_MEMBERS.length)].name:null,
      signature_name:sigs[t]||t,raw_label:sigs[t]||t,protocol:"TCP",
      recommended_action:"Investigate and respond per standard playbook",
      custom_title:null,custom_description:null,playbook_result:null,notes:[],history:[]});
  }
  return out;
}
function genDemoStats(arr){
  var sc={};arr.forEach(function(a){sc[a.status]=(sc[a.status]||0)+1;});
  var tc={};arr.forEach(function(a){tc[a.alert_type]=(tc[a.alert_type]||0)+1;});
  var ac={};arr.forEach(function(a){ac[a.asset_name]=(ac[a.asset_name]||0)+1;});
  var risks=arr.map(function(a){return a.risk_score||0;});
  return {total_alerts_processed:arr.length,alerts_investigating:sc.investigating||0,alerts_resolved:sc.resolved||0,
    false_positives_filtered:sc.false_positive||0,alerts_escalated:sc.escalated||0,
    time_saved_hours:+(arr.length*0.35).toFixed(1),model_accuracy:0.924,
    status_counts:sc,type_counts:tc,asset_counts:ac,
    avg_risk_score:Math.round(risks.reduce(function(a,b){return a+b;},0)/risks.length),
    analyst_workload:{}};
}
function setDemoMode(demo){
  demoMode=demo;
  var bar=document.getElementById("demoBar");
  if(bar)bar.classList.toggle("hidden",!demo);
}

// ── Stats Cards ───────────────────────────────────────────────────────────────
function renderStats(){
  if(!stats)return;
  setText("s-tot",stats.total_alerts_processed||0);
  setText("s-inv",stats.alerts_investigating||0);
  setText("s-res",stats.alerts_resolved||0);
  setText("s-fp", stats.false_positives_filtered||0);
  setText("s-esc",stats.alerts_escalated||0);
  setText("s-time",(stats.time_saved_hours||0)+"h");
  setText("s-acc", Math.round((stats.model_accuracy||0)*100)+"%");
  setText("s-risk",stats.avg_risk_score||0);
}
function setText(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}

// ── Filters ───────────────────────────────────────────────────────────────────
function applyFilters(){
  var list=alerts.slice();
  if(sF!=="all")list=list.filter(function(a){return (overrides[a.alert_id]&&overrides[a.alert_id].status)||a.status===sF;});
  if(pF!=="all")list=list.filter(function(a){return a.priority_level===pF;});
  if(srch){var t=srch.toLowerCase();list=list.filter(function(a){return (a.alert_id||"").toLowerCase().includes(t)||(a.alert_type||"").toLowerCase().includes(t)||(a.asset_name||"").toLowerCase().includes(t)||(a.source_ip||"").includes(t)||(a.signature_name||"").toLowerCase().includes(t);});}
  if(dF!=="all"){var now=Date.now();list=list.filter(function(a){var h=(now-new Date(a.timestamp).getTime())/3600000;return dF==="24h"?h<=24:dF==="7d"?h<=168:dF==="30d"?h<=720:true;});}
  filteredAlerts=list; renderTable();
}
function getStatus(a){return (overrides[a.alert_id]&&overrides[a.alert_id].status)||a.status;}

function tsAgo(ts){var s=Math.floor((Date.now()-new Date(ts).getTime())/1000);if(s<60)return s+"s";if(s<3600)return Math.floor(s/60)+"m";if(s<86400)return Math.floor(s/3600)+"h";return Math.floor(s/86400)+"d";}

// ── Alert Table ───────────────────────────────────────────────────────────────
function renderTable(){
  var tbody=document.getElementById("alertsBody"),empty=document.getElementById("alertsEmpty"),cnt=document.getElementById("alertCnt");
  if(!tbody)return;
  tbody.innerHTML="";
  if(cnt)cnt.textContent=filteredAlerts.length+" alerts";
  if(!filteredAlerts.length){if(empty)empty.classList.remove("hidden");return;}
  if(empty)empty.classList.add("hidden");
  filteredAlerts.forEach(function(a){
    var ov=overrides[a.alert_id]||{};
    var status=ov.status||a.status||"new";
    var title=ov.title||(a.signature_name||a.alert_type||"").replace(/_/g," ");
    var assignee=ov.assignee||a.assigned_to||"—";
    var risk=typeof a.risk_score==="number"?Math.round(a.risk_score):Math.round((a.model_confidence||0)*100);
    var rCol=risk>=80?"#ef4444":risk>=60?"#f97316":risk>=40?"#f59e0b":"#10b981";
    var pCls=a.priority_level==="immediate"?"pri-imm":a.priority_level==="high"?"pri-hig":a.priority_level==="low"?"pri-low":"pri-nor";
    var sCls="p-"+status.replace(/[^a-z_]/g,"");
    var tr=document.createElement("tr");
    tr.innerHTML=
      '<td style="width:26px"><input type="checkbox" style="accent-color:var(--blue)"/></td>'+
      '<td><span class="pill '+sCls+'">'+status.replace(/_/g," ").toUpperCase()+'</span></td>'+
      '<td>'+
        '<div style="font-weight:600;font-size:12px">'+title+'</div>'+
        '<div style="font-size:9px;color:var(--t3);font-family:var(--mono)">'+a.alert_id+'</div>'+
        (ov.description?'<div style="font-size:9px;color:var(--teal);margin-top:1px">📝 '+ov.description.slice(0,38)+'…</div>':'')+
        (ov.playbookResult?'<div style="font-size:9px;color:var(--green);margin-top:1px">✅ Playbook complete</div>':'')+
      '</td>'+
      '<td><div style="font-size:12px">'+( a.asset_name||"—")+'</div><div style="font-size:9px;color:var(--t3)">'+(a.severity||"")+'</div></td>'+
      '<td><span class="pri '+pCls+'">'+(a.priority_level||"").slice(0,3).toUpperCase()+'</span></td>'+
      '<td><div class="rc"><span class="rn" style="color:'+rCol+'">'+risk+'</span><div class="rt"><div class="rf" style="width:'+Math.min(risk,100)+'%;background:'+rCol+'"></div></div></div></td>'+
      '<td style="font-size:11px;color:var(--t2)">'+assignee+'</td>'+
      '<td style="font-size:10px;color:var(--t3);font-family:var(--mono)">'+tsAgo(a.timestamp)+'</td>'+
      '<td><button class="btn bs bsm" data-id="'+a.alert_id+'">Profile</button></td>';
    tr.querySelector("[data-id]").addEventListener("click",function(e){e.stopPropagation();openAlertProfile(a);});
    tr.addEventListener("click",function(){openAlertProfile(a);});
    tbody.appendChild(tr);
  });
}

// ── Alert Profile ─────────────────────────────────────────────────────────────
function openAlertProfile(a){
  window._pa=a;
  var ov=overrides[a.alert_id]||{};
  var status=ov.status||a.status||"new";
  var title=ov.title||(a.signature_name||a.alert_type||"").replace(/_/g," ");
  var risk=typeof a.risk_score==="number"?Math.round(a.risk_score):0;
  var rCol=risk>=80?"#ef4444":risk>=60?"#f97316":risk>=40?"#f59e0b":"#10b981";
  var mOpts=members.map(function(m){return '<option value="'+m.name+'"'+((ov.assignee||a.assigned_to)===m.name?" selected":"")+'>'+m.name+" — "+m.role+'</option>';}).join("");
  var sOpts=["new","investigating","resolved","false_positive","escalated"].map(function(s){return '<option value="'+s+'"'+(status===s?" selected":"")+'>'+s.replace(/_/g," ")+'</option>';}).join("");
  showModal("lg","🔍 Alert Profile — "+a.alert_id,
    '<div class="g2" style="gap:18px">'+
    '<div>'+
      '<div class="frow"><label class="fl">Custom Title</label><input class="inp" id="ap-t" value="'+title+'" placeholder="Rename this alert…"/></div>'+
      '<div class="frow"><label class="fl">Investigation Notes</label><textarea class="inp" id="ap-d" placeholder="Add context, investigation notes…">'+( ov.description||"")+'</textarea></div>'+
      '<div class="frow"><label class="fl">Assign To Member</label><select class="sel" id="ap-a"><option value="">— Unassigned —</option>'+mOpts+'</select></div>'+
      '<div class="frow"><label class="fl">Status Override</label><select class="sel" id="ap-s">'+sOpts+'</select></div>'+
      (ov.playbookResult?'<div class="frow"><label class="fl">Playbook Result</label><div style="background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.2);border-radius:7px;padding:9px 12px;font-size:11px;color:var(--green)">'+ov.playbookResult+'</div></div>':'')+
      '<button class="btn bp" style="width:100%;margin-top:5px" onclick="closeModal();openPlaybookRunner(window._pa)">▶ Run Automated Playbook</button>'+
    '</div>'+
    '<div>'+
      '<div style="background:var(--s2);border:1px solid var(--b2);border-radius:9px;padding:14px">'+
        '<div class="sect-title" style="margin-bottom:9px">Alert Details</div>'+
        [["Alert ID",'<span style="font-family:var(--mono)">'+a.alert_id+'</span>'],
         ["NSL-KDD Signature",(a.signature_name||"—")],
         ["Alert Type",(a.alert_type||"—").replace(/_/g," ")],
         ["Severity",a.severity||"—"],
         ["Risk Score",'<span style="font-family:var(--mono);font-weight:700;color:'+rCol+'">'+risk+'/100</span>'],
         ["Source IP",'<span style="font-family:var(--mono)">'+( a.source_ip||"—")+'</span>'],
         ["Destination",'<span style="font-family:var(--mono)">'+(a.dest_ip||"—")+":"+(a.dest_port||"—")+'</span>'],
         ["Asset",a.asset_name||"—"],
         ["Criticality",a.asset_criticality||"—"],
         ["Protocol",a.protocol||"TCP"],
         ["Timestamp",'<span style="font-family:var(--mono);font-size:10px">'+new Date(a.timestamp).toLocaleString()+'</span>'],
        ].map(function(r){return '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--b2);font-size:11px"><span style="color:var(--t3)">'+r[0]+'</span><span style="text-align:right;max-width:55%">'+r[1]+'</span></div>';}).join("")+
      '</div>'+
      '<div style="background:rgba(59,130,246,.05);border:1px solid rgba(59,130,246,.15);border-radius:8px;padding:11px;margin-top:10px;font-size:11px">'+
        '<div style="font-size:9px;font-weight:700;color:var(--blue2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px">Recommended Action</div>'+
        (a.recommended_action||"Investigate and escalate per playbook")+
      '</div>'+
    '</div>'+
    '</div>',
    [{label:"Save Profile",cls:"bp",fn:function(){
      var id=a.alert_id; if(!overrides[id])overrides[id]={};
      overrides[id].title=document.getElementById("ap-t").value;
      overrides[id].description=document.getElementById("ap-d").value;
      overrides[id].assignee=document.getElementById("ap-a").value;
      overrides[id].status=document.getElementById("ap-s").value;
      saveOv(); applyFilters(); closeModal();
      addNotification("✅ Profile saved — "+id);
    }},{label:"Cancel",cls:"bs",fn:closeModal}]
  );
}

// ── Drill-down modal ──────────────────────────────────────────────────────────
function drillDown(label,list){
  if(!list||!list.length){
    showModal("sm","🔍 "+label,'<div class="empty"><div class="eico">🔍</div>No alerts found</div>',[{label:"Close",cls:"bs",fn:closeModal}]);
    return;
  }
  var rows=list.slice(0,40).map(function(a){
    var risk=+(a.risk_score)||0;
    var rCol=risk>=80?"#ef4444":risk>=50?"#f59e0b":"#10b981";
    var st=getStatus(a)||"new";
    return '<tr class="dd-row" data-aid="'+a.alert_id+'" style="cursor:pointer">'+
      '<td><span class="pill p-'+st.replace(/[^a-z_]/g,"")+'">'+st.replace(/_/g," ").toUpperCase()+'</span></td>'+
      '<td style="font-size:11px">'+(a.signature_name||a.alert_type||"—").replace(/_/g," ")+'</td>'+
      '<td style="font-size:11px">'+(a.asset_name||"—")+'</td>'+
      '<td style="font-family:var(--mono);font-size:11px;color:var(--blue2)">'+(a.source_ip||"—")+'</td>'+
      '<td style="font-family:var(--mono);font-weight:700;color:'+rCol+'">'+Math.round(risk)+'</td>'+
      '<td style="font-size:10px;color:var(--t3);font-family:var(--mono)">'+tsAgo(a.timestamp)+'</td>'+
    '</tr>';
  }).join("");
  showModal("lg","🔍 "+label+' <span style="font-size:10px;color:var(--t3)">('+list.length+')</span>',
    '<div class="tw"><table class="tbl">'+
      '<thead><tr><th>Status</th><th>Signature/Type</th><th>Asset</th><th>Source IP</th><th>Risk</th><th>Age</th></tr></thead>'+
      '<tbody>'+rows+'</tbody>'+
    '</table>'+
    (list.length>40?'<div style="text-align:center;font-size:10px;color:var(--t3);padding:10px">Showing 40 of '+list.length+'</div>':'')+
    '</div>',
    [{label:"Close",cls:"bs",fn:closeModal}]
  );
  // Safe event binding after modal is in DOM
  var mount=document.getElementById("modalMount");
  if(mount){
    mount.querySelectorAll(".dd-row").forEach(function(row){
      var aid=row.getAttribute("data-aid");
      row.addEventListener("click",function(){
        closeModal();
        setTimeout(function(){
          var found=alerts.find(function(x){return x.alert_id===aid;});
          if(found) openAlertProfile(found);
        },80);
      });
    });
  }
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
function renderAnalytics(){
  if(!alerts.length)return;
  var sc={},tc={},ac={},pc={};
  alerts.forEach(function(a){
    var st=getStatus(a)||"new";
    sc[st]=(sc[st]||0)+1;
    tc[a.alert_type]=(tc[a.alert_type]||0)+1;
    ac[a.asset_name]=(ac[a.asset_name]||0)+1;
    pc[a.priority_level]=(pc[a.priority_level]||0)+1;
  });
  var tot=alerts.length||1;
  var uniqIPs=[...new Set(alerts.map(function(a){return a.source_ip;}).filter(Boolean))].length;
  var avgRisk=Math.round(alerts.reduce(function(s,a){return s+(+(a.risk_score)||0);},0)/tot);

  // KPI row
  var kpi=document.getElementById("anaKpi");
  if(kpi)kpi.innerHTML=[
    ["📥 Total Alerts",tot,""],
    ["⚡ Escalated",sc.escalated||0,"#ef4444"],
    ["✅ Resolution",Math.round((sc.resolved||0)/tot*100)+"%","#10b981"],
    ["🚫 FP Rate",Math.round((sc.false_positive||0)/tot*100)+"%","#64748b"],
    ["🌐 Attacker IPs",uniqIPs,"#a78bfa"],
    ["⚠️ Avg Risk",avgRisk,"#f59e0b"],
  ].map(function(x){return '<div class="sc" style="cursor:default"><div class="sc-lbl">'+x[0]+'</div><div class="sc-val"'+(x[2]?' style="color:'+x[2]+'"':'')+'>'+x[1]+'</div></div>';}).join("");

  // Grid 1: Donut + Bar
  var g1=document.getElementById("anaGrid1");
  if(g1){g1.innerHTML="";
    g1.appendChild(mkDonut("Alert Status",sc,STATUS_COLORS,function(k){drillDown("Status: "+k,alerts.filter(function(a){return getStatus(a)===k;}));}));
    g1.appendChild(mkBar("Priority Breakdown",pc,PRIORITY_COLORS,function(k){drillDown("Priority: "+k,alerts.filter(function(a){return a.priority_level===k;}));},true));}

  // Grid 2: Spark charts
  var g2=document.getElementById("anaGrid2");
  if(g2){g2.innerHTML="";
    g2.appendChild(mkSpark("Top NSL-KDD Attack Types",tc,function(k){drillDown((k||"").replace(/_/g," "),alerts.filter(function(a){return a.alert_type===k;}));}));
    g2.appendChild(mkSpark("Most Targeted Assets",ac,function(k){drillDown("Asset: "+k,alerts.filter(function(a){return a.asset_name===k;}));}));}

  // Wide section: heatmap, kill-chain, top IPs
  var wide=document.getElementById("anaWide");
  if(wide){wide.innerHTML="";
    wide.appendChild(mkHeatmap());
    var row=document.createElement("div"); row.className="g2"; row.style.marginTop="13px";
    row.appendChild(mkChain()); row.appendChild(mkIPCard());
    wide.appendChild(row);
    wide.appendChild(mkSeverityTimeline());
  }
}

function mkDonut(title,counts,colors,onClick){
  var el=document.createElement("div"); el.className="acard";
  var entries=Object.entries(counts).sort(function(a,b){return b[1]-a[1];});
  var total=Object.values(counts).reduce(function(a,b){return a+b;},0)||1;
  var R=60,cx=78,cy=78,sw=22; var offset=0;
  var arcs=entries.map(function(e){
    var k=e[0],v=e[1]; var pct=v/total; var dash=pct*2*Math.PI*R; var gap=2*Math.PI*R-dash;
    var col=colors[k]||"#3b82f6";
    var arc='<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="none" stroke="'+col+'" stroke-width="'+sw+'" stroke-dasharray="'+dash.toFixed(2)+' '+gap.toFixed(2)+'" stroke-dashoffset="'+(-offset*2*Math.PI*R).toFixed(2)+'" style="cursor:pointer;transition:stroke-width .18s" onmouseenter="this.setAttribute(\'stroke-width\',\''+(sw+4)+'\')" onmouseleave="this.setAttribute(\'stroke-width\',\''+sw+'\')"/>';
    offset+=pct; return {arc:arc,k:k,v:v,c:col,pct:Math.round(pct*100)};
  });
  el.innerHTML=
    '<div class="ach"><div class="act">🥧 '+title+'</div><span class="eh" style="cursor:pointer;font-size:9px;color:var(--blue2)">click to drill</span></div>'+
    '<div class="acb"><div style="display:flex;align-items:center;gap:18px">'+
      '<svg width="156" height="156" style="flex-shrink:0;transform:rotate(-90deg)">'+
        arcs.map(function(a){return a.arc;}).join("")+
        '<text x="'+cx+'" y="'+(cy+2)+'" text-anchor="middle" dominant-baseline="middle" fill="var(--t1)" font-size="16" font-weight="700" font-family="monospace" transform="rotate(90,'+cx+','+cy+')">'+total+'</text>'+
        '<text x="'+cx+'" y="'+(cy+17)+'" text-anchor="middle" fill="#64748b" font-size="9" font-family="monospace" transform="rotate(90,'+cx+','+cy+')">TOTAL</text>'+
      '</svg>'+
      '<div style="flex:1;display:flex;flex-direction:column;gap:6px">'+
        arcs.map(function(a){return '<div class="dl-item" data-key="'+a.k+'" style="cursor:pointer"><div style="width:8px;height:8px;border-radius:2px;background:'+a.c+';flex-shrink:0"></div><span style="flex:1;font-size:11px;color:var(--t2)">'+a.k.replace(/_/g," ")+'</span><span style="font-weight:700;font-family:var(--mono);font-size:10px;color:'+a.c+'">'+a.v+'</span></div>';}).join("")+
      '</div>'+
    '</div></div>';
  arcs.forEach(function(a,i){
    var circles=el.querySelectorAll("circle"); if(circles[i])circles[i].addEventListener("click",function(){if(onClick)onClick(a.k);});
    var item=el.querySelector('[data-key="'+a.k+'"]'); if(item)item.addEventListener("click",function(){if(onClick)onClick(a.k);});
  });
  return el;
}

function mkBar(title,counts,colors,onClick,horizontal){
  var el=document.createElement("div"); el.className="acard";
  var entries=Object.entries(counts).sort(function(a,b){return b[1]-a[1];});
  var total=Object.values(counts).reduce(function(a,b){return a+b;},0)||1;
  var mx=entries[0]?entries[0][1]:1;
  el.innerHTML=
    '<div class="ach"><div class="act">📊 '+title+'</div><span class="eh" style="cursor:pointer;font-size:9px;color:var(--blue2)">click to drill</span></div>'+
    '<div class="acb">'+
      entries.map(function(e){
        var k=e[0],v=e[1],col=colors[k]||"#3b82f6",pct=Math.round(v/total*100),w=Math.round(v/mx*100);
        return '<div class="brow" data-key="'+k+'" style="cursor:pointer;padding:5px 6px;border-radius:6px;margin-bottom:6px">'+
          '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">'+
            '<span style="color:var(--t2)">'+k.replace(/_/g," ")+'</span>'+
            '<span style="font-family:var(--mono);font-weight:700;color:'+col+'">'+v+' <span style="color:var(--t3);font-weight:400">('+pct+'%)</span></span>'+
          '</div>'+
          '<div style="height:7px;background:var(--s3);border-radius:999px;overflow:hidden">'+
            '<div style="height:100%;width:'+w+'%;background:'+col+';border-radius:999px;transition:width .5s ease"></div>'+
          '</div>'+
        '</div>';
      }).join("")+
    '</div>';
  entries.forEach(function(e){
    var item=el.querySelector('[data-key="'+e[0]+'"]');
    if(item)item.addEventListener("click",function(){if(onClick)onClick(e[0]);});
  });
  return el;
}

function mkSpark(title,counts,onClick){
  var el=document.createElement("div"); el.className="acard";
  var entries=Object.entries(counts).sort(function(a,b){return b[1]-a[1];}).slice(0,8);
  var mx=entries[0]?entries[0][1]:1;
  el.innerHTML=
    '<div class="ach"><div class="act">📋 '+title+'</div><span class="eh" style="cursor:pointer;font-size:9px;color:var(--blue2)">click to drill</span></div>'+
    '<div class="acb">'+
      entries.map(function(e,i){
        var k=e[0],v=e[1],col=PALETTE[i%PALETTE.length];
        return '<div class="slrow" data-key="'+k+'" style="cursor:pointer">'+
          '<div style="width:130px;font-size:11px;color:var(--t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+k.replace(/_/g," ")+'</div>'+
          '<div style="flex:1;height:5px;background:var(--s3);border-radius:999px;overflow:hidden">'+
            '<div style="height:100%;width:'+Math.round(v/mx*100)+'%;background:'+col+';border-radius:999px"></div>'+
          '</div>'+
          '<div style="font-size:10px;font-weight:700;font-family:var(--mono);min-width:28px;text-align:right;color:'+col+'">'+v+'</div>'+
        '</div>';
      }).join("")+
    '</div>';
  entries.forEach(function(e){
    var item=el.querySelector('[data-key="'+e[0]+'"]');
    if(item)item.addEventListener("click",function(){if(onClick)onClick(e[0]);});
  });
  return el;
}

function mkHeatmap(){
  var card=document.createElement("div"); card.className="card";
  var days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  var dh=Array(7).fill(null).map(function(){return Array(24).fill(0);});
  alerts.forEach(function(a){var d=new Date(a.timestamp);dh[d.getDay()][d.getHours()]++;});
  var mx=Math.max.apply(null,dh.reduce(function(a,b){return a.concat(b);},[])) || 1;
  card.innerHTML=
    '<div class="ch"><div class="ct">🕐 Attack Heatmap <span style="font-size:10px;font-weight:400;color:var(--t3)">Hour × Day of Week</span></div><div style="font-size:10px;color:var(--t3)">Click cell to inspect</div></div>'+
    '<div class="cb" style="overflow-x:auto">'+
      '<div style="display:flex;gap:2px;margin-bottom:3px;padding-left:38px">'+
        Array.from({length:24},function(_,h){return '<div style="width:19px;font-size:8px;color:var(--t3);text-align:center;font-family:var(--mono)">'+h+'</div>';}).join("")+
      '</div>'+
      days.map(function(day,di){
        return '<div style="display:flex;align-items:center;gap:2px;margin-bottom:2px">'+
          '<div style="width:34px;font-size:9px;color:var(--t3);font-family:var(--mono)">'+day+'</div>'+
          dh[di].map(function(v,h){
            var a=v?Math.max(.07,v/mx):.025;
            return '<div style="width:19px;height:19px;border-radius:3px;background:rgba(59,130,246,'+a+');cursor:pointer;transition:.12s" title="'+day+' '+h+':00 — '+v+' alerts" onmouseenter="this.style.transform=\'scale(1.3)\'" onmouseleave="this.style.transform=\'\'" onclick="heatDrill('+di+','+h+')"></div>';
          }).join("")+
        '</div>';
      }).join("")+
      '<div style="display:flex;align-items:center;gap:5px;margin-top:10px;font-size:9px;color:var(--t3);font-family:var(--mono)">'+
        'Low '+[.05,.15,.3,.5,.75,1].map(function(a){return '<div style="width:14px;height:14px;border-radius:2px;background:rgba(59,130,246,'+a+')"></div>';}).join("")+' High'+
      '</div>'+
    '</div>';
  return card;
}

function heatDrill(day,hour){
  var days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  drillDown(days[day]+" at "+hour+":00",alerts.filter(function(a){var d=new Date(a.timestamp);return d.getDay()===day&&d.getHours()===hour;}));
}

function mkChain(){
  var card=document.createElement("div"); card.className="card";
  var chain=[
    {t:"port_scan",       lbl:"Recon",       col:"#10b981"},
    {t:"brute_force",     lbl:"Brute Force", col:"#f59e0b"},
    {t:"lateral_movement",lbl:"Lateral",     col:"#f97316"},
    {t:"malware_detection",lbl:"Malware",    col:"#ef4444"},
    {t:"data_exfiltration",lbl:"Exfil",      col:"#8b5cf6"}
  ];
  var counts=chain.map(function(c){return alerts.filter(function(a){return a.alert_type===c.t;}).length;});
  var mx=Math.max.apply(null,counts)||1;
  var barHTML=chain.map(function(c,i){
    var pct=Math.round(counts[i]/mx*100);
    return '<div class="kc-bar" data-idx="'+i+'" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer">'+
      '<div style="font-size:10px;color:var(--t3);font-family:var(--mono)">'+counts[i]+'</div>'+
      '<div style="width:100%;border-radius:4px 4px 0 0;background:'+c.col+';height:'+Math.max(pct,2)+'%;min-height:4px;transition:all .2s"></div>'+
    '</div>';
  }).join('<div style="color:var(--t3);font-size:10px;padding-bottom:18px;align-self:flex-end">→</div>');
  var lblHTML=chain.map(function(c){return '<div style="flex:1;text-align:center;font-size:9px;color:'+c.col+';font-family:var(--mono);font-weight:700">'+c.lbl+'</div>';}).join('');
  card.innerHTML=
    '<div class="ch"><div class="ct">⛓ Kill-Chain Progression</div><div style="font-size:10px;color:var(--t3)">Click stage to drill</div></div>'+
    '<div class="cb">'+
      '<div style="display:flex;align-items:flex-end;justify-content:space-between;height:110px;gap:5px;margin-bottom:12px">'+barHTML+'</div>'+
      '<div style="display:flex;gap:5px;justify-content:space-between">'+lblHTML+'</div>'+
    '</div>';
  card.querySelectorAll(".kc-bar").forEach(function(el){
    var i=parseInt(el.getAttribute("data-idx"));
    var c=chain[i];
    el.addEventListener("click",function(){drillDown(c.lbl,alerts.filter(function(a){return a.alert_type===c.t;}));});
    el.addEventListener("mouseenter",function(){el.querySelector("div:last-child").style.opacity="0.6";});
    el.addEventListener("mouseleave",function(){el.querySelector("div:last-child").style.opacity="1";});
  });
  return card;
}

function mkIPCard(){
  var card=document.createElement("div"); card.className="card";
  var ipMap={};
  alerts.forEach(function(a){
    if(!a.source_ip)return;
    if(!ipMap[a.source_ip])ipMap[a.source_ip]={count:0,types:new Set(),assets:new Set()};
    ipMap[a.source_ip].count++;
    ipMap[a.source_ip].types.add(a.alert_type);
    ipMap[a.source_ip].assets.add(a.asset_name);
  });
  var sorted=Object.entries(ipMap).sort(function(a,b){return b[1].count-a[1].count;}).slice(0,8);
  var mx=sorted[0]?sorted[0][1].count:1;
  card.innerHTML=
    '<div class="ch"><div class="ct">🌐 Top Attacker IPs</div><div style="font-size:10px;color:var(--t3)">Click row to drill</div></div>'+
    '<div class="tw"><table class="tbl"><thead><tr>'+
      '<th>IP Address</th><th>Country</th><th>Hits</th><th>Attack Types</th><th>Targets</th><th>Threat</th>'+
    '</tr></thead><tbody>'+
      sorted.map(function(e,idx){
        var ip=e[0],d=e[1];
        var pct=Math.round(d.count/mx*100);
        var col=pct>75?"#ef4444":pct>45?"#f97316":"#f59e0b";
        var country=(typeof IP2C!=="undefined"?IP2C[ip]:null)||"?";
        var geo=(typeof GEO!=="undefined"?GEO[country]:null)||{};
        var typesStr=[...d.types].map(function(t){return t.replace(/_/g," ");}).join(", ").slice(0,32);
        return '<tr class="ip-drill-row" data-ip-idx="'+idx+'" style="cursor:pointer">'+
          '<td style="font-family:var(--mono);color:var(--blue2);font-size:11px">'+ip+'</td>'+
          '<td style="font-size:11px">'+(geo.flag?geo.flag+" "+country:"🌐 "+country)+'</td>'+
          '<td style="font-weight:700;color:'+col+';font-family:var(--mono)">'+d.count+'</td>'+
          '<td style="font-size:10px;color:var(--t2)">'+typesStr+'</td>'+
          '<td style="font-size:10px;color:var(--t3)">'+d.assets.size+'</td>'+
          '<td><div style="width:80px;height:4px;border-radius:999px;background:var(--s3);overflow:hidden">'+
            '<div style="height:100%;width:'+pct+'%;background:'+col+'"></div></div></td>'+
        '</tr>';
      }).join("")+
    '</tbody></table></div>';
  // Attach click handlers after innerHTML is set
  card.querySelectorAll(".ip-drill-row").forEach(function(row,idx){
    var ip=sorted[idx][0];
    row.addEventListener("click",function(){
      drillDown("IP: "+ip, alerts.filter(function(a){return a.source_ip===ip;}));
    });
  });
  return card;
}

function mkSeverityTimeline(){
  var card=document.createElement("div"); card.className="card"; card.style.marginTop="13px";
  var sevs=["critical","high","medium","low"]; var cols=["#ef4444","#f97316","#f59e0b","#10b981"];
  var buckets={};
  var now=Date.now(); var step=4*3600000; var n=24;
  for(var i=0;i<n;i++){var t=now-(n-i)*step; buckets[i]={critical:0,high:0,medium:0,low:0,ts:new Date(t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})};}
  alerts.forEach(function(a){var age=(now-new Date(a.timestamp).getTime());var bi=Math.floor((n*step-age)/step);if(bi>=0&&bi<n){buckets[bi][a.severity||"low"]=(buckets[bi][a.severity||"low"]||0)+1;}});
  var maxV=Object.values(buckets).reduce(function(mx,b){return Math.max(mx,b.critical+b.high+b.medium+b.low);},1);
  var H=90;
  var bars=Object.values(buckets).map(function(b,i){
    var x=i*(100/n); var total=b.critical+b.high+b.medium+b.low;
    var y=H; var segs="";
    sevs.forEach(function(s,si){var h=Math.round((b[s]||0)/maxV*H); y-=h; segs+='<rect x="'+x.toFixed(1)+'%" y="'+y+'px" width="'+(98/n).toFixed(1)+'%" height="'+h+'px" fill="'+cols[si]+'" fill-opacity="0.8" rx="1"/>';});
    return segs;
  }).join("");
  var xLabels=Object.values(buckets).filter(function(_,i){return i%4===0;}).map(function(b,i){return '<text x="'+(i*4*100/n)+'%" y="'+(H+18)+'" fill="#64748b" font-size="8" font-family="monospace" text-anchor="middle">'+b.ts+'</text>';}).join("");
  card.innerHTML=
    '<div class="ch"><div class="ct">📈 Severity Timeline <span style="font-size:10px;font-weight:400;color:var(--t3)">Last 4 days · 4h buckets</span></div></div>'+
    '<div class="cb">'+
      '<svg width="100%" height="'+(H+28)+'" style="overflow:visible">'+bars+xLabels+
        sevs.map(function(s,i){return '<rect x="'+(i*22+2)+'%" y="'+(H+8)+'px" width="8px" height="8px" fill="'+cols[i]+'" rx="2"/><text x="'+(i*22+4.5)+'%" y="'+(H+19)+'px" fill="#64748b" font-size="8" font-family="monospace">'+s+'</text>';}).join("")+
      '</svg>'+
    '</div>';
  return card;
}

// ── Team Tab ──────────────────────────────────────────────────────────────────
function renderTeam(){
  var am=buildAssignMap();
  var kpi=document.getElementById("teamKpi");
  if(kpi)kpi.innerHTML=[
    ["👥 Members",members.length,""],
    ["🏷️ Groups",groups.length,"#a78bfa"],
    ["🔴 Active",Object.values(am).reduce(function(s,d){return s+(d.inv||0);},0),"#f59e0b"],
    ["✅ Resolved",Object.values(am).reduce(function(s,d){return s+(d.res||0);},0),"#10b981"],
    ["🌙 Night Shift",members.filter(function(m){return m.shift==="Night";}).length,"#06b6d4"],
    ["📈 Avg Risk",Math.round(Object.values(am).reduce(function(s,d){return s+(d.avgRisk||0);},0)/Math.max(Object.keys(am).length,1)),"#ef4444"],
  ].map(function(x){return '<div class="sc"><div class="sc-lbl">'+x[0]+'</div><div class="sc-val"'+(x[2]?' style="color:'+x[2]+'"':'')+'>'+x[1]+'</div></div>';}).join("");
  renderMemberCards(am); renderGroupCards(); renderWorkload(am);
}

function buildAssignMap(){
  var am={};
  alerts.forEach(function(a){
    var n=(overrides[a.alert_id]&&overrides[a.alert_id].assignee)||a.assigned_to||"Unassigned";
    if(!am[n])am[n]={act:0,inv:0,res:0,esc:0,fp:0,riskSum:0,count:0,avgRisk:0};
    am[n].count++; am[n].riskSum+=+(a.risk_score)||0;
    var st=(overrides[a.alert_id]&&overrides[a.alert_id].status)||a.status;
    if(st==="resolved")am[n].res++;
    else if(st==="investigating")am[n].inv++;
    else if(st==="escalated")am[n].esc++;
    else if(st==="false_positive")am[n].fp++;
    else am[n].act++;
  });
  Object.values(am).forEach(function(d){d.avgRisk=d.count?Math.round(d.riskSum/d.count):0;});
  return am;
}

function renderMemberCards(am){
  var el=document.getElementById("teamCards"); if(!el)return;
  el.innerHTML="";
  if(!members.length){el.innerHTML='<div class="empty">No members. Click "+ Add Member" to add analysts.</div>';return;}
  members.forEach(function(m){
    var d=am[m.name]||{act:0,inv:0,res:0,esc:0,avgRisk:0};
    var card=document.createElement("div"); card.className="mcard";
    card.innerHTML=
      '<div class="mact">'+
        '<button class="mabt" title="Edit" data-edit="'+m.id+'">✏️</button>'+
        '<button class="mabt" title="Remove" data-del="'+m.id+'" style="color:var(--red)">🗑</button>'+
      '</div>'+
      '<div class="mav '+m.color+'">'+m.name[0].toUpperCase()+'</div>'+
      '<div class="mname">'+m.name+'</div>'+
      '<div class="mrole">'+m.role+' · '+m.shift+'</div>'+
      '<div class="mstats">'+
        '<div class="mstat"><div class="msv" style="color:var(--warn)">'+(d.act+d.inv)+'</div><div class="msl">Active</div></div>'+
        '<div class="mstat"><div class="msv" style="color:var(--green)">'+d.res+'</div><div class="msl">Closed</div></div>'+
        '<div class="mstat"><div class="msv" style="color:'+(d.avgRisk>=70?"#ef4444":"#60a5fa")+'">'+ d.avgRisk+'</div><div class="msl">Avg Risk</div></div>'+
      '</div>';
    card.querySelector("[data-edit]").onclick=function(e){e.stopPropagation();editMember(m.id);};
    card.querySelector("[data-del]").onclick=function(e){e.stopPropagation();if(confirm("Remove "+m.name+"?")){members=members.filter(function(x){return x.id!==m.id;});saveM();renderTeam();}};
    card.onclick=function(){memberProfileModal(m,am[m.name]||{});};
    el.appendChild(card);
  });
}

function renderGroupCards(){
  var el=document.getElementById("groupCards"); if(!el)return;
  el.innerHTML="";
  if(!groups.length){el.innerHTML='<div class="empty">No groups yet.</div>';return;}
  groups.forEach(function(g){
    var ms=members.filter(function(m){return g.members.includes(m.id);});
    var card=document.createElement("div"); card.className="gcard";
    card.innerHTML=
      '<div style="display:flex;justify-content:space-between;align-items:flex-start">'+
        '<div class="gicon" style="background:'+g.color+'22;border:1px solid '+g.color+'44">'+g.icon+'</div>'+
        '<div style="display:flex;gap:4px">'+
          '<button class="mabt gc-edit">✏️</button>'+
          '<button class="mabt gc-del" style="color:var(--red)">🗑</button>'+
        '</div>'+
      '</div>'+
      '<div class="gname">'+g.name+'</div>'+
      '<div class="gsub" style="color:'+g.color+'">'+ms.length+' member'+(ms.length!==1?'s':'')+'</div>'+
      '<div style="margin-top:8px">'+ms.map(function(m){return '<span class="chip">'+m.name+'</span>';}).join("")+'</div>';
    card.querySelector(".gc-edit").addEventListener("click",function(e){e.stopPropagation();editGroup(g.id);});
    card.querySelector(".gc-del").addEventListener("click",function(e){
      e.stopPropagation();
      if(confirm("Delete group '"+g.name+"'?")){
        groups=groups.filter(function(x){return x.id!==g.id;});
        saveM(); renderTeam();
      }
    });
    el.appendChild(card);
  });
}

function renderWorkload(am){
  var tbody=document.getElementById("teamWL"); if(!tbody)return;
  tbody.innerHTML="";
  var maxC=Math.max.apply(null,Object.values(am).map(function(d){return d.count;}).concat([1]));
  if(!members.length){tbody.innerHTML='<tr><td colspan="8" class="empty">Add members first</td></tr>';return;}
  members.forEach(function(m){
    var d=am[m.name]||{act:0,inv:0,res:0,esc:0,count:0,avgRisk:0};
    var pct=Math.min(Math.round(d.count/maxC*100),100);
    var bc=pct>70?"#ef4444":pct>40?"#f59e0b":"#10b981";
    var tr=document.createElement("tr");
    tr.innerHTML=
      '<td><div style="display:flex;align-items:center;gap:8px"><div class="mav '+m.color+'" style="width:28px;height:28px;border-radius:7px;font-size:11px;margin-bottom:0">'+m.name[0]+'</div><span style="font-weight:600">'+m.name+'</span></div></td>'+
      '<td style="font-size:10px;color:var(--t3);font-family:var(--mono)">'+m.role+'</td>'+
      '<td style="font-size:10px;color:var(--t3)">'+m.shift+'</td>'+
      '<td style="font-family:var(--mono);color:var(--warn)">'+(d.act+d.inv)+'</td>'+
      '<td style="font-family:var(--mono);color:var(--green)">'+d.res+'</td>'+
      '<td style="font-family:var(--mono);color:var(--red)">'+d.esc+'</td>'+
      '<td><div style="display:flex;align-items:center;gap:6px"><div style="flex:1;max-width:90px;height:5px;border-radius:999px;background:var(--s3);overflow:hidden"><div style="height:100%;border-radius:999px;background:'+bc+';width:'+pct+'%"></div></div><span style="font-size:9px;color:var(--t3);font-family:var(--mono)">'+pct+'%</span></div></td>'+
      '<td style="font-family:var(--mono);font-weight:700;color:'+(d.avgRisk>=70?"#ef4444":d.avgRisk>=40?"#f59e0b":"#60a5fa")+'">'+ d.avgRisk+'</td>';
    tbody.appendChild(tr);
  });
}

function memberProfileModal(m,d){
  var al=alerts.filter(function(a){return ((overrides[a.alert_id]&&overrides[a.alert_id].assignee)||a.assigned_to)===m.name;}).slice(0,5);
  showModal("sm","👤 "+m.name,
    '<div style="text-align:center;margin-bottom:16px">'+
      '<div class="mav '+m.color+'" style="width:56px;height:56px;border-radius:13px;font-size:22px;margin:0 auto 10px">'+m.name[0]+'</div>'+
      '<div style="font-size:15px;font-weight:700">'+m.name+'</div>'+
      '<div style="font-size:10px;color:var(--t3);font-family:var(--mono);margin-top:3px">'+m.role+' · '+m.shift+' shift</div>'+
      (m.email?'<div style="font-size:11px;color:var(--t3);margin-top:3px">'+m.email+'</div>':'')+
    '</div>'+
    '<div class="g3" style="margin-bottom:14px">'+
      [["Active",(d.act||0)+(d.inv||0),"#f59e0b"],["Resolved",d.res||0,"#10b981"],["Avg Risk",d.avgRisk||0,"#60a5fa"]].map(function(x){return '<div style="background:var(--s2);border:1px solid var(--b2);border-radius:8px;padding:11px;text-align:center"><div style="font-size:20px;font-weight:700;font-family:var(--mono);color:'+x[2]+'">'+x[1]+'</div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-top:2px">'+x[0]+'</div></div>';}).join("")+
    '</div>'+
    (al.length?'<div class="sect-title" style="margin-bottom:8px">Recent Cases</div>'+al.map(function(a){var st=getStatus(a)||"new";return '<div style="display:flex;align-items:center;gap:7px;padding:6px 9px;background:var(--s2);border-radius:6px;font-size:11px;margin-bottom:3px"><span class="pill p-'+st.replace(/[^a-z_]/g,"")+'">'+st.toUpperCase()+'</span><span style="flex:1">'+(a.signature_name||a.alert_type||"—").replace(/_/g," ")+'</span><span style="color:var(--t3)">'+(a.asset_name||"")+'</span></div>';}).join(""):''),
    [{label:"Edit Profile",cls:"bp",fn:function(){closeModal();editMember(m.id);}},{label:"Close",cls:"bs",fn:closeModal}]
  );
}

function showAddMember(){
  var avHTML=AV_COLS.map(function(c){
    return '<div class="mav av-pick-btn '+c+'" data-col="'+c+'" style="width:30px;height:30px;border-radius:7px;cursor:pointer;font-size:11px;border:2px solid transparent;margin-bottom:0">'+c.slice(-1).toUpperCase()+'</div>';
  }).join("");
  showModal("sm","+ Add Team Member",
    '<div class="frow"><label class="fl">Full Name</label><input class="inp" id="mn" placeholder="e.g. John Smith"/></div>'+
    '<div class="frow2">'+
      '<div class="frow"><label class="fl">Role</label><select class="sel" id="mr">'+ROLES.map(function(r){return '<option>'+r+'</option>';}).join("")+'</select></div>'+
      '<div class="frow"><label class="fl">Shift</label><select class="sel" id="ms">'+SHIFTS.map(function(s){return '<option>'+s+'</option>';}).join("")+'</select></div>'+
    '</div>'+
    '<div class="frow"><label class="fl">Email</label><input class="inp" id="me" type="email" placeholder="analyst@soc.io"/></div>'+
    '<div class="frow"><label class="fl">Avatar Colour</label>'+
      '<div style="display:flex;gap:7px;flex-wrap:wrap">'+avHTML+
        '<input type="hidden" id="mc" value="av-a"/>'+
      '</div>'+
    '</div>',
    [{label:"Add Member",cls:"bp",fn:function(){
      var n=document.getElementById("mn").value.trim();
      if(!n)return;
      members.push({id:"m"+Date.now(),name:n,role:document.getElementById("mr").value,
        shift:document.getElementById("ms").value,email:document.getElementById("me").value,
        color:document.getElementById("mc").value});
      saveM();renderTeam();closeModal();addNotification("✅ Added: "+n);
    }},{label:"Cancel",cls:"bs",fn:closeModal}]
  );
  // Wire avatar pickers after modal is in DOM
  document.querySelectorAll(".av-pick-btn").forEach(function(btn){
    btn.addEventListener("click",function(){
      document.querySelectorAll(".av-pick-btn").forEach(function(b){b.style.borderColor="transparent";});
      btn.style.borderColor="white";
      var mc=document.getElementById("mc"); if(mc)mc.value=btn.getAttribute("data-col");
    });
  });
}

function editMember(id){
  var m=members.find(function(x){return x.id===id;}); if(!m)return;
  showModal("sm","✏️ Edit — "+m.name,
    '<div class="frow"><label class="fl">Name</label><input class="inp" id="en" value="'+m.name+'"/></div>'+
    '<div class="frow2">'+
      '<div class="frow"><label class="fl">Role</label><select class="sel" id="er">'+ROLES.map(function(r){return '<option'+(r===m.role?" selected":"")+'>'+r+'</option>';}).join("")+'</select></div>'+
      '<div class="frow"><label class="fl">Shift</label><select class="sel" id="es">'+SHIFTS.map(function(s){return '<option'+(s===m.shift?" selected":"")+'>'+s+'</option>';}).join("")+'</select></div>'+
    '</div>'+
    '<div class="frow"><label class="fl">Email</label><input class="inp" id="ee" type="email" value="'+(m.email||"")+'"/></div>',
    [{label:"Save",cls:"bp",fn:function(){
      m.name=document.getElementById("en").value.trim()||m.name;
      m.role=document.getElementById("er").value;
      m.shift=document.getElementById("es").value;
      m.email=document.getElementById("ee").value;
      saveM();renderTeam();closeModal();
    }},{label:"Cancel",cls:"bs",fn:closeModal}]
  );
}

function showAddGroup(){
  showModal("sm","+ New Group",
    '<div class="frow"><label class="fl">Group Name</label><input class="inp" id="gn" placeholder="e.g. Day Shift"/></div>'+
    '<div class="frow2">'+
      '<div class="frow"><label class="fl">Icon (emoji)</label><input class="inp" id="gi" value="🏷️" style="font-size:18px;text-align:center"/></div>'+
      '<div class="frow"><label class="fl">Colour</label><input class="inp" id="gc" type="color" value="#3b82f6"/></div>'+
    '</div>'+
    '<div class="frow"><label class="fl">Members</label>'+
      '<div style="max-height:160px;overflow-y:auto">'+
        members.map(function(m){return '<label style="display:flex;align-items:center;gap:7px;padding:4px 0;cursor:pointer;font-size:12px"><input type="checkbox" class="gm" value="'+m.id+'" style="accent-color:var(--blue)"/> '+m.name+' <span style="color:var(--t3);font-size:9px">'+m.role+'</span></label>';}).join("")||'<span style="color:var(--t3);font-size:11px">Add members first</span>'+
      '</div>'+
    '</div>',
    [{label:"Create",cls:"bp",fn:function(){
      var n=document.getElementById("gn").value.trim(); if(!n)return;
      groups.push({id:"g"+Date.now(),name:n,icon:document.getElementById("gi").value,color:document.getElementById("gc").value,members:[...document.querySelectorAll(".gm:checked")].map(function(c){return c.value;})});
      saveM();renderTeam();closeModal();addNotification("✅ Group: "+n);
    }},{label:"Cancel",cls:"bs",fn:closeModal}]
  );
}

function editGroup(id){
  var g=groups.find(function(x){return x.id===id;}); if(!g)return;
  showModal("sm","✏️ Edit Group",
    '<div class="frow"><label class="fl">Name</label><input class="inp" id="egn" value="'+g.name+'"/></div>'+
    '<div class="frow2">'+
      '<div class="frow"><label class="fl">Icon</label><input class="inp" id="egi" value="'+g.icon+'" style="font-size:18px;text-align:center"/></div>'+
      '<div class="frow"><label class="fl">Colour</label><input class="inp" id="egc" type="color" value="'+g.color+'"/></div>'+
    '</div>'+
    '<div class="frow"><label class="fl">Members</label>'+
      '<div style="max-height:150px;overflow-y:auto">'+
        members.map(function(m){return '<label style="display:flex;align-items:center;gap:7px;padding:4px 0;cursor:pointer;font-size:12px"><input type="checkbox" class="egm" value="'+m.id+'" '+(g.members.includes(m.id)?"checked":"")+' style="accent-color:var(--blue)"/> '+m.name+'</label>';}).join("")+
      '</div>'+
    '</div>',
    [{label:"Save",cls:"bp",fn:function(){
      g.name=document.getElementById("egn").value.trim()||g.name;
      g.icon=document.getElementById("egi").value; g.color=document.getElementById("egc").value;
      g.members=[...document.querySelectorAll(".egm:checked")].map(function(c){return c.value;});
      saveM();renderTeam();closeModal();
    }},{label:"Cancel",cls:"bs",fn:closeModal}]
  );
}

// ── Shift Report ──────────────────────────────────────────────────────────────
function generateShiftReport(){
  var sc={};alerts.forEach(function(a){var st=getStatus(a);sc[st]=(sc[st]||0)+1;});
  var tot=alerts.length||1;
  var crit=alerts.filter(function(a){return a.priority_level==="immediate"&&!["resolved","false_positive"].includes(getStatus(a));}).sort(function(a,b){return b.risk_score-a.risk_score;});
  var high=alerts.filter(function(a){return a.priority_level==="high"&&!["resolved","false_positive"].includes(getStatus(a));});
  var tc={};alerts.forEach(function(a){tc[a.alert_type]=(tc[a.alert_type]||0)+1;});
  var topT=Object.entries(tc).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
  var ipC={};alerts.forEach(function(a){if(a.source_ip)ipC[a.source_ip]=(ipC[a.source_ip]||0)+1;});
  var topIP=Object.entries(ipC).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
  var avgRisk=Math.round(alerts.reduce(function(s,a){return s+(+(a.risk_score)||0);},0)/tot);
  var resRate=Math.round((sc.resolved||0)/tot*100);

  var el=document.getElementById("shiftContent"); if(!el)return;
  el.innerHTML=
    '<div class="rpt-hdr">'+
      '<div class="rpt-stripe"></div>'+
      '<div class="rpt-hdr-body">'+
        '<div>'+
          '<div style="font-size:9px;font-family:var(--mono);color:var(--t3);letter-spacing:.12em;text-transform:uppercase;margin-bottom:5px">Security Operations Center · Shift Handover Report</div>'+
          '<div style="font-size:22px;font-weight:700;letter-spacing:-.4px">Threat Assessment & Incident Analysis</div>'+
          '<div style="font-size:10px;color:var(--t3);margin-top:5px;font-family:var(--mono)">'+
            'Generated: '+new Date().toLocaleString()+' · NSL-KDD Dataset · CONFIDENTIAL'+
          '</div>'+
        '</div>'+
        '<div class="rpt-risk-badge" style="color:'+(avgRisk>=70?"#ef4444":avgRisk>=40?"#f59e0b":"#10b981")+'">'+
          '<div style="font-size:28px;font-weight:700;font-family:var(--mono)">'+avgRisk+'</div>'+
          '<div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.1em;font-family:var(--mono)">Avg Risk</div>'+
        '</div>'+
      '</div>'+
    '</div>'+

    // Status overview
    '<div class="card"><div class="ch"><div class="ct">📊 Alert Status Overview</div><span class="cmeta">'+tot+' total alerts</span></div>'+
    '<div class="cb">'+
      '<div class="sev-grid">'+
        [["NEW",sc.new||0,"#60a5fa"],["INVESTIGATING",sc.investigating||0,"#f59e0b"],
         ["RESOLVED",sc.resolved||0,"#10b981"],["FALSE POS.",sc.false_positive||0,"#64748b"],["ESCALATED",sc.escalated||0,"#ef4444"]].map(function(x){
          var pct=Math.round((x[1]/tot)*100);
          return '<div class="sevc"><div class="sevv" style="color:'+x[2]+'">'+x[1]+'</div><div class="sevl">'+x[0]+'</div>'+
            '<div style="margin-top:7px;height:3px;background:var(--s3);border-radius:999px;overflow:hidden">'+
              '<div style="height:100%;width:'+pct+'%;background:'+x[2]+';border-radius:999px"></div>'+
            '</div><div style="font-size:9px;color:var(--t3);margin-top:2px;font-family:var(--mono)">'+pct+'%</div></div>';
        }).join("")+
      '</div>'+
      '<div class="g3" style="margin-top:12px">'+
        [["Resolution Rate",resRate+"%","#10b981"],["FP Filter Rate",Math.round((sc.false_positive||0)/tot*100)+"%","#64748b"],["Model Accuracy","92.4%","#a78bfa"]].map(function(x){
          return '<div style="background:var(--s2);border:1px solid var(--b2);border-radius:8px;padding:12px;text-align:center"><div style="font-size:20px;font-weight:700;font-family:var(--mono);color:'+x[2]+'">'+x[1]+'</div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;font-family:var(--mono);margin-top:3px">'+x[0]+'</div></div>';
        }).join("")+
      '</div>'+
    '</div></div>'+

    // Critical findings
    (crit.length?'<div class="card"><div class="ch"><div class="ct">🔴 Critical Open Findings</div><span class="cmeta">'+crit.length+' require immediate action</span></div>'+
    '<div class="cb">'+crit.slice(0,5).map(function(a){return '<div class="rfind rpt-alert-row" data-aid="'+a.alert_id+'" style="cursor:pointer">'+
      '<span class="rsev rs-crit">CRITICAL</span>'+
      '<div style="font-weight:600;font-size:13px;margin-top:5px">'+(a.signature_name||a.alert_type||"—").replace(/_/g," ")+'</div>'+
      '<div style="font-size:11px;color:var(--t3);margin-top:3px">Asset: '+a.asset_name+' · Source: '+a.source_ip+' · '+tsAgo(a.timestamp)+' ago</div>'+
      '<div style="margin-top:6px;font-size:10px;color:var(--t3)">▸ '+(a.recommended_action||"Investigate immediately")+'</div>'+
    '</div>';}).join("")+'</div></div>':'') +

    // Top threats + IPs
    '<div class="g2">'+
    '<div class="card"><div class="ch"><div class="ct">🎯 Top CIC Attack Categories</div></div>'+
    '<div class="cb">'+topT.map(function(e,i){var col=["#ef4444","#f97316","#f59e0b","#3b82f6","#8b5cf6"][i];var pct=Math.round(e[1]/tot*100);return '<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span style="color:var(--t2)">'+(e[0]||"").replace(/_/g," ")+'</span><span style="font-family:var(--mono);color:'+col+'">'+e[1]+' ('+pct+'%)</span></div><div style="height:6px;background:var(--s3);border-radius:999px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+col+';border-radius:999px"></div></div></div>';}).join("")+
    '</div></div>'+
    '<div class="card"><div class="ch"><div class="ct">🌐 Top Attacker IPs</div></div>'+
    '<div class="cb">'+topIP.map(function(e){var country=(typeof IP2C!=="undefined"?IP2C[e[0]]:"?")||"?";var geo=(typeof GEO!=="undefined"?GEO[country]:{});var pct=Math.round(e[1]/topIP[0][1]*100);return '<div style="display:flex;align-items:center;gap:9px;margin-bottom:9px"><div style="font-size:14px">'+(geo&&geo.flag?geo.flag:"🌐")+'</div><div style="flex:1"><div style="font-family:var(--mono);font-size:11px;color:var(--blue2)">'+e[0]+'</div><div style="font-size:9px;color:var(--t3)">'+country+'</div></div><div style="width:80px;height:4px;background:var(--s3);border-radius:999px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:var(--red);border-radius:999px"></div></div><div style="font-size:10px;font-family:var(--mono);color:var(--red);min-width:20px">'+e[1]+'</div></div>';}).join("")+
    '</div></div>'+
    '</div>'+

    // Handover items
    (high.length?'<div class="card"><div class="ch"><div class="ct">⚠️ High Priority Handover Items</div><span class="cmeta">'+high.length+' items</span></div>'+
    '<div class="tw"><table class="tbl"><thead><tr><th>Alert ID</th><th>Signature (NSL-KDD)</th><th>Asset</th><th>Source IP</th><th>Risk</th><th>Age</th><th>Status</th></tr></thead><tbody>'+
    high.slice(0,10).map(function(a){var st=getStatus(a)||"new";return '<tr class="rpt-alert-row" data-aid="'+a.alert_id+'" style="cursor:pointer">'+
      '<td style="font-family:var(--mono);font-size:10px">'+a.alert_id+'</td>'+
      '<td style="font-size:11px">'+(a.signature_name||a.alert_type||"—")+'</td>'+
      '<td style="font-size:11px">'+(a.asset_name||"—")+'</td>'+
      '<td style="font-family:var(--mono);font-size:11px">'+(a.source_ip||"—")+'</td>'+
      '<td style="font-family:var(--mono);font-weight:700;color:var(--warn)">'+Math.round(+(a.risk_score)||0)+'</td>'+
      '<td style="font-size:10px;color:var(--t3);font-family:var(--mono)">'+tsAgo(a.timestamp)+'</td>'+
      '<td><span class="pill p-'+st.replace(/[^a-z_]/g,"")+'">'+st.replace(/_/g," ").toUpperCase()+'</span></td>'+
    '</tr>';}).join("")+
    '</tbody></table></div></div>':'') +

    // Recommendations
    '<div class="card"><div class="ch"><div class="ct">📋 Analyst Recommendations</div></div>'+
    '<div class="cb">'+
      [["rs-crit","Immediate Actions",[(crit.length?"Investigate "+crit.length+" CRITICAL open alert"+(crit.length>1?"s":""):null),"Block all active attacker IPs at perimeter firewall","Verify CIC-IDS2017 signatures are up to date"].filter(Boolean)],
       ["rs-high","Before End of Shift",["Update status on all investigating cases","Hand over active incidents with full notes","Brief incoming shift on active threat actors"]],
       ["rs-med","Monitoring",["Watch for kill-chain progression (recon → brute → lateral)","Monitor high-frequency source IPs for new activity","Correlate CIC-IDS2017 signatures with live traffic"]],
       ["rs-low","Housekeeping",["Archive confirmed false positives","Review detection model accuracy trends","Document new attack patterns observed"]],
      ].map(function(s){return '<div style="margin-bottom:11px"><div class="rfind"><span class="rsev '+s[0]+'">'+s[1].toUpperCase()+'</span><ul style="margin-top:8px;padding-left:18px">'+s[2].map(function(i){return '<li style="font-size:11px;color:var(--t2);margin-bottom:4px">'+i+'</li>';}).join("")+'</ul></div></div>';}).join("")+
    '</div></div>'+
    '<div style="text-align:center;font-size:10px;color:var(--t3);font-family:var(--mono);padding:8px 0">Generated '+new Date().toISOString()+' · SOC Operations Center · CIC-IDS2017 · CONFIDENTIAL</div>';

  // Wire up click handlers for report rows
  el.querySelectorAll(".rpt-alert-row").forEach(function(row){
    var aid=row.getAttribute("data-aid");
    if(aid) row.addEventListener("click",function(){
      var a=alerts.find(function(x){return x.alert_id===aid;});
      if(a) openAlertProfile(a);
    });
  });
  addNotification("📋 Shift report generated · "+alerts.length+" alerts");
}

function exportReportPDF(){
  var el=document.getElementById("shiftContent");
  if(!el||el.textContent.includes("Generate Report")){addNotification("⚠️ Generate a report first");return;}
  var w=window.open("","_blank","width=960,height=780");
  w.document.write('<!DOCTYPE html><html><head><title>SOC Shift Report</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;background:#fff;color:#1a1a2e;padding:28px;font-size:12px}h1{font-size:20px;font-weight:700;margin-bottom:6px}h2{font-size:14px;font-weight:700;margin:14px 0 6px;border-bottom:2px solid #e2e8f0;padding-bottom:4px}p,li{margin-bottom:4px;line-height:1.6}table{width:100%;border-collapse:collapse;margin:10px 0;font-size:11px}th,td{padding:6px 9px;border:1px solid #cbd5e1;text-align:left}th{background:#f1f5f9;font-weight:700}tr:nth-child(even){background:#f8fafc}.badge{display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-weight:700;background:#e2e8f0}@media print{body{padding:0}}</style></head><body>');
  w.document.write('<h1>SOC Shift Handover Report — CIC-IDS2017</h1><p style="color:#64748b">Generated: '+new Date().toLocaleString()+' | Classification: CONFIDENTIAL</p><hr style="margin:12px 0"/>');
  w.document.write('<p>'+el.innerText.split('\n').filter(function(l){return l.trim();}).map(function(l){return '<p>'+l+'</p>';}).join(''));
  w.document.write('</body></html>');
  w.document.close(); w.print();
}

// ── Threat Intel Tab ──────────────────────────────────────────────────────────
async function renderThreatIntel(){
  var ts=document.getElementById("intelTs"); if(ts)ts.textContent="Loading…";
  var tc={},ac={},ic={};
  alerts.forEach(function(a){tc[a.alert_type]=(tc[a.alert_type]||0)+1;ac[a.asset_name]=(ac[a.asset_name]||0)+1;if(a.source_ip)ic[a.source_ip]=(ic[a.source_ip]||0)+1;});
  var actors=[],grps=[];
  try{
    var ctrl=new AbortController(); setTimeout(function(){ctrl.abort();},2500);
    var [ar,gr]=await Promise.all([fetch(API_BASE_URL+"/api/threat-actors",{signal:ctrl.signal}),fetch(API_BASE_URL+"/api/alert-groups",{signal:ctrl.signal})]);
    if(ar.ok)actors=await ar.json(); if(gr.ok)grps=await gr.json();
  }catch{}
  if(!actors.length){var ips=Object.keys(ic);var AN=["APT-29","Lazarus","Fancy Bear","TA505","Sandworm","Wizard Spider","FIN7","Carbanak"];actors=ips.slice(0,8).map(function(ip,i){return {id:AN[i]||"TA-"+i,classification:["Nation-State","Cybercriminal","Nation-State","Hacktivist"][i%4],ips:[ip],alert_count:ic[ip]||0,attack_types:[]};});}
  if(!grps.length){var kc={};alerts.forEach(function(a){if(a.alert_type&&a.source_ip){var k=a.alert_type+"|"+a.source_ip;kc[k]=(kc[k]||0)+1;}});grps=Object.entries(kc).sort(function(a,b){return b[1]-a[1];}).slice(0,6).map(function(e,i){var parts=e[0].split("|");return {group_id:"GRP-"+String(i+1).padStart(3,"0"),type:parts[0],source_ip:parts[1],count:e[1]};});}
  var tot=alerts.length||1;
  var kpi=document.getElementById("intelKpi");
  if(kpi)kpi.innerHTML=[
    ["\u{1F534} Attack Types",   Object.keys(tc).length,  "#ef4444"],
    ["\u{1F3AF} Assets at Risk", Object.keys(ac).length,  "#f59e0b"],
    ["\u{1F310} Attacker IPs",   Object.keys(ic).length,  "#60a5fa"],
    ["\u{1F575}\uFE0F Threat Actors", actors.length,      "#a78bfa"],
    ["\u{1F4C2} Alert Groups",   grps.length,              "#06b6d4"],
    ["\u26A1 Escalated",         alerts.filter(function(a){return getStatus(a)==="escalated";}).length, "#f97316"],
  ].map(function(x){return '<div class="sc"><div class="sc-lbl">'+x[0]+'</div><div class="sc-val" style="color:'+x[2]+'">'+x[1]+'</div></div>';}).join("");

  var grid=document.getElementById("intelGrid"); if(!grid)return;
  grid.innerHTML="";

  function mkIC(icon,title,entries,color,clickFn){
    var card=document.createElement("div"); card.className="ic";
    var mx=entries[0]?entries[0][1]:1;
    card.innerHTML=
      '<div class="ich"><div class="ict">'+icon+' '+title+'</div><span class="eh" style="font-size:9px;color:var(--blue2);cursor:pointer">↗ drill-down</span></div>'+
      '<div class="icb">'+
        entries.slice(0,7).map(function(e,i){
          var k=e[0],v=e[1],pct=Math.round(v/mx*100);
          var ci="rgba("+parseInt(color.slice(1,3),16)+","+parseInt(color.slice(3,5),16)+","+parseInt(color.slice(5,7),16)+",.14)";
          return '<div class="irow" data-key="'+k+'">'+
            '<div class="irank" style="background:'+ci+';color:'+color+'">'+(i+1)+'</div>'+
            '<span class="ilbl" title="'+k+'">'+k.replace(/_/g," ")+'</span>'+
            '<div class="ibar"><div class="ibarf" style="width:'+pct+'%;background:'+color+'"></div></div>'+
            '<span class="ival" style="color:'+color+'">'+v+'</span>'+
          '</div>';
        }).join("")+
      '</div>';
    entries.forEach(function(e){var item=card.querySelector('[data-key="'+e[0]+'"]');if(item)item.addEventListener("click",function(){if(clickFn)clickFn(e[0]);});});
    return card;
  }

  grid.appendChild(mkIC("🔴","Top NSL-KDD Attack Types",Object.entries(tc).sort(function(a,b){return b[1]-a[1];}),
    "#ef4444",function(k){drillDown((k||"").replace(/_/g," "),alerts.filter(function(a){return a.alert_type===k;}));}));
  grid.appendChild(mkIC("🎯","Most Targeted Assets",Object.entries(ac).sort(function(a,b){return b[1]-a[1];}),
    "#f59e0b",function(k){drillDown("Asset: "+k,alerts.filter(function(a){return a.asset_name===k;}));}));

  // Source IPs card with flags
  var ipEnt=Object.entries(ic).sort(function(a,b){return b[1]-a[1];});
  var ipCard=document.createElement("div"); ipCard.className="ic";
  var ipMx=ipEnt[0]?ipEnt[0][1]:1;
  ipCard.innerHTML='<div class="ich"><div class="ict">🌐 Top Source IPs</div><span class="eh" style="font-size:9px;color:var(--blue2);cursor:pointer">↗ drill-down</span></div>'+
    '<div class="icb">'+ipEnt.slice(0,7).map(function(e,i){var ip=e[0],v=e[1],pct=Math.round(v/ipMx*100);var country=(typeof IP2C!=="undefined"?IP2C[ip]:"?")||"?";var geo=(typeof GEO!=="undefined"?GEO[country]:{});return '<div class="irow" data-ip="'+ip+'"><div class="irank" style="background:rgba(59,130,246,.12);color:#60a5fa">'+(i+1)+'</div><span class="ilbl">'+(geo&&geo.flag?geo.flag+" ":"")+'<span style="font-family:var(--mono)">'+ip+'</span></span><div class="ibar"><div class="ibarf" style="width:'+pct+'%;background:#3b82f6"></div></div><span class="ival" style="color:#60a5fa">'+v+'</span></div>';}).join("")+'</div>';
  ipEnt.forEach(function(e){var item=ipCard.querySelector('[data-ip="'+e[0]+'"]');if(item)item.addEventListener("click",function(){drillDown("IP: "+e[0],alerts.filter(function(a){return a.source_ip===e[0];}));});});
  grid.appendChild(ipCard);

  // Threat actors
  var actCard=document.createElement("div"); actCard.className="ic";
  var actMx=actors.length?Math.max.apply(null,actors.map(function(a){return a.alert_count||0;})):1;
  actCard.innerHTML='<div class="ich"><div class="ict">🕵️ Threat Actors</div><span class="eh" style="font-size:9px;color:var(--blue2)">↗ drill-down</span></div>'+
    '<div class="icb">'+actors.slice(0,7).map(function(a,i){var v=a.alert_count||0,pct=Math.round(v/actMx*100);return '<div class="irow" data-actor="'+a.id+'"><div class="irank" style="background:rgba(139,92,246,.12);color:#a78bfa">'+(i+1)+'</div><span class="ilbl">'+a.id+' <span style="font-size:9px;color:var(--t3)">'+(a.classification||"")+'</span></span><div class="ibar"><div class="ibarf" style="width:'+pct+'%;background:#8b5cf6"></div></div><span class="ival" style="color:#a78bfa">'+v+'</span></div>';}).join("")+'</div>';
  actors.forEach(function(a){var item=actCard.querySelector('[data-actor="'+a.id+'"]');if(item)item.addEventListener("click",function(){var ips=a.ips||[];drillDown("Actor: "+a.id,alerts.filter(function(x){return ips.includes(x.source_ip);}));});});
  grid.appendChild(actCard);

  // Alert groups
  var grpCard=document.createElement("div"); grpCard.className="ic";
  var grpMx=grps.length?Math.max.apply(null,grps.map(function(g){return g.count||0;})):1;
  grpCard.innerHTML='<div class="ich"><div class="ict">📂 Alert Groups</div><span class="eh" style="font-size:9px;color:var(--blue2)">↗ drill-down</span></div>'+
    '<div class="icb">'+grps.slice(0,7).map(function(g,i){var v=g.count||0,pct=Math.round(v/grpMx*100);return '<div class="irow" data-grp="'+g.group_id+'"><div class="irank" style="background:rgba(6,182,212,.12);color:#22d3ee">'+(i+1)+'</div><span class="ilbl">'+(g.type||"").replace(/_/g," ")+' <span style="font-size:9px;color:var(--t3)">'+(g.source_ip||"")+'</span></span><div class="ibar"><div class="ibarf" style="width:'+pct+'%;background:#06b6d4"></div></div><span class="ival" style="color:#22d3ee">'+v+'</span></div>';}).join("")+'</div>';
  grps.forEach(function(g){var item=grpCard.querySelector('[data-grp="'+g.group_id+'"]');if(item)item.addEventListener("click",function(){drillDown("Group: "+(g.type||"").replace(/_/g," ")+" from "+g.source_ip,alerts.filter(function(x){return x.alert_type===g.type&&x.source_ip===g.source_ip;}));});});
  grid.appendChild(grpCard);

  // Severity breakdown
  var sc2={};alerts.forEach(function(a){sc2[a.severity]=(sc2[a.severity]||0)+1;});
  grid.appendChild(mkIC("📈","Severity Breakdown",Object.entries(sc2).sort(function(a,b){return b[1]-a[1];}),
    "#f97316",function(k){drillDown("Severity: "+k,alerts.filter(function(a){return a.severity===k;}));}));

  // Asset criticality
  var critC={};alerts.forEach(function(a){critC[a.asset_criticality||"unknown"]=(critC[a.asset_criticality||"unknown"]||0)+1;});
  grid.appendChild(mkIC("🏗️","Asset Criticality",Object.entries(critC).sort(function(a,b){return b[1]-a[1];}),
    "#84cc16",function(k){drillDown("Criticality: "+k,alerts.filter(function(a){return (a.asset_criticality||"unknown")===k;}));}));

  if(ts)ts.textContent="Updated "+new Date().toLocaleTimeString();
  addNotification("🔍 Threat intel refreshed");
}

// ── Modal system ──────────────────────────────────────────────────────────────
function showModal(size,title,bodyHTML,buttons){
  closeModal();
  var mount=document.getElementById("modalMount");
  var overlay=document.createElement("div"); overlay.className="mo"; overlay.id="mOverlay";
  var box=document.createElement("div"); box.className="mbox "+(size||"");
  var btns=buttons.map(function(b){return '<button class="btn '+b.cls+'" id="mbtn_'+b.label.replace(/\W/g,"_")+'">'+b.label+'</button>';}).join("");
  var mh=document.createElement("div");mh.className="mh";
  var mt=document.createElement("div");mt.className="mt";mt.textContent=title;
  var xb=document.createElement("button");xb.className="xbtn";xb.id="mCloseX";xb.textContent="✕";
  mh.appendChild(mt);mh.appendChild(xb);
  var mb=document.createElement("div");mb.className="mbody";
  if(bodyHTML&&typeof bodyHTML==="object"&&bodyHTML.nodeType){mb.appendChild(bodyHTML);}
  else{mb.innerHTML=bodyHTML||"";}
  var mf=document.createElement("div");mf.className="mft";mf.innerHTML=btns;
  box.appendChild(mh);box.appendChild(mb);box.appendChild(mf);
  overlay.appendChild(box); mount.appendChild(overlay);
  overlay.addEventListener("click",function(e){if(e.target===overlay)closeModal();});
  document.getElementById("mCloseX").addEventListener("click",closeModal);
  buttons.forEach(function(b){var el=document.getElementById("mbtn_"+b.label.replace(/\W/g,"_"));if(el&&b.fn)el.addEventListener("click",b.fn);});
}
function closeModal(){var o=document.getElementById("mOverlay");if(o)o.remove();}

// ── Notifications ─────────────────────────────────────────────────────────────
function addNotification(msg){
  notifs.unshift({msg:msg,ts:new Date()}); notifs=notifs.slice(0,25);
  var list=document.getElementById("notifList"); if(!list)return;
  list.innerHTML=notifs.map(function(n){var ago=Math.round((Date.now()-n.ts.getTime())/1000);var s=ago<60?ago+"s":ago<3600?Math.floor(ago/60)+"m":Math.floor(ago/3600)+"h";return '<div class="npi"><div class="npm">'+n.msg+'</div><div class="npt">'+s+' ago</div></div>';}).join("");
  var badge=document.getElementById("nbadge"); if(badge)badge.classList.remove("hidden");
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(){
  if(!filteredAlerts.length){addNotification("⚠️ No alerts to export");return;}
  var h=["alert_id","timestamp","alert_type","signature_name","severity","priority_level","status","risk_score","asset_name","source_ip","dest_ip","assigned_to"];
  var rows=filteredAlerts.map(function(a){var ov=overrides[a.alert_id]||{};return h.map(function(k){return '"'+String(ov[k]||a[k]||"").replace(/"/g,'""')+'"';}).join(",");});
  var url=URL.createObjectURL(new Blob([[h.join(",")].concat(rows).join("\n")],{type:"text/csv"}));
  var l=document.createElement("a");l.href=url;l.download="soc_nslkdd_"+Date.now()+".csv";
  document.body.appendChild(l);l.click();document.body.removeChild(l);URL.revokeObjectURL(url);
  addNotification("✅ Exported "+filteredAlerts.length+" alerts (CIC-IDS2017)");
}

// ── Nav & Controls ────────────────────────────────────────────────────────────
function switchView(v){
  document.querySelectorAll(".main > .view").forEach(function(el){el.classList.add("hidden");});
  var el=document.getElementById("v-"+v); if(el)el.classList.remove("hidden");
  if(v==="analytics")renderAnalytics();
  if(v==="team")renderTeam();
  if(v==="attack-map")updateAttackMap(alerts);
  if(v==="shift-report"&&alerts.length)generateShiftReport();
  if(v==="threat-intel")renderThreatIntel();
}

function bindNav(){
  document.querySelectorAll(".ntab").forEach(function(t){
    t.addEventListener("click",function(){
      document.querySelectorAll(".ntab").forEach(function(x){x.classList.remove("active");});
      t.classList.add("active"); switchView(t.getAttribute("data-v"));
    });
  });
}

function bindControls(){
  var g=function(id){return document.getElementById(id);};
  var si=g("searchInp");if(si)si.addEventListener("input",function(e){srch=e.target.value;applyFilters();});
  var ss=g("statusSel");if(ss)ss.addEventListener("change",function(e){sF=e.target.value;applyFilters();});
  var ps=g("priSel");if(ps)ps.addEventListener("change",function(e){pF=e.target.value;applyFilters();});
  var ds=g("dateSel");if(ds)ds.addEventListener("change",function(e){dF=e.target.value;applyFilters();});
  var rb=g("refreshBtn");if(rb)rb.addEventListener("click",loadData);
  var eb=g("exportBtn");if(eb)eb.addEventListener("click",exportCSV);
  var am=g("addMemberBtn");if(am)am.addEventListener("click",showAddMember);
  var ag=g("addGroupBtn");if(ag)ag.addEventListener("click",showAddGroup);
  var ag2=g("addGroupBtn2");if(ag2)ag2.addEventListener("click",showAddGroup);
  var gr=g("genReportBtn");if(gr)gr.addEventListener("click",generateShiftReport);
  var ep=g("exportPdfBtn");if(ep)ep.addEventListener("click",exportReportPDF);
  var ri=g("refreshIntelBtn");if(ri)ri.addEventListener("click",renderThreatIntel);
  var nb=g("notifBtn");if(nb)nb.addEventListener("click",function(){g("notifPanel")&&g("notifPanel").classList.toggle("hidden");if(g("nbadge"))g("nbadge").classList.add("hidden");});
  var nc=g("notifClose");if(nc)nc.addEventListener("click",function(){if(g("notifPanel"))g("notifPanel").classList.add("hidden");});
  document.addEventListener("click",function(e){var np=g("notifPanel");var nb2=g("notifBtn");if(np&&!np.classList.contains("hidden")&&!np.contains(e.target)&&e.target!==nb2)np.classList.add("hidden");});
  var simBtn=g("simulateBtn");if(simBtn)simBtn.addEventListener("click",function(){fetch(API_BASE_URL+"/api/alerts/simulate",{method:"POST"});});
}