// live-feed.js — WebSocket live feed
var liveFeedState={isConnected:false,recentAlerts:[],totalToday:0,ws:null,onAlertClick:null};
function initLiveFeed(cb){
  liveFeedState.onAlertClick=cb; connectWS();
  var btn=document.getElementById("liveIndicator");
  if(btn)btn.onclick=function(){var p=document.getElementById("liveFeedPanel");if(p)p.classList.toggle("hidden");};
  var cl=document.getElementById("liveFeedClose");
  if(cl)cl.onclick=function(){var p=document.getElementById("liveFeedPanel");if(p)p.classList.add("hidden");};
}
function connectWS(){
  try{
    var ws=new WebSocket(WS_URL); liveFeedState.ws=ws;
    ws.onopen=function(){liveFeedState.isConnected=true;updateLiveFeedUI();};
    ws.onmessage=function(e){
      try{var d=JSON.parse(e.data);
        if(d.type==="new_alert"&&d.alert){
          liveFeedState.recentAlerts=[d.alert].concat(liveFeedState.recentAlerts).slice(0,20);
          liveFeedState.totalToday++; updateLiveFeedUI();
          if(typeof addNotification==="function")addNotification("🚨 "+(d.alert.alert_type||"").replace(/_/g," ")+" on "+(d.alert.asset_name||"?"));
        }
        if(d.type==="alert_updated"&&typeof onAlertUpdated==="function")onAlertUpdated(d);
      }catch(err){}
    };
    ws.onerror=function(){liveFeedState.isConnected=false;updateLiveFeedUI();};
    ws.onclose=function(){liveFeedState.isConnected=false;updateLiveFeedUI();setTimeout(connectWS,5000);};
  }catch(err){liveFeedState.isConnected=false;updateLiveFeedUI();setTimeout(connectWS,5000);}
}
function updateLiveFeedUI(){
  var dot=document.getElementById("liveFeedStatusDot"),txt=document.getElementById("liveFeedStatusText"),
      tot=document.getElementById("liveFeedTotalToday"),list=document.getElementById("liveFeedList"),
      hdrDot=document.getElementById("liveHeaderDot");
  if(!list)return;
  var ok=liveFeedState.isConnected;
  if(dot)dot.style.background=ok?"#10b981":"#ef4444";
  if(hdrDot)hdrDot.style.background=ok?"#10b981":"#ef4444";
  if(txt)txt.textContent=ok?"Connected":"Reconnecting…";
  if(tot)tot.textContent=liveFeedState.totalToday;
  list.innerHTML="";
  liveFeedState.recentAlerts.forEach(function(a,i){
    var sev=a.severity||"low",col=(typeof SEVERITY_COLORS!=="undefined"?SEVERITY_COLORS[sev]:"#64748b")||"#64748b";
    var d=document.createElement("div");d.className="lf-item"+(i===0?" lf-new":"");
    d.innerHTML='<div class="lf-top"><span class="lf-type">'+(a.alert_type||"").replace(/_/g," ")+
      (i===0?'<span class="lf-badge">NEW</span>':'')+
      '</span><span class="lf-sev" style="background:'+col+'22;color:'+col+'">'+sev.toUpperCase()+'</span></div>'+
      '<div class="lf-meta">'+(a.asset_name||"—")+' · '+(a.source_ip||"")+'</div>';
    d.onclick=function(){if(liveFeedState.onAlertClick)liveFeedState.onAlertClick(a.alert_id);var p=document.getElementById("liveFeedPanel");if(p)p.classList.add("hidden");};
    list.appendChild(d);
  });
}