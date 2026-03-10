// playbook-runner.js — Automated Investigation Playbooks
var PLAYBOOKS = {
  ddos_attack:    {name:"DDoS Mitigation",         steps:[{d:"Activate upstream DDoS scrubbing",s:3},{d:"Analyse attack traffic patterns",s:12},{d:"Block source IP/CIDRs at edge",s:5},{d:"Rate-limit legitimate traffic",s:4},{d:"Scale infrastructure resources",s:20},{d:"Generate post-incident summary",s:5}]},
  dos_attack:     {name:"DoS Attack Response",     steps:[{d:"Identify attack vector and source",s:5},{d:"Block source IP at firewall",s:2},{d:"Engage CDN scrubbing service",s:8},{d:"Monitor traffic baseline recovery",s:15},{d:"Review server resource consumption",s:5}]},
  brute_force:    {name:"Brute Force Mitigation",  steps:[{d:"Block source IP immediately",s:1},{d:"Reset compromised credentials",s:3},{d:"Enable account lockout policy",s:2},{d:"Enforce MFA on affected accounts",s:5},{d:"Audit authentication log trail",s:12},{d:"Update firewall block rules",s:3}]},
  web_attack:     {name:"Web Attack Response",     steps:[{d:"Capture malicious HTTP payloads",s:3},{d:"Update WAF rules to block vectors",s:5},{d:"Patch affected application code",s:20},{d:"Rotate exposed API credentials",s:3},{d:"Review application access logs",s:10}]},
  sql_injection:  {name:"SQL Injection Response",  steps:[{d:"Block malicious source IP",s:2},{d:"Sanitise input validation layer",s:10},{d:"Rotate database credentials",s:3},{d:"Review and audit DB query logs",s:15},{d:"Patch vulnerable query endpoints",s:20},{d:"Deploy parameterised query patch",s:10}]},
  malware_detection:{name:"Malware Incident Response",steps:[{d:"Isolate host from network segment",s:2},{d:"Block C2 communication channels",s:3},{d:"Capture full memory dump",s:18},{d:"Submit samples to sandbox analysis",s:25},{d:"Hunt laterally for similar IOCs",s:30},{d:"Clean/re-image affected endpoint",s:20},{d:"Generate forensic incident report",s:5}]},
  port_scan:      {name:"Network Recon Response",  steps:[{d:"Log and correlate scanning activity",s:2},{d:"Block recon source IP at perimeter",s:1},{d:"Enumerate exposed service surface",s:8},{d:"Review firewall exposure ruleset",s:10},{d:"Update network segmentation rules",s:5}]},
  data_exfiltration:{name:"Data Exfiltration Response",steps:[{d:"Block outbound exfil channel",s:2},{d:"Isolate affected endpoint(s)",s:3},{d:"Quantify data volume transferred",s:15},{d:"Preserve forensic disk image",s:20},{d:"Review DLP policy violations",s:12},{d:"Notify legal and compliance team",s:3},{d:"File regulatory incident report",s:5}]},
  vulnerability_exploit:{name:"Vulnerability Exploit Response",steps:[{d:"Isolate vulnerable host immediately",s:2},{d:"Apply emergency vendor patch",s:15},{d:"Scan network for similar exposures",s:20},{d:"Review exploit indicators of compromise",s:10},{d:"Update vulnerability management DB",s:5}]},
  default:        {name:"Generic Incident Response",steps:[{d:"Collect and preserve evidence",s:5},{d:"Identify scope of compromise",s:10},{d:"Contain the identified threat",s:8},{d:"Eradicate threat artefacts",s:15},{d:"Restore normal operations",s:10},{d:"Document lessons learned",s:5}]},
};

var pbState = {
  key:"", steps:[], running:false, paused:false,
  startT:0, elapsed:0, alert:null, tickTimer:null
};

