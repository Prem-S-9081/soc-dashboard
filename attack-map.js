// attack-map.js — Enhanced World Attack Map v6
var amState = { data:[], filterType:"all", selectedCountry:null };

var GEO = {
  Russia:      {lat:55.76, lng:37.62,  flag:"🇷🇺", region:"Eastern Europe"},
  China:       {lat:39.9,  lng:116.4,  flag:"🇨🇳", region:"East Asia"},
  USA:         {lat:40.71, lng:-74.01, flag:"🇺🇸", region:"North America"},
  Netherlands: {lat:52.37, lng:4.9,    flag:"🇳🇱", region:"Western Europe"},
  UK:          {lat:51.51, lng:-0.13,  flag:"🇬🇧", region:"Western Europe"},
  Japan:       {lat:35.68, lng:139.65, flag:"🇯🇵", region:"East Asia"},
  Germany:     {lat:52.52, lng:13.4,   flag:"🇩🇪", region:"Western Europe"},
  France:      {lat:48.86, lng:2.35,   flag:"🇫🇷", region:"Western Europe"},
  Ukraine:     {lat:50.45, lng:30.52,  flag:"🇺🇦", region:"Eastern Europe"},
  Poland:      {lat:52.23, lng:21.01,  flag:"🇵🇱", region:"Eastern Europe"},
  India:       {lat:19.08, lng:72.88,  flag:"🇮🇳", region:"South Asia"},
  Romania:     {lat:44.43, lng:26.1,   flag:"🇷🇴", region:"Eastern Europe"},
  Sweden:      {lat:59.33, lng:18.07,  flag:"🇸🇪", region:"Northern Europe"},
  Turkey:      {lat:41.01, lng:28.98,  flag:"🇹🇷", region:"Middle East"},
  Spain:       {lat:40.42, lng:-3.7,   flag:"🇪🇸", region:"Southern Europe"},
  Brazil:      {lat:-23.55,lng:-46.63, flag:"🇧🇷", region:"South America"},
  Canada:      {lat:43.65, lng:-79.38, flag:"🇨🇦", region:"North America"},
  Australia:   {lat:-33.87,lng:151.21, flag:"🇦🇺", region:"Oceania"},
  Singapore:   {lat:1.35,  lng:103.82, flag:"🇸🇬", region:"Southeast Asia"},
  South_Korea: {lat:37.57, lng:126.98, flag:"🇰🇷", region:"East Asia"},
};

var IP2C = {
  "205.174.165.68":"USA","205.174.165.66":"USA","205.174.165.80":"USA",
  "198.51.100.23":"China","192.0.2.100":"USA","185.220.101.5":"Netherlands",
  "91.189.88.152":"UK","172.16.0.1":"USA","172.16.0.11":"USA","172.16.0.10":"USA",
  "45.67.89.123":"Germany","103.216.221.19":"India","217.182.143.207":"Romania",
  "194.58.56.177":"Ukraine","89.248.165.92":"Poland","62.210.37.82":"France",
  "203.0.113.45":"Russia","167.248.133.45":"France","46.166.139.111":"Sweden",
  "178.73.215.171":"Turkey","195.123.237.184":"Spain","123.45.67.89":"Japan",
  "1.2.3.4":"China","52.94.228.167":"USA","13.32.0.84":"USA",
};

function proj(lat,lng,w,h){ return [((lng+180)/360)*w, ((90-lat)/180)*h]; }
function amCol(r){ return r>0.75?"#ef4444":r>0.45?"#f97316":r>0.2?"#f59e0b":"#10b981"; }

function updateAttackMap(alertList){
  var ft=amState.filterType||"all";
  var src=ft==="all"?alertList:alertList.filter(function(a){return a.alert_type===ft;});
  var cm={};
  src.forEach(function(a){
    var c=IP2C[a.source_ip]; if(!c)return;
    if(!cm[c])cm[c]={count:0,ips:{},types:{},alerts:[]};
    cm[c].count++; cm[c].ips[a.source_ip]=true;
    cm[c].types[a.alert_type]=(cm[c].types[a.alert_type]||0)+1;
    cm[c].alerts.push(a);
  });
  amState.data=Object.keys(cm).map(function(c){
    return {country:c,count:cm[c].count,lat:(GEO[c]||{}).lat||0,lng:(GEO[c]||{}).lng||0,
      flag:(GEO[c]||{}).flag||"🌐",region:(GEO[c]||{}).region||"Unknown",
      ips:Object.keys(cm[c].ips),types:cm[c].types,alerts:cm[c].alerts};
  }).sort(function(a,b){return b.count-a.count;});
  renderMapSVG(); renderMapSidebar(); renderMapStats(alertList);
}

