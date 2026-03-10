// config.js — SOC Operations Center v6
// Auto-detects backend URL. Works from file://, localhost:3000, or any origin.
(function(){
  var host = window.location.hostname || "localhost";
  window.API_BASE_URL = "http://" + host + ":8000";
  window.WS_URL = "ws://"  + host + ":8000/ws";
})();

// CIC-IDS2017 label → internal type mapping
const CIC_LABEL_MAP = {
  "DDoS":"ddos_attack","DoS Hulk":"dos_attack","DoS GoldenEye":"dos_attack",
  "DoS slowloris":"dos_attack","DoS Slowhttptest":"dos_attack",
  "FTP-Patator":"brute_force","SSH-Patator":"brute_force",
  "Web Attack \u2013 Brute Force":"brute_force",
  "Web Attack \u2013 XSS":"web_attack",
  "Web Attack \u2013 Sql Injection":"sql_injection",
  "Bot":"malware_detection","PortScan":"port_scan",
  "Infiltration":"data_exfiltration","Heartbleed":"vulnerability_exploit",
};

const SEVERITY_COLORS = {
  critical:"#ef4444", high:"#f97316", medium:"#f59e0b",
  low:"#10b981", info:"#3b82f6"
};
const STATUS_COLORS = {
  new:"#3b82f6", investigating:"#f59e0b", resolved:"#10b981",
  false_positive:"#64748b", escalated:"#ef4444"
};
const PRIORITY_COLORS = {
  immediate:"#ef4444", high:"#f97316", normal:"#3b82f6", low:"#64748b"
};
const PALETTE = [
  "#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6",
  "#f97316","#06b6d4","#ec4899","#84cc16","#a78bfa"
];