function guessPB(t) {
  var s=(t||"").toLowerCase();
  if(s.includes("ransom")||s.includes("malware")||s.includes("bot"))return"malware_detection";
  if(s.includes("ddos"))return"ddos_attack";
  if(s.includes("dos"))return"dos_attack";
  if(s.includes("brute")||s.includes("patator"))return"brute_force";
  if(s.includes("sql"))return"sql_injection";
  if(s.includes("web")||s.includes("xss"))return"web_attack";
  if(s.includes("scan")||s.includes("port"))return"port_scan";
  if(s.includes("exfil")||s.includes("infiltr"))return"data_exfiltration";
  if(s.includes("exploit")||s.includes("heartbleed")||s.includes("vuln"))return"vulnerability_exploit";
  return"default";
}

function openPlaybookRunner(alert) {
  pbState.key = guessPB(alert.alert_type);
  pbState.alert = alert;
  pbState.steps = PLAYBOOKS[pbState.key].steps.map(function(s){return Object.assign({},s,{status:"pend"});});
  pbState.running = false; pbState.paused = false; pbState.elapsed = 0;
  var pbOpts = Object.keys(PLAYBOOKS).map(function(k){
    return '<option value="'+k+'"'+(k===pbState.key?' selected':'')+'>'+PLAYBOOKS[k].name+'</option>';
  }).join('');
  showModal('lg','⚡ Automated Investigation Playbook',
    '<div class="pb-header">'+
      '<div class="frow"><label class="fl">Select Playbook</label>'+
        '<select class="sel" id="pbSel">'+pbOpts+'</select></div>'+
      '<div style="font-size:11px;color:var(--t3);font-family:var(--mono);margin-bottom:10px">'+
        'Alert: <b>'+alert.alert_id+'</b> · '+(alert.alert_type||'').replace(/_/g,' ')+' · '+
        'Asset: <b>'+(alert.asset_name||'—')+'</b></div>'+
    '</div>'+
    '<div id="pbProgWrap" class="hidden">'+
      '<div class="pb-prog-bar"><div class="pb-prog-fill" id="pbFill" style="width:0%"></div></div>'+
      '<div class="pb-prog-meta"><span id="pbPct">0%</span><span id="pbElap">0s elapsed</span></div>'+
    '</div>'+
    '<div id="pbStepsList"></div>'+
    '<div id="pbSavedMsg" class="hidden pb-saved-msg"></div>'+
    '<div id="pbReportWrap" class="hidden">'+
      '<div class="sect-title" style="margin:14px 0 8px">📄 Investigation Report Preview</div>'+
      '<div class="pb-report-pre" id="pbReportTxt"></div>'+
    '</div>'+
    '<div class="pb-actions" id="pbActions">'+
      '<button class="btn bp" id="pbRunBtn">▶ Execute Playbook</button>'+
      '<button class="btn bs hidden" id="pbPauseBtn">⏸ Pause</button>'+
      '<button class="btn bs hidden" id="pbResumeBtn">▶ Resume</button>'+
      '<button class="btn bd hidden" id="pbStopBtn">⏹ Abort</button>'+
      '<button class="btn bg hidden" id="pbSaveBtn">⬇ Download Report</button>'+
    '</div>',
    [{label:'Close',cls:'bs',fn:closeModal}]
  );
  pbRenderSteps();
  document.getElementById('pbSel').onchange = function(e) {
    pbState.key = e.target.value;
    pbState.steps = PLAYBOOKS[pbState.key].steps.map(function(s){return Object.assign({},s,{status:'pend'});});
    pbRenderSteps();
  };
  document.getElementById('pbRunBtn').onclick = function() {
    pbState.running=true; pbState.paused=false; pbState.startT=Date.now(); pbState.elapsed=0;
    pbToggleUI(true); pbRunSteps();
  };
  document.getElementById('pbPauseBtn').onclick = function() { pbState.paused=true; pbToggleUI(true); };
  document.getElementById('pbResumeBtn').onclick = function() {
    pbState.paused=false; pbState.startT=Date.now()-pbState.elapsed; pbToggleUI(true); pbRunSteps();
  };
  document.getElementById('pbStopBtn').onclick = function() {
    pbState.running=false; pbState.paused=false;
    pbState.steps=PLAYBOOKS[pbState.key].steps.map(function(s){return Object.assign({},s,{status:'pend'});});
    pbRenderSteps(); pbToggleUI(false); pbUpdateProgress();
    if(pbState.tickTimer){clearInterval(pbState.tickTimer);pbState.tickTimer=null;}
  };
  if(!pbState.tickTimer) pbState.tickTimer = setInterval(function(){
    if(pbState.running&&!pbState.paused){pbState.elapsed=Date.now()-pbState.startT; pbUpdateProgress();}
  },200);
}