function renderMapSVG(){
  var el=document.getElementById("attackMapContainer"); if(!el)return;
  var w=el.clientWidth||720, h=400;
  var ns="http://www.w3.org/2000/svg";
  el.innerHTML="";
  var svg=document.createElementNS(ns,"svg");
  svg.setAttribute("width",w); svg.setAttribute("height",h);
  svg.style.cssText="display:block;width:100%;border-radius:10px;cursor:default;";

  // ─── Defs: gradients + glow filter ───────────────────────────────────────
  var defs=document.createElementNS(ns,"defs");

  var rg=document.createElementNS(ns,"radialGradient");
  rg.setAttribute("id","mapBg"); rg.setAttribute("cx","35%"); rg.setAttribute("cy","55%");
  [[0,"#0d1f38"],[50,"#071324"],[100,"#030c18"]].forEach(function(s){
    var st=document.createElementNS(ns,"stop"); st.setAttribute("offset",s[0]+"%"); st.setAttribute("stop-color",s[1]); rg.appendChild(st);
  });
  defs.appendChild(rg);

  // Glow filter
  var flt=document.createElementNS(ns,"filter"); flt.setAttribute("id","glow"); flt.setAttribute("x","-50%"); flt.setAttribute("y","-50%"); flt.setAttribute("width","200%"); flt.setAttribute("height","200%");
  var blur=document.createElementNS(ns,"feGaussianBlur"); blur.setAttribute("stdDeviation","4"); blur.setAttribute("result","blur");
  var merge=document.createElementNS(ns,"feMerge");
  ["blur","SourceGraphic"].forEach(function(n){var mn=document.createElementNS(ns,"feMergeNode"); if(n==="blur")mn.setAttribute("in","blur"); else mn.setAttribute("in","SourceGraphic"); merge.appendChild(mn);});
  flt.appendChild(blur); flt.appendChild(merge); defs.appendChild(flt);

  // Soft glow
  var flt2=document.createElementNS(ns,"filter"); flt2.setAttribute("id","softGlow");
  var blur2=document.createElementNS(ns,"feGaussianBlur"); blur2.setAttribute("stdDeviation","6"); blur2.setAttribute("result","blur2");
  var merge2=document.createElementNS(ns,"feMerge");
  ["blur2","SourceGraphic"].forEach(function(n){var mn=document.createElementNS(ns,"feMergeNode"); if(n==="blur2")mn.setAttribute("in","blur2"); else mn.setAttribute("in","SourceGraphic"); merge2.appendChild(mn);});
  flt2.appendChild(blur2); flt2.appendChild(merge2); defs.appendChild(flt2);

  svg.appendChild(defs);

  // Background
  var bgRect=document.createElementNS(ns,"rect"); bgRect.setAttribute("width",w); bgRect.setAttribute("height",h); bgRect.setAttribute("fill","url(#mapBg)"); svg.appendChild(bgRect);

  // Subtle continent shapes (simplified rectangles for visual depth)
  var continents=[
    {x:w*0.08,y:h*0.15,w2:w*0.14,h2:h*0.55,op:0.04},  // Americas
    {x:w*0.36,y:h*0.05,w2:w*0.12,h2:h*0.6,op:0.04},   // Europe
    {x:w*0.47,y:h*0.05,w2:w*0.22,h2:h*0.65,op:0.04},  // Asia
    {x:w*0.37,y:h*0.5,w2:w*0.1,h2:h*0.38,op:0.04},    // Africa
    {x:w*0.73,y:h*0.55,w2:w*0.1,h2:h*0.28,op:0.04},   // Australia
  ];
  continents.forEach(function(c){
    var cr=document.createElementNS(ns,"rect");
    cr.setAttribute("x",c.x); cr.setAttribute("y",c.y); cr.setAttribute("width",c.w2); cr.setAttribute("height",c.h2);
    cr.setAttribute("fill","rgba(59,130,246,"+c.op+")"); cr.setAttribute("rx","8");
    svg.appendChild(cr);
  });

  // Grid lines
  for(var lat=-60;lat<=80;lat+=30){
    var y=((90-lat)/180)*h;
    var gl=document.createElementNS(ns,"line"); gl.setAttribute("x1",0); gl.setAttribute("y1",y); gl.setAttribute("x2",w); gl.setAttribute("y2",y);
    gl.setAttribute("stroke","rgba(59,130,246,0.08)"); gl.setAttribute("stroke-width","1"); svg.appendChild(gl);
    if(lat%30===0){var lt=document.createElementNS(ns,"text"); lt.setAttribute("x",4); lt.setAttribute("y",y-2); lt.setAttribute("fill","rgba(100,116,139,0.4)"); lt.setAttribute("font-size","7"); lt.setAttribute("font-family","monospace"); lt.textContent=lat+"°"; svg.appendChild(lt);}
  }
  for(var lng2=-150;lng2<=180;lng2+=30){
    var x2=((lng2+180)/360)*w;
    var ll=document.createElementNS(ns,"line"); ll.setAttribute("x1",x2); ll.setAttribute("y1",0); ll.setAttribute("x2",x2); ll.setAttribute("y2",h);
    ll.setAttribute("stroke","rgba(59,130,246,0.08)"); ll.setAttribute("stroke-width","1"); svg.appendChild(ll);
  }

  var mx=amState.data.reduce(function(m,d){return Math.max(m,d.count);},1);
  var defX=w*0.33, defY=h*0.44; // Defender position (Europe)

  // Draw arcs first (behind dots)
  amState.data.forEach(function(atk){
    var p=proj(atk.lat,atk.lng,w,h); var ratio=atk.count/mx; var col=amCol(ratio);
    var dim=(amState.selectedCountry&&amState.selectedCountry!==atk.country);
    var cpX=(p[0]+defX)/2, cpY=Math.min(p[1],defY)-25-ratio*50;
    var arc=document.createElementNS(ns,"path");
    arc.setAttribute("d","M"+p[0]+","+p[1]+" Q"+cpX+","+cpY+" "+defX+","+defY);
    arc.setAttribute("fill","none"); arc.setAttribute("stroke",col);
    arc.setAttribute("stroke-width",dim?"0.5":"1.2"); arc.setAttribute("stroke-opacity",dim?0.04:0.22);
    arc.setAttribute("stroke-dasharray","4,3"); svg.appendChild(arc);
    // Animated head on arc (small moving dot)
    if(!dim&&ratio>0.2){
      var anim=document.createElementNS(ns,"circle"); anim.setAttribute("r","2"); anim.setAttribute("fill",col); anim.setAttribute("opacity","0.7");
      var animPath=document.createElementNS(ns,"animateMotion"); animPath.setAttribute("dur",(3+Math.random()*4)+"s"); animPath.setAttribute("repeatCount","indefinite");
      var mPath=document.createElementNS(ns,"mpath"); mPath.setAttribute("href",""); 
      animPath.setAttribute("path","M"+p[0]+","+p[1]+" Q"+cpX+","+cpY+" "+defX+","+defY);
      anim.appendChild(animPath); svg.appendChild(anim);
    }
  });

  // Draw pulse rings + dots
  amState.data.forEach(function(atk){
    var p=proj(atk.lat,atk.lng,w,h); var ratio=atk.count/mx; var col=amCol(ratio);
    var dim=(amState.selectedCountry&&amState.selectedCountry!==atk.country);

    // Outer pulse ring
    var ring=document.createElementNS(ns,"circle");
    ring.setAttribute("cx",p[0]); ring.setAttribute("cy",p[1]); ring.setAttribute("r",8+ratio*12);
    ring.setAttribute("fill","none"); ring.setAttribute("stroke",col); ring.setAttribute("stroke-opacity",dim?0.04:0.14); ring.setAttribute("stroke-width","1");
    svg.appendChild(ring);

    // Inner glow ring
    var ring2=document.createElementNS(ns,"circle");
    ring2.setAttribute("cx",p[0]); ring2.setAttribute("cy",p[1]); ring2.setAttribute("r",4+ratio*7);
    ring2.setAttribute("fill",col); ring2.setAttribute("fill-opacity",dim?0.04:0.08);
    svg.appendChild(ring2);

    // Main dot
    var r=5+ratio*15;
    var dot=document.createElementNS(ns,"circle");
    dot.setAttribute("cx",p[0]); dot.setAttribute("cy",p[1]); dot.setAttribute("r",r);
    dot.setAttribute("fill",col); dot.setAttribute("fill-opacity",dim?0.18:0.88);
    dot.setAttribute("filter","url(#glow)"); dot.style.cursor="pointer";

    // Tooltip
    dot.addEventListener("mouseenter",function(e){
      var tip=document.getElementById("attackMapTooltip"); if(!tip)return;
      var types=Object.keys(atk.types).sort(function(a,b){return atk.types[b]-atk.types[a];}).slice(0,3);
      tip.innerHTML='<div style="font-size:13px;font-weight:700;margin-bottom:4px">'+atk.flag+" "+atk.country+'</div>'+
        '<div style="font-size:10px;color:#94a3b8;margin-bottom:6px">'+atk.region+'</div>'+
        '<div style="display:flex;gap:8px;margin-bottom:5px">'+
          '<span style="color:'+col+';font-weight:700;font-family:monospace;font-size:14px">'+atk.count+'</span>'+
          '<span style="color:#94a3b8;font-size:10px;margin-top:3px">attacks · '+atk.ips.length+' source IP'+(atk.ips.length>1?"s":"")+'</span></div>'+
        '<div style="font-size:10px;color:#94a3b8">'+types.map(function(t){return '• '+t.replace(/_/g," ")+" ("+atk.types[t]+")";}).join("<br>")+'</div>';
      tip.style.left=(e.clientX+14)+"px"; tip.style.top=(e.clientY-10)+"px"; tip.classList.remove("hidden");
    });
    dot.addEventListener("mouseleave",function(){var tip=document.getElementById("attackMapTooltip");if(tip)tip.classList.add("hidden");});
    dot.addEventListener("click",function(){
      amState.selectedCountry=(amState.selectedCountry===atk.country)?null:atk.country;
      renderMapSVG(); renderMapSidebar();
    });
    svg.appendChild(dot);

    // Country label for significant sources
    if(ratio>0.35&&!dim){
      var lbl=document.createElementNS(ns,"text");
      lbl.setAttribute("x",p[0]+r+4); lbl.setAttribute("y",p[1]+4);
      lbl.setAttribute("fill",col); lbl.setAttribute("font-size","9");
      lbl.setAttribute("font-family","monospace"); lbl.setAttribute("fill-opacity","0.85");
      lbl.textContent=atk.flag+" "+atk.country; svg.appendChild(lbl);
    }
  });

  // Defender network node
  var dPulse=document.createElementNS(ns,"circle"); dPulse.setAttribute("cx",defX); dPulse.setAttribute("cy",defY); dPulse.setAttribute("r","18"); dPulse.setAttribute("fill","none"); dPulse.setAttribute("stroke","#10b981"); dPulse.setAttribute("stroke-opacity","0.12"); dPulse.setAttribute("stroke-width","2"); svg.appendChild(dPulse);
  var dRing=document.createElementNS(ns,"circle"); dRing.setAttribute("cx",defX); dRing.setAttribute("cy",defY); dRing.setAttribute("r","11"); dRing.setAttribute("fill","rgba(16,185,129,0.08)"); dRing.setAttribute("stroke","#10b981"); dRing.setAttribute("stroke-opacity","0.3"); dRing.setAttribute("stroke-width","1.5"); svg.appendChild(dRing);
  var dCore=document.createElementNS(ns,"circle"); dCore.setAttribute("cx",defX); dCore.setAttribute("cy",defY); dCore.setAttribute("r","6"); dCore.setAttribute("fill","#10b981"); dCore.setAttribute("fill-opacity","0.9"); dCore.setAttribute("filter","url(#softGlow)"); svg.appendChild(dCore);
  var dLbl=document.createElementNS(ns,"text"); dLbl.setAttribute("x",defX+20); dLbl.setAttribute("y",defY+4); dLbl.setAttribute("fill","#10b981"); dLbl.setAttribute("font-size","9"); dLbl.setAttribute("font-family","monospace"); dLbl.setAttribute("fill-opacity","0.85"); dLbl.textContent="🛡 TARGET NETWORK"; svg.appendChild(dLbl);

  // Legend
  var legendData=[["CRITICAL",">75%","#ef4444"],["HIGH",">45%","#f97316"],["MEDIUM",">20%","#f59e0b"],["LOW","","#10b981"]];
  legendData.forEach(function(l,i){
    var lc=document.createElementNS(ns,"circle"); lc.setAttribute("cx",w-80); lc.setAttribute("cy",h-72+i*17); lc.setAttribute("r","4"); lc.setAttribute("fill",l[2]); lc.setAttribute("fill-opacity","0.8"); svg.appendChild(lc);
    var lt=document.createElementNS(ns,"text"); lt.setAttribute("x",w-70); lt.setAttribute("y",h-68+i*17); lt.setAttribute("fill","rgba(148,163,184,0.7)"); lt.setAttribute("font-size","8"); lt.setAttribute("font-family","monospace"); lt.textContent=l[0]; svg.appendChild(lt);
  });

  el.appendChild(svg);
}