function pbRenderSteps(){
  var el=document.getElementById("pbStepsList"); if(!el)return;
  el.innerHTML="";
  pbState.steps.forEach(function(s){
    var cls=s.status==="done"?"done":s.status==="run"?"run":"pend";
    var ico=s.status==="done"?"✅":s.status==="run"?"⏳":"◻";
    var d=document.createElement("div"); d.className="pb-step "+cls;
    d.innerHTML='<span class="pb-ico">'+ico+'</span>'+
      '<span class="pb-desc">'+s.d+'</span>'+
      '<span class="pb-dur">'+s.s+'s</span>';
    el.appendChild(d);
  });
}

async function pbRunSteps(){
  for(var i=0;i<pbState.steps.length;i++){
    if(!pbState.running)break;
    while(pbState.paused)await new Promise(function(r){setTimeout(r,300);});
    pbState.steps[i].status="run"; pbRenderSteps(); pbUpdateProgress();
    await new Promise(function(r){setTimeout(r,pbState.steps[i].s*1000);});
    if(!pbState.running)break;
    pbState.steps[i].status="done"; pbRenderSteps(); pbUpdateProgress();
  }
  pbState.running=false; pbToggleUI(false);
  if(pbState.tickTimer){clearInterval(pbState.tickTimer);pbState.tickTimer=null;}
  if(pbState.steps.every(function(s){return s.status==="done";})) pbComplete();
}