function renderMapSidebar(){
  var list=document.getElementById("topCountriesList"); if(!list)return;
  list.innerHTML="";
  var si=document.getElementById("attackMapFilterInfo"),sc=document.getElementById("attackMapFilterCountry"),cb=document.getElementById("attackMapClearFilter");
  var data=amState.selectedCountry?amState.data.filter(function(d){return d.country===amState.selectedCountry;}):amState.data;
  if(amState.selectedCountry){if(si)si.classList.remove("hidden");if(sc)sc.textContent=amState.selectedCountry;}
  else{if(si)si.classList.add("hidden");}
  var mx=data.reduce(function(m,d){return Math.max(m,d.count);},1);
  data.slice(0,12).forEach(function(atk,i){
    var ratio=atk.count/mx; var col=amCol(ratio);
    var row=document.createElement("div"); row.className="am-country-row";
    var types=Object.keys(atk.types).slice(0,2).map(function(t){return t.replace(/_/g," ");}).join(", ");
    row.innerHTML=
      '<div class="am-country-main">'+
        '<span class="am-rank">#'+(i+1)+'</span>'+
        '<span class="am-flag">'+atk.flag+'</span>'+
        '<div class="am-cinfo"><span class="am-cname">'+atk.country+'</span>'+
          '<span class="am-ctype">'+types+'</span></div>'+
      '</div>'+
      '<div class="am-country-bar"><div class="am-cbar-fill" style="width:'+Math.round(ratio*100)+'%;background:'+col+'"></div></div>'+
      '<span class="am-count" style="color:'+col+'">'+atk.count+'</span>';
    row.onclick=function(){
      amState.selectedCountry=(amState.selectedCountry===atk.country)?null:atk.country;
      renderMapSVG(); renderMapSidebar();
      // Drill-down if selected
      if(amState.selectedCountry===atk.country&&typeof drillDown==="function"){
        drillDown(atk.flag+" "+atk.country+" — "+atk.count+" attacks", atk.alerts);
      }
    };
    list.appendChild(row);
  });
  if(cb)cb.onclick=function(){amState.selectedCountry=null;renderMapSVG();renderMapSidebar();};
}

function renderMapStats(alertList){
  var uniq=Object.keys(alertList.reduce(function(m,a){if(IP2C[a.source_ip])m[a.source_ip]=1;return m;},{})).length;
  var e1=document.getElementById("mapStatCountries"),e2=document.getElementById("mapStatIPs"),e3=document.getElementById("mapStatTop");
  if(e1)e1.textContent=amState.data.length;
  if(e2)e2.textContent=uniq;
  var top=amState.data[0];
  if(e3)e3.textContent=top?(top.flag+" "+top.country):"—";
  // Additional stat: most attacked type from map data
  var e4=document.getElementById("mapStatAttacks");
  if(e4){var totalHits=amState.data.reduce(function(s,d){return s+d.count;},0);e4.textContent=totalHits;}
}

function setMapFilter(type,btn){
  amState.filterType=type; amState.selectedCountry=null;
  document.querySelectorAll(".am-filter-btn").forEach(function(b){b.classList.remove("active");});
  if(btn)btn.classList.add("active");
  if(typeof alerts!=="undefined") updateAttackMap(alerts);
}