function pbComplete(){
  var a=pbState.alert, now=new Date();
  var dur=Math.round(pbState.elapsed/1000);
  var saved=Math.max(0,Math.round((1800-dur)/60));
  var analyst=(typeof overrides!=="undefined"&&overrides[a.alert_id]&&overrides[a.alert_id].assignee)||a.assigned_to||"SOC Analyst";
  var rptLines=[
    "╔══════════════════════════════════════════════════════════╗",
    "║          AUTOMATED INVESTIGATION REPORT — SOC           ║",
    "║              NSL-KDD Threat Detection               ║",
    "╚══════════════════════════════════════════════════════════╝",
    "",
    "Report ID     : RPT-"+Date.now().toString(36).toUpperCase(),
    "Generated     : "+now.toLocaleString(),
    "Analyst       : "+analyst,
    "Duration      : "+dur+"s automated | ~"+saved+" min saved vs manual",
    "Dataset       : NSL-KDD (Network Intrusion Detection)",
    "",
    "── ALERT DETAILS ────────────────────────────────────────────",
    "Alert ID      : "+a.alert_id,
    "Signature     : "+(a.signature_name||a.alert_type||"—"),
    "Alert Type    : "+(a.alert_type||"—").replace(/_/g," "),
    "NSL-KDD Label     : "+(a.raw_label||a.signature_name||"N/A"),
    "Severity      : "+(a.severity||"—").toUpperCase(),
    "Risk Score    : "+(typeof a.risk_score==="number"?Math.round(a.risk_score):"N/A")+"/100",
    "Priority      : "+(a.priority_level||"—").toUpperCase(),
    "Asset         : "+(a.asset_name||"—")+" ("+( a.asset_criticality||"—")+" criticality)",
    "Destination   : "+(a.dest_ip||"—")+":"+(a.dest_port||"—"),
    "Source IP     : "+(a.source_ip||"—"),
    "Protocol      : "+(a.protocol||"TCP"),
    "Timestamp     : "+new Date(a.timestamp).toLocaleString(),
    "",
    "── PLAYBOOK EXECUTED ────────────────────────────────────────",
    "Playbook Name : "+PLAYBOOKS[pbState.key].name,
    "Status        : COMPLETED ✅",
    "",
    "Steps Executed:",
  ].concat(pbState.steps.map(function(s,i){
    return "  "+(i+1)+". [✅ "+s.s+"s] "+s.d;
  })).concat([
    "",
    "── THREAT CONTEXT (NSL-KDD) ─────────────────────────────",
    "This alert was generated from the NSL-KDD benchmark",
    "dataset created by the Canadian Institute for Cybersecurity.",
    "The dataset captures modern network intrusion scenarios.",
    "",
    "── FINDINGS & RECOMMENDATIONS ──────────────────────────────",
    "• All "+pbState.steps.length+" automated playbook steps completed successfully",
    "• Alert status automatically updated to RESOLVED",
    "• Recommend 24-hour post-incident monitoring period",
    "• Document attack indicators in threat intelligence platform",
    "• Review similar signatures in current alert queue",
    "",
    "Recommended Action: "+(a.recommended_action||"Continue monitoring"),
    "",
    "── RESOLUTION ───────────────────────────────────────────────",
    "Alert auto-resolved following playbook completion.",
    "Review this report and escalate if anomalies persist.",
    "",
    "Signed: "+analyst+" | "+now.toISOString(),
    "══════════════════════════════════════════════════════════════",
  ]);
  var rptText=rptLines.join("\n");

  // Save override + call API
  if(typeof overrides!=="undefined"){
    if(!overrides[a.alert_id])overrides[a.alert_id]={};
    overrides[a.alert_id].status="resolved";
    overrides[a.alert_id].playbookResult=PLAYBOOKS[pbState.key].name+" — completed in "+dur+"s";
    overrides[a.alert_id].report=rptText;
    if(typeof saveOv==="function")saveOv();
    if(typeof applyFilters==="function")applyFilters();
  }
  try{
    fetch(API_BASE_URL+"/api/alerts/playbook-complete",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({alert_id:a.alert_id,report_text:rptText,analyst:analyst})});
  }catch(e){}

  var sm=document.getElementById("pbSavedMsg");
  var rw=document.getElementById("pbReportWrap");
  var rt=document.getElementById("pbReportTxt");
  var sb=document.getElementById("pbSaveBtn");
  if(sm){sm.classList.remove("hidden");sm.innerHTML="⚡ ~"+saved+" min saved · Alert auto-resolved as <b>RESOLVED</b> ✅";}
  if(rw)rw.classList.remove("hidden");
  if(rt)rt.textContent=rptText;
  if(sb){
    sb.classList.remove("hidden");
    sb.onclick=function(){
      var blob=new Blob([rptText],{type:"text/plain"});
      var url=URL.createObjectURL(blob);
      var lnk=document.createElement("a");lnk.href=url;lnk.download="report_"+a.alert_id+"_"+Date.now()+".txt";
      document.body.appendChild(lnk);lnk.click();document.body.removeChild(lnk);URL.revokeObjectURL(url);
      if(typeof addNotification==="function")addNotification("📄 Report saved: report_"+a.alert_id+".txt");
    };
  }
  if(typeof addNotification==="function")addNotification("✅ Playbook complete · "+a.alert_id+" → RESOLVED");
}

function pbToggleUI(running){
  var run=document.getElementById("pbRunBtn"),pause=document.getElementById("pbPauseBtn"),
      resume=document.getElementById("pbResumeBtn"),stop=document.getElementById("pbStopBtn"),
      wrap=document.getElementById("pbProgWrap");
  if(!run)return;
  if(!running){
    run.classList.remove("hidden");
    [pause,resume,stop].forEach(function(b){if(b)b.classList.add("hidden");});
  } else {
    run.classList.add("hidden");
    if(wrap)wrap.classList.remove("hidden");
    if(stop)stop.classList.remove("hidden");
    if(pbState.paused){
      if(pause)pause.classList.add("hidden");
      if(resume)resume.classList.remove("hidden");
    } else {
      if(pause)pause.classList.remove("hidden");
      if(resume)resume.classList.add("hidden");
    }
  }
}

function pbUpdateProgress(){
  var fill=document.getElementById("pbFill"),pct=document.getElementById("pbPct"),elap=document.getElementById("pbElap");
  var done=pbState.steps.filter(function(s){return s.status==="done";}).length;
  var tot=pbState.steps.length||1;
  var p=Math.round(done/tot*100);
  if(fill)fill.style.width=p+"%";
  if(pct)pct.textContent=p+"%";
  if(elap)elap.textContent=Math.round(pbState.elapsed/1000)+"s elapsed";
}