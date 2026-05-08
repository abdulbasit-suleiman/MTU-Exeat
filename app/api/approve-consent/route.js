'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, collection, query, where,
  orderBy, onSnapshot, updateDoc,
} from 'firebase/firestore';

const PORTAL_CREDS = {
  affairs: { email: process.env.NEXT_PUBLIC_AFFAIRS_EMAIL || 'affairs@mtu.edu.ng', password: process.env.NEXT_PUBLIC_AFFAIRS_PASSWORD || 'Affairs@MTU2025' },
  cso:     { email: process.env.NEXT_PUBLIC_CSO_EMAIL     || 'cso@mtu.edu.ng',     password: process.env.NEXT_PUBLIC_CSO_PASSWORD    || 'CSO1795MTU' },
};

const INACTIVITY_MS = 5 * 60 * 1000; // 5 minutes

/* ─── CSS ─── */
const css = `
:root {
  --mtu:#4C1880;--mtu-d:#2B0A52;--mtu-m:#3D1168;--mtu-l:#7B45B0;--mtu-xl:#EDE6F7;
  --gold:#B8880C;--gold-l:#F0C84A;--gold-xl:#FDF6DC;
  --green:#1D9E75;--green-l:#E1F5EE;--green-d:#0F6E56;
  --red:#A32D2D;--red-l:#FCEBEB;--amber:#854F0B;--amber-l:#FAEEDA;
  --blue:#185FA5;--blue-l:#E6F1FB;
  --bg:#F4F1F9;--surface:#FFFFFF;--surf2:#F8F6FC;
  --border:rgba(76,24,128,0.13);--border2:rgba(76,24,128,0.25);
  --text:#1A0A30;--text2:#5E4D78;--text3:#A090B4;
  --r:14px;--r-sm:9px;--r-pill:999px;
  --shadow:0 4px 20px rgba(76,24,128,0.10);--shadow-lg:0 8px 32px rgba(76,24,128,0.15);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'DM Sans',-apple-system,system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;}
::-webkit-scrollbar{width:6px;height:6px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--mtu-xl);border-radius:10px;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.25}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
.nav{background:var(--mtu-d);display:flex;align-items:stretch;border-bottom:2.5px solid var(--gold);position:sticky;top:0;z-index:200;box-shadow:0 2px 16px rgba(0,0,0,0.3);}
.nav-brand{padding:0 22px;display:flex;align-items:center;gap:12px;border-right:1px solid rgba(255,255,255,0.1);flex-shrink:0;min-height:58px;}
.nav-logo{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--gold) 0%,#D4A017 100%);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--mtu-d);flex-shrink:0;box-shadow:0 0 0 2px rgba(255,255,255,0.15);}
.nav-name{color:#fff;font-size:11.5px;font-weight:500;line-height:1.35;}
.nav-name small{color:rgba(255,255,255,0.45);font-weight:400;}
.nav-right{display:flex;align-items:center;gap:10px;padding:0 18px;margin-left:auto;}
.nav-user{font-size:12px;color:rgba(255,255,255,0.65);display:flex;align-items:center;gap:8px;}
.nav-avatar{width:28px;height:28px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--mtu-d);}
.nav-logout{font-size:11.5px;color:rgba(255,255,255,0.5);background:rgba(255,255,255,0.07);border:none;padding:5px 12px;border-radius:var(--r-pill);cursor:pointer;font-family:inherit;transition:all 0.18s;}
.nav-logout:hover{color:#fff;background:rgba(255,255,255,0.14);}
.nav-portal-tag{font-size:10px;font-weight:700;padding:3px 10px;border-radius:var(--r-pill);letter-spacing:0.4px;text-transform:uppercase;}
.tag-student{background:var(--mtu-xl);color:var(--mtu);}
.tag-affairs{background:var(--green-l);color:var(--green-d);}
.tag-cso{background:var(--amber-l);color:var(--amber);}
.inactivity-bar{background:var(--amber-l);border-bottom:1px solid var(--amber);padding:6px 24px;font-size:11.5px;color:var(--amber);font-weight:600;text-align:center;}
.page{animation:fadeUp 0.25s ease;padding:28px 24px;max-width:1080px;margin:0 auto;width:100%;}
@media(max-width:640px){.page{padding:16px;}}
.hero{background:linear-gradient(145deg,var(--mtu-d) 0%,var(--mtu-m) 60%,#3A1270 100%);border-radius:var(--r);padding:52px 36px 48px;text-align:center;position:relative;overflow:hidden;margin-bottom:22px;box-shadow:var(--shadow-lg);}
.hero-mountain{position:absolute;bottom:0;left:0;right:0;opacity:0.06;pointer-events:none;}
.hero-badge{display:inline-block;background:var(--gold-xl);color:var(--gold);font-size:10.5px;font-weight:700;padding:5px 16px;border-radius:var(--r-pill);margin-bottom:16px;letter-spacing:0.6px;text-transform:uppercase;}
.hero-title{font-family:'Playfair Display',Georgia,serif;color:#fff;font-size:32px;font-weight:600;margin-bottom:10px;line-height:1.2;}
.hero-sub{color:rgba(255,255,255,0.58);font-size:14px;margin-bottom:5px;}
.hero-addr{color:rgba(255,255,255,0.3);font-size:11px;margin-top:4px;}
.flow-strip{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:20px 24px;margin-bottom:22px;box-shadow:var(--shadow);}
.flow-title{font-size:10.5px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.7px;margin-bottom:14px;}
.flow-steps{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.flow-step{font-size:12px;font-weight:600;padding:8px 16px;border-radius:var(--r-pill);}
.fs-s{background:var(--mtu-xl);color:var(--mtu);}
.fs-p{background:var(--blue-l);color:var(--blue);}
.fs-a{background:var(--green-l);color:var(--green-d);}
.fs-c{background:var(--amber-l);color:var(--amber);}
.flow-arr{color:var(--text3);font-size:16px;}
.portal-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;}
.portal-card{background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r);padding:30px 24px;text-align:center;cursor:pointer;transition:all 0.22s;box-shadow:var(--shadow);}
.portal-card:hover{border-color:var(--mtu-l);transform:translateY(-4px);box-shadow:var(--shadow-lg);}
.p-icon{width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;font-size:26px;}
.pi-s{background:var(--mtu-xl);}.pi-a{background:var(--green-l);}.pi-c{background:var(--amber-l);}
.portal-card h3{font-size:16px;font-weight:600;color:var(--text);margin-bottom:8px;}
.portal-card p{font-size:12.5px;color:var(--text2);line-height:1.6;margin-bottom:18px;}
.portal-enter{font-size:12.5px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:5px;}
.auth-wrap{display:grid;grid-template-columns:1fr 1fr;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;min-height:520px;box-shadow:var(--shadow-lg);}
@media(max-width:680px){.auth-wrap{grid-template-columns:1fr;}}
.auth-left{background:linear-gradient(160deg,var(--mtu-d) 0%,var(--mtu-m) 100%);padding:40px 32px;display:flex;flex-direction:column;justify-content:space-between;}
.auth-left h2{font-family:'Playfair Display',Georgia,serif;color:#fff;font-size:24px;font-weight:600;margin-bottom:10px;}
.auth-left > div > p{color:rgba(255,255,255,0.52);font-size:13px;line-height:1.6;}
.auth-features{margin-top:28px;}
.auth-feat{display:flex;align-items:flex-start;gap:14px;margin-bottom:20px;}
.af-ic{width:34px;height:34px;flex-shrink:0;border-radius:9px;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:16px;}
.af-txt{font-size:12.5px;color:rgba(255,255,255,0.62);line-height:1.55;margin-top:7px;}
.auth-footer-text{font-size:10px;color:rgba(255,255,255,0.22);}
.auth-right{padding:40px 36px;overflow-y:auto;}
.auth-right h3{font-size:20px;font-weight:600;color:var(--text);margin-bottom:5px;}
.auth-right > p{font-size:13px;color:var(--text2);margin-bottom:28px;}
.cred-hint{background:var(--surf2);border:1px dashed var(--border2);border-radius:var(--r-sm);padding:12px 16px;margin-bottom:20px;font-size:12px;color:var(--text2);line-height:1.7;}
.cred-hint strong{color:var(--mtu);font-weight:700;}
.cred-hint code{background:var(--mtu-xl);color:var(--mtu);padding:1px 6px;border-radius:4px;font-size:11.5px;font-family:monospace;}
.af{margin-bottom:16px;}
.af label{display:block;font-size:11px;font-weight:700;color:var(--text2);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.4px;}
.af input,.af select{width:100%;border:1.5px solid var(--border2);border-radius:var(--r-sm);padding:11px 14px;font-size:13.5px;background:var(--surf2);color:var(--text);font-family:'DM Sans',system-ui,sans-serif;transition:border-color 0.18s,box-shadow 0.18s;}
.af input:focus,.af select:focus{outline:none;border-color:var(--mtu);box-shadow:0 0 0 3px rgba(76,24,128,0.1);background:var(--surface);}
.auth-btn{width:100%;background:var(--mtu);color:#fff;border:none;padding:14px;border-radius:var(--r-sm);font-size:14.5px;font-weight:600;cursor:pointer;margin-top:8px;font-family:'DM Sans',system-ui,sans-serif;transition:background 0.18s,transform 0.1s;}
.auth-btn:hover{background:var(--mtu-l);}
.auth-btn:active{transform:scale(0.99);}
.auth-btn.affairs{background:var(--green-d);}.auth-btn.affairs:hover{background:var(--green);}
.auth-btn.cso{background:var(--amber);}.auth-btn.cso:hover{background:#A06310;}
.auth-link{font-size:12.5px;color:var(--mtu-l);cursor:pointer;margin-top:14px;display:block;text-align:center;}
.auth-div{display:flex;align-items:center;gap:14px;margin:20px 0;}
.auth-div span{font-size:11px;color:var(--text3);}
.auth-div::before,.auth-div::after{content:'';flex:1;height:1px;background:var(--border);}
.alt-btn{width:100%;background:var(--surf2);color:var(--text);border:1.5px solid var(--border2);padding:12px;border-radius:var(--r-sm);font-size:13px;font-weight:500;cursor:pointer;font-family:'DM Sans',system-ui,sans-serif;transition:all 0.18s;}
.alt-btn:hover{background:var(--mtu-xl);border-color:var(--mtu-l);}
.err-msg{background:var(--red-l);color:var(--red);border-radius:var(--r-sm);padding:10px 14px;font-size:12.5px;font-weight:500;margin-bottom:14px;}
.info-msg{background:var(--blue-l);color:var(--blue);border-radius:var(--r-sm);padding:10px 14px;font-size:12.5px;font-weight:500;margin-bottom:14px;}
.sg{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:460px){.sg{grid-template-columns:1fr;}}
.sec-div{font-size:11px;font-weight:700;color:var(--mtu);text-transform:uppercase;letter-spacing:0.5px;margin:20px 0 14px;padding-top:16px;border-top:1px solid var(--border);}
.terms-row{display:flex;align-items:flex-start;gap:10px;margin:16px 0;font-size:12.5px;color:var(--text2);line-height:1.55;}
.terms-row input{margin-top:3px;width:auto;flex-shrink:0;accent-color:var(--mtu);}
.stu-head{background:linear-gradient(135deg,var(--mtu-d) 0%,var(--mtu-m) 100%);border-radius:var(--r);padding:26px 28px;margin-bottom:22px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;box-shadow:var(--shadow-lg);}
.stu-info{display:flex;align-items:center;gap:18px;}
.avatar{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--gold) 0%,#D4A017 100%);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:var(--mtu-d);flex-shrink:0;box-shadow:0 0 0 3px rgba(255,255,255,0.15);}
.stu-head h2{color:#fff;font-size:18px;font-weight:600;margin-bottom:5px;display:flex;align-items:center;gap:10px;}
.active-pill{font-size:10px;padding:3px 10px;border-radius:var(--r-pill);background:rgba(29,158,117,0.25);color:#6EFFC9;font-weight:700;}
.stu-head p{color:rgba(255,255,255,0.52);font-size:12.5px;}
.head-meta{text-align:right;}
.hm-count{color:var(--gold-l);font-size:14px;font-weight:600;margin-bottom:3px;}
.hm-sess{color:rgba(255,255,255,0.38);font-size:11.5px;}
.action-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:18px;margin-bottom:22px;}
.ac{background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r);padding:24px 22px;cursor:pointer;transition:all 0.22s;box-shadow:var(--shadow);}
.ac:hover{border-color:var(--mtu-l);transform:translateY(-3px);box-shadow:var(--shadow-lg);}
.ac-ic{width:44px;height:44px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:16px;}
.ic-p{background:var(--mtu-xl);}.ic-a{background:var(--amber-l);}.ic-g{background:var(--green-l);}
.ac h4{font-size:14.5px;font-weight:600;color:var(--text);margin-bottom:6px;}
.ac p{font-size:12px;color:var(--text2);line-height:1.55;}
.ac-link{margin-top:16px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:5px;}
.hist{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:22px;box-shadow:var(--shadow);}
.hist h4{font-size:15px;font-weight:600;color:var(--text);margin-bottom:18px;}
.ex-row{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--border);gap:14px;}
.ex-row:last-child{border-bottom:none;padding-bottom:0;}
.ex-pur{font-size:13.5px;font-weight:500;color:var(--text);margin-bottom:4px;}
.ex-met{font-size:11.5px;color:var(--text2);}
.sbadge{font-size:11px;padding:5px 12px;border-radius:var(--r-pill);font-weight:600;white-space:nowrap;}
.sb-ok{background:var(--green-l);color:var(--green-d);}
.sb-pnd{background:var(--amber-l);color:var(--amber);}
.sb-dcl{background:var(--red-l);color:var(--red);}
.form-head{background:linear-gradient(135deg,var(--mtu-d) 0%,var(--mtu-m) 100%);border-radius:var(--r);padding:22px 28px;margin-bottom:22px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;box-shadow:var(--shadow-lg);}
.form-head h2{color:#fff;font-size:18px;font-weight:600;margin-bottom:5px;}
.form-head p{color:rgba(255,255,255,0.52);font-size:12.5px;}
.ref-pill{background:rgba(255,255,255,0.1);padding:10px 18px;border-radius:var(--r-pill);text-align:center;}
.ref-lbl{font-size:9.5px;color:var(--gold-l);font-weight:700;text-transform:uppercase;letter-spacing:0.4px;}
.ref-val{font-size:13.5px;font-weight:700;color:#fff;margin-top:3px;}
.form-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:28px;box-shadow:var(--shadow);}
.form-sec{font-size:11px;font-weight:700;color:var(--mtu);text-transform:uppercase;letter-spacing:0.7px;margin-bottom:16px;padding-bottom:9px;border-top:2px solid var(--mtu-xl);padding-top:16px;margin-top:16px;}
.form-sec:first-child{margin-top:0;border-top:none;padding-top:0;}
.form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px;margin-bottom:24px;}
.ff{display:flex;flex-direction:column;gap:6px;}
.ff label{font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.4px;}
.ff input,.ff select,.ff textarea{border:1.5px solid var(--border2);border-radius:var(--r-sm);padding:10px 14px;font-size:13.5px;background:var(--surf2);color:var(--text);font-family:'DM Sans',system-ui,sans-serif;transition:border-color 0.18s,box-shadow 0.18s;}
.ff input:focus,.ff select:focus,.ff textarea:focus{outline:none;border-color:var(--mtu);box-shadow:0 0 0 3px rgba(76,24,128,0.1);background:var(--surface);}
.ff textarea{resize:vertical;min-height:90px;}
.radio-grp{display:flex;gap:20px;margin-top:8px;}
.radio-opt{display:flex;align-items:center;gap:7px;font-size:13.5px;color:var(--text);cursor:pointer;}
.radio-opt input{accent-color:var(--mtu);}
.ptoggle{background:var(--mtu-xl);border:1.5px solid rgba(76,24,128,0.18);border-radius:var(--r-sm);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px;}
.ptoggle-lbl p{font-size:13.5px;font-weight:700;color:var(--mtu);margin-bottom:4px;}
.ptoggle-lbl span{font-size:12px;color:var(--mtu-l);}
.toggle-sw{width:46px;height:26px;flex-shrink:0;border-radius:var(--r-pill);cursor:pointer;border:none;position:relative;transition:background 0.22s;}
.toggle-sw::after{content:'';position:absolute;top:4px;right:4px;width:18px;height:18px;background:#fff;border-radius:50%;transition:transform 0.22s;box-shadow:0 1px 4px rgba(0,0,0,0.25);}
.toggle-sw.off{background:#C4B8D6 !important;}
.toggle-sw.off::after{transform:translateX(-20px);}
.consent-box{background:var(--surf2);border:1px solid var(--border);border-radius:var(--r-sm);padding:14px 18px;margin-bottom:22px;font-size:12.5px;color:var(--text2);line-height:1.6;}
.consent-box strong{color:var(--text);display:block;margin-bottom:5px;}
.form-actions{display:flex;gap:12px;justify-content:flex-end;margin-top:22px;padding-top:22px;border-top:1px solid var(--border);}
.btn-pri{background:var(--mtu);color:#fff;border:none;padding:13px 26px;border-radius:var(--r-sm);font-size:13.5px;font-weight:600;cursor:pointer;font-family:'DM Sans',system-ui,sans-serif;transition:background 0.18s,transform 0.1s;}
.btn-pri:hover{background:var(--mtu-l);}
.btn-pri:disabled{opacity:0.6;cursor:not-allowed;}
.btn-sec{background:var(--surf2);color:var(--text);border:1.5px solid var(--border2);padding:13px 26px;border-radius:var(--r-sm);font-size:13.5px;font-weight:500;cursor:pointer;font-family:'DM Sans',system-ui,sans-serif;}
.btn-sec:hover{background:var(--mtu-xl);}
.success-banner{background:var(--green-l);border:1px solid var(--green);border-radius:var(--r-sm);padding:16px 20px;display:flex;align-items:center;gap:14px;margin-bottom:20px;animation:fadeUp 0.3s ease;}
.success-banner p{font-size:13px;color:var(--green-d);line-height:1.6;}
.portal-head{border-radius:var(--r);padding:22px 28px;margin-bottom:22px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;box-shadow:var(--shadow-lg);}
.portal-head.green{background:linear-gradient(135deg,var(--green-d) 0%,#0a5040 100%);}
.portal-head.amber{background:linear-gradient(135deg,var(--amber) 0%,#5C3300 100%);}
.portal-head h2{color:#fff;font-size:18px;font-weight:600;margin-bottom:5px;}
.portal-head p{color:rgba(255,255,255,0.52);font-size:12.5px;}
.notif-pill{display:flex;align-items:center;gap:9px;background:rgba(255,255,255,0.12);padding:10px 18px;border-radius:var(--r-pill);cursor:pointer;}
.notif-pill span{font-size:12.5px;color:rgba(255,255,255,0.8);}
.nav-dot{width:7px;height:7px;background:var(--gold-l);border-radius:50%;animation:pulse 2s infinite;display:inline-block;}
.stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:22px;}
.stat{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);padding:18px;box-shadow:var(--shadow);cursor:pointer;transition:all 0.18s;}
.stat:hover{border-color:var(--mtu-l);transform:translateY(-2px);box-shadow:var(--shadow-lg);}
.stat.active{border-color:var(--mtu);background:var(--mtu-xl);}
.stat-n{font-size:28px;font-weight:700;line-height:1;}
.stat-l{font-size:11.5px;color:var(--text2);margin-top:6px;line-height:1.4;}
.sa-grid{display:grid;grid-template-columns:1fr 295px;gap:18px;}
@media(max-width:820px){.sa-grid{grid-template-columns:1fr;}}
.spanel{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:22px;box-shadow:var(--shadow);}
.spanel h4{font-size:15px;font-weight:600;color:var(--text);margin-bottom:16px;}
.sbar{display:flex;gap:9px;margin-bottom:14px;}
.sbar input{flex:1;border:1.5px solid var(--border2);border-radius:var(--r-sm);padding:10px 14px;font-size:13px;background:var(--surf2);color:var(--text);font-family:'DM Sans',system-ui,sans-serif;}
.sbar input:focus{outline:none;border-color:var(--green-d);background:var(--surface);}
.sbar button{background:var(--green-d);color:#fff;border:none;padding:10px 18px;border-radius:var(--r-sm);font-size:14px;cursor:pointer;}
.frow{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;align-items:center;}
.frow label{font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.4px;}
.fsel{border:1px solid var(--border2);border-radius:var(--r-pill);padding:6px 14px;font-size:12px;background:var(--surface);color:var(--text);cursor:pointer;font-family:'DM Sans',system-ui,sans-serif;}
.fdate{border:1px solid var(--border2);border-radius:var(--r-pill);padding:5px 12px;font-size:12px;background:var(--surface);color:var(--text);font-family:'DM Sans',system-ui,sans-serif;}
.clear-btn{font-size:11px;padding:5px 12px;border-radius:var(--r-pill);border:1px solid var(--border2);background:var(--surf2);color:var(--text2);cursor:pointer;font-family:'DM Sans',system-ui,sans-serif;}
.clear-btn:hover{background:var(--red-l);color:var(--red);border-color:var(--red);}
.stable{width:100%;border-collapse:collapse;}
.stable th{font-size:10.5px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.4px;padding:9px 10px;text-align:left;border-bottom:2px solid var(--border);white-space:nowrap;}
.stable th.sortable{cursor:pointer;user-select:none;transition:color 0.15s;}
.stable th.sortable:hover{color:var(--mtu);}
.stable th.sort-asc::after{content:' ↑';color:var(--mtu);}
.stable th.sort-desc::after{content:' ↓';color:var(--mtu);}
.stable td{font-size:12.5px;color:var(--text);padding:13px 10px;border-bottom:1px solid var(--border);}
.stable tr:hover td{background:var(--surf2);cursor:pointer;}
.sn{font-weight:600;margin-bottom:2px;}.sd{font-size:11px;color:var(--text2);}
.tfoot{display:flex;align-items:center;justify-content:space-between;margin-top:16px;flex-wrap:wrap;gap:10px;}
.tfoot span{font-size:12px;color:var(--text2);}
.pgbtns{display:flex;gap:7px;}
.pgbtn{font-size:12px;padding:6px 14px;border-radius:var(--r-sm);border:1px solid var(--border2);background:var(--surface);color:var(--text);cursor:pointer;font-family:'DM Sans',system-ui,sans-serif;}
.pgbtn:hover{background:var(--mtu-xl);}
.pgbtn:disabled{opacity:0.4;cursor:not-allowed;}
.npanel{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:22px;box-shadow:var(--shadow);}
.npanel h4{font-size:15px;font-weight:600;color:var(--text);margin-bottom:16px;display:flex;align-items:center;gap:9px;}
.ni{border-radius:var(--r-sm);padding:14px 16px;margin-bottom:12px;border-left:4px solid;}
.ni-new{background:var(--mtu-xl);border-color:var(--mtu);}
.ni-done{background:var(--green-l);border-color:var(--green);}
.ni-t{font-size:12.5px;font-weight:600;color:var(--text);margin-bottom:3px;}
.ni-m{font-size:11.5px;color:var(--text2);}
.ni-acts{display:flex;gap:7px;margin-top:10px;}
.ni-btn{font-size:11px;padding:5px 13px;border-radius:var(--r-pill);cursor:pointer;border:1px solid var(--border2);background:var(--surface);color:var(--text);font-family:'DM Sans',system-ui,sans-serif;font-weight:500;}
.ni-btn.rev{background:var(--green-d);color:#fff;border-color:var(--green-d);}
.cso-badge{background:rgba(200,160,70,0.15);border:1.5px solid var(--gold);padding:10px 20px;border-radius:var(--r-pill);}
.cso-badge span{color:var(--gold-l);font-size:13px;font-weight:700;}
.cso-q{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:22px;margin-bottom:18px;box-shadow:var(--shadow);}
.cso-q h4{font-size:15px;font-weight:600;color:var(--text);margin-bottom:18px;display:flex;align-items:center;gap:10px;}
.q-sub{font-size:12px;color:var(--text3);font-weight:400;}
.qi{border:1.5px solid var(--border);border-radius:var(--r-sm);padding:18px;margin-bottom:14px;display:flex;align-items:flex-start;gap:16px;transition:border-color 0.2s,box-shadow 0.2s;}
.qi:hover{border-color:var(--amber);box-shadow:0 4px 16px rgba(133,79,11,0.08);}
.qi:last-child{margin-bottom:0;}
.q-av{width:42px;height:42px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;}
.q-name{font-size:14.5px;font-weight:600;color:var(--text);margin-bottom:4px;}
.q-meta{font-size:12px;color:var(--text2);margin-bottom:4px;}
.q-rsn{font-size:12.5px;color:var(--text);margin-bottom:10px;}
.flow-bs{display:flex;gap:7px;flex-wrap:wrap;}
.fb{font-size:10.5px;padding:4px 11px;border-radius:var(--r-pill);font-weight:700;}
.fb-p{background:var(--green-l);color:var(--green-d);}
.fb-a{background:var(--mtu-xl);color:var(--mtu);}
.fb-c{background:var(--amber-l);color:var(--amber);}
.fb-ok{background:var(--green-l);color:var(--green-d);}
.q-acts{display:flex;flex-direction:column;gap:9px;flex-shrink:0;margin-left:auto;}
.qa-v{background:var(--amber-l);color:var(--amber);border:none;padding:9px 16px;border-radius:var(--r-sm);font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',system-ui,sans-serif;}
.qa-a{background:var(--green);color:#fff;border:none;padding:9px 16px;border-radius:var(--r-sm);font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',system-ui,sans-serif;transition:background 0.18s;}
.qa-a:hover{background:var(--green-d);}
.qa-d{background:var(--red-l);color:var(--red);border:none;padding:9px 16px;border-radius:var(--r-sm);font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',system-ui,sans-serif;}
.rec-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:22px;box-shadow:var(--shadow);}
.rec-card h4{font-size:15px;font-weight:600;color:var(--text);margin-bottom:16px;}
.rr{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border);gap:14px;font-size:13px;}
.rr:last-child{border-bottom:none;padding-bottom:0;}
.rr-n{font-weight:600;color:var(--text);}
.rr-m{color:var(--text2);font-size:12px;}
.rr-r{display:flex;align-items:center;gap:12px;color:var(--text2);font-size:12px;}
.track-bar{display:flex;align-items:center;gap:0;margin:18px 0;}
.track-step{display:flex;flex-direction:column;align-items:center;flex:1;position:relative;}
.track-step:not(:last-child)::after{content:'';position:absolute;top:14px;left:50%;width:100%;height:2px;background:var(--border);z-index:0;}
.track-step.done:not(:last-child)::after{background:var(--green);}
.ts-circle{width:28px;height:28px;border-radius:50%;border:2px solid var(--border);background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;z-index:1;position:relative;}
.track-step.done .ts-circle{background:var(--green);border-color:var(--green);color:#fff;}
.track-step.active .ts-circle{background:var(--mtu);border-color:var(--mtu);color:#fff;}
.track-step.pending .ts-circle{background:var(--surf2);border-color:var(--border2);color:var(--text3);}
.ts-lbl{font-size:10px;color:var(--text2);margin-top:6px;text-align:center;font-weight:500;}
.ts-time{font-size:9px;color:var(--text3);margin-top:2px;text-align:center;}
.track-step.done .ts-lbl{color:var(--green-d);}
.track-step.active .ts-lbl{color:var(--mtu);font-weight:700;}
.exeat-card{background:var(--surface);border:1.5px solid var(--border);border-radius:var(--r);padding:22px;margin-bottom:14px;box-shadow:var(--shadow);animation:fadeUp 0.25s ease;}
.exeat-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;}
.ec-ref{font-size:10px;font-weight:700;color:var(--mtu);background:var(--mtu-xl);padding:3px 10px;border-radius:var(--r-pill);letter-spacing:0.4px;}
.ec-title{font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px;}
.ec-meta{font-size:12px;color:var(--text2);}
.ec-detail{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border);}
.ec-d-item label{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.4px;display:block;margin-bottom:3px;}
.ec-d-item span{font-size:12.5px;color:var(--text);}
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;}
.modal{background:var(--surface);border-radius:var(--r);padding:28px;max-width:560px;width:100%;box-shadow:var(--shadow-lg);animation:fadeUp 0.22s ease;max-height:90vh;overflow-y:auto;}
.modal h3{font-size:18px;font-weight:600;color:var(--text);margin-bottom:6px;}
.modal-close{float:right;background:none;border:none;font-size:20px;cursor:pointer;color:var(--text2);margin-top:-4px;}
.modal-sect{font-size:11px;font-weight:700;color:var(--mtu);text-transform:uppercase;letter-spacing:0.5px;margin:18px 0 10px;padding-top:14px;border-top:1px solid var(--border);}
.modal-sect:first-of-type{margin-top:14px;}
.modal-row{display:flex;gap:10px;margin-bottom:8px;}
.modal-key{font-size:12px;font-weight:600;color:var(--text2);min-width:110px;}
.modal-val{font-size:12.5px;color:var(--text);flex:1;}
.modal-acts{display:flex;gap:10px;margin-top:22px;padding-top:18px;border-top:1px solid var(--border);}
.spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--mtu);border-radius:50%;animation:spin 0.7s linear infinite;margin:40px auto;}
.empty-state{text-align:center;padding:40px 20px;color:var(--text2);}
.empty-state p{font-size:13px;margin-top:8px;}
.ts-timeline{margin-top:14px;padding-top:14px;border-top:1px solid var(--border);}
.ts-timeline h5{font-size:10px;font-weight:700;color:var(--mtu);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;}
.ts-row{display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:12px;}
.ts-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.ts-dot-done{background:var(--green);}
.ts-dot-pnd{background:var(--border2);}
.ts-label{color:var(--text2);min-width:90px;}
.ts-val{color:var(--text);font-weight:500;}
`;

/* ─── HELPERS ─── */
function fmtDate(d) {
  if (!d) return '—';
  if (d?.toDate) d = d.toDate();
  const parsed = new Date(d);
  if (isNaN(parsed)) return '—';
  return parsed.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  if (d?.toDate) d = d.toDate();
  const parsed = new Date(d);
  if (isNaN(parsed)) return '—';
  return parsed.toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function avatarColors(i) {
  const bgs = ['var(--mtu-xl)', 'var(--green-l)', 'var(--amber-l)', 'var(--blue-l)'];
  const cls = ['var(--mtu)', 'var(--green-d)', 'var(--amber)', 'var(--blue)'];
  const idx = i % bgs.length;
  return { bg: bgs[idx], cl: cls[idx] };
}

/* ─── STATUS BADGE ─── */
function StatusBadge({ type }) {
  const map = {
    approved:           ['sb-ok',  '✓ Approved'],
    'cso-approved':     ['sb-ok',  '✓ CSO Approved'],
    pending:            ['sb-pnd', '⏳ Pending'],
    'awaiting-affairs': ['sb-pnd', '⏳ Awaiting Affairs'],
    'awaiting-cso':     ['sb-pnd', '⏳ Awaiting CSO'],
    'awaiting-parent':  ['sb-pnd', '⏳ Awaiting Parent'],
    declined:           ['sb-dcl', '✗ Declined'],
    referred:           ['sb-dcl', '↩ Referred Back'],
  };
  const [cls, lbl] = map[type] || ['sb-pnd', type];
  return <span className={`sbadge ${cls}`}>{lbl}</span>;
}

/* ─── INACTIVITY HOOK ─── */
function useInactivityLogout(isLoggedIn, onLogout) {
  const timerRef    = useRef(null);
  const warningRef  = useRef(null);
  const [warn, setWarn] = useState(false);

  const reset = useCallback(() => {
    if (!isLoggedIn) return;
    setWarn(false);
    clearTimeout(timerRef.current);
    clearTimeout(warningRef.current);
    // warn 60 s before logout
    warningRef.current = setTimeout(() => setWarn(true), INACTIVITY_MS - 60_000);
    timerRef.current   = setTimeout(() => {
      setWarn(false);
      onLogout();
    }, INACTIVITY_MS);
  }, [isLoggedIn, onLogout]);

  useEffect(() => {
    if (!isLoggedIn) { clearTimeout(timerRef.current); clearTimeout(warningRef.current); setWarn(false); return; }
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      clearTimeout(timerRef.current);
      clearTimeout(warningRef.current);
    };
  }, [isLoggedIn, reset]);

  return warn;
}

/* ─── NAV ─── */
function NavBar({ role, user, onLogout }) {
  const tagMap = { student: ['tag-student', 'Student'], affairs: ['tag-affairs', 'Student Affairs'], cso: ['tag-cso', 'CSO'] };
  const [cls, label] = tagMap[role] || [];
  return (
    <nav className="nav">
      <div className="nav-brand">
        <div className="nav-logo">MTU</div>
        <span className="nav-name">Mountain Top University<br /><small>Exeat Portal</small></span>
      </div>
      {role && (
        <div className="nav-right">
          <span className={`nav-portal-tag ${cls}`}>{label}</span>
          <div className="nav-user">
            <div className="nav-avatar">{user?.[0]?.toUpperCase() || '?'}</div>
            {user}
          </div>
          <button className="nav-logout" onClick={onLogout}>Sign out</button>
        </div>
      )}
    </nav>
  );
}

/* ─── LANDING ─── */
// FIX: No SSR-unsafe `typeof window` check here.
// consentMsg is passed as a prop from the root, which reads it client-side only after mount.
function Landing({ go, consentMsg }) {
  const consentText = {
    approved:           '✅ You have approved the exeat. The request will now be reviewed by Student Affairs.',
    declined:           '✗ You have declined the exeat request.',
    'already-actioned': 'ℹ️ This exeat has already been actioned.',
    'not-found':        '⚠️ Exeat request not found.',
    error:              '⚠️ Something went wrong. Please contact Student Affairs.',
  }[consentMsg] || null;

  return (
    <>
      {consentText && (
        <div className={consentMsg === 'approved' ? 'success-banner' : 'err-msg'} style={{ marginBottom: 18 }}>
          {consentText}
        </div>
      )}
      <div className="hero">
        <svg className="hero-mountain" viewBox="0 0 1100 150" preserveAspectRatio="none">
          <polygon points="0,150 160,28 290,85 490,0 680,58 880,16 1100,72 1100,150" fill="#fff" />
        </svg>
        <div className="hero-badge">Students' Affairs Division</div>
        <h1 className="hero-title">MTU Exeat Management System</h1>
        <p className="hero-sub">Digital Exeat Permit Platform — Mountain Top University</p>
        <p className="hero-addr">Km 12, Lagos-Ibadan Expressway, Prayer City, Ogun State, Nigeria</p>
      </div>
      <div className="flow-strip">
        <div className="flow-title">Exeat Approval Workflow</div>
        <div className="flow-steps">
          <span className="flow-step fs-s">① Student Request</span><span className="flow-arr">→</span>
          <span className="flow-step fs-p">② Parent Consent</span><span className="flow-arr">→</span>
          <span className="flow-step fs-a">③ Student Affairs Review</span><span className="flow-arr">→</span>
          <span className="flow-step fs-c">④ CSO Final Approval</span>
        </div>
      </div>
      <div className="portal-grid">
        {[
          { id: 'student-login', icon: '🎓', cls: 'pi-s', title: 'Student Portal',  color: 'var(--mtu)',      desc: 'Students sign in or register to submit exeat requests and track approvals.' },
          { id: 'affairs-login', icon: '🏛', cls: 'pi-a', title: 'Student Affairs', color: 'var(--green-d)', desc: 'Authorised staff review requests, search records and forward to CSO.' },
          { id: 'cso-login',     icon: '🛡', cls: 'pi-c', title: 'CSO Portal',      color: 'var(--amber)',   desc: 'Chief Security Officer gives final approval to all cleared exeat permits.' },
        ].map(p => (
          <div className="portal-card" key={p.id} onClick={() => go(p.id)}>
            <div className={`p-icon ${p.cls}`}>{p.icon}</div>
            <h3>{p.title}</h3><p>{p.desc}</p>
            <div className="portal-enter" style={{ color: p.color }}>Sign in to portal →</div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── STUDENT AUTH ─── */
function StudentLogin({ go, onLogin }) {
  const [view, setView]       = useState('login');
  const [err, setErr]         = useState('');
  const [info, setInfo]       = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail]     = useState('');
  const [pass, setPass]       = useState('');
  const [form, setForm]       = useState({
    surname: '', otherNames: '', matric: '', room: '', college: '', dept: '',
    email: '', phone: '', parentName: '', relationship: 'Father',
    parentEmail: '', parentPhone: '', password: '', confirm: '', terms: false,
  });

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })); setErr(''); }

  async function handleLogin() {
    if (!email || !pass) { setErr('Please enter your email and password.'); return; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      if (!cred.user.emailVerified) {
        await auth.signOut();
        setInfo('Please verify your email first. Need a new one?');
        setLoading(false); return;
      }
      const snap = await getDoc(doc(db, 'students', cred.user.uid));
      const p = snap.exists() ? snap.data() : {};
      onLogin({
        role: 'student', uid: cred.user.uid,
        name: `${p.surname || ''} ${p.otherNames || ''}`.trim() || cred.user.email.split('@')[0],
        email: cred.user.email, matric: p.matric || '', dept: p.dept || '', college: p.college || '',
        room: p.room || '', phone: p.phone || '', parentName: p.parentName || '', parentEmail: p.parentEmail || '',
        parentPhone: p.parentPhone || '', relationship: p.relationship || '',
      });
      go('student-dashboard');
    } catch (e) {
      setErr(
        e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' ? 'Incorrect email or password.' :
        e.code === 'auth/user-not-found' ? 'No account found. Please register first.' :
        'Sign-in failed: ' + e.message
      );
    }
    setLoading(false);
  }

  async function handleSignup() {
    const { surname, otherNames, matric, room, college, dept, email: se, phone, parentName, parentEmail, parentPhone, relationship, password, confirm, terms } = form;
    if (!surname || !otherNames || !matric || !room || !college || !dept || !se) return setErr('Please fill in all personal details.');
    if (!parentName || !parentEmail) return setErr('Please fill in parent / guardian details.');
    if (password.length < 8) return setErr('Password must be at least 8 characters.');
    if (password !== confirm) return setErr('Passwords do not match.');
    if (!terms) return setErr('You must agree to the terms before registering.');
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, se, password);
      await setDoc(doc(db, 'students', cred.user.uid), {
        uid: cred.user.uid, email: se, surname, otherNames, matric, room, college, dept,
        phone, parentName, parentEmail, parentPhone, relationship, createdAt: new Date().toISOString(),
      });
      await sendEmailVerification(cred.user);
      await auth.signOut();
      setView('login'); setErr('');
      setInfo('✅ Account created! Check your Inbox and Spam for the verification link. Please verify before signing in.');
    } catch (e) {
      setErr(e.code === 'auth/email-already-in-use' ? 'An account with this email already exists.' : 'Registration failed: ' + e.message);
    }
    setLoading(false);
  }

  async function resendVerification() {
    if (!email || !pass) { setErr('Enter your email and password first.'); return; }
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      await sendEmailVerification(cred.user); await auth.signOut();
      setInfo('Verification email resent! Check your inbox.');
    } catch { setErr('Could not resend — check your email and password.'); }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-left">
        <div>
          <div className="nav-logo" style={{ marginBottom: 18, width: 42, height: 42, fontSize: 12 }}>MTU</div>
          {view === 'login'
            ? <><h2>Student Sign In</h2><p>Sign in with your MTU credentials to access your exeat dashboard.</p></>
            : <><h2>Create Account</h2><p>Register once — all future logins use the email and password you set here.</p></>}
        </div>
        <div className="auth-features">
          {[['📤', 'Submit exeat requests and track every stage.'], ['🔔', 'Instant alerts when your parent or Student Affairs responds.'], ['📋', 'Full personal history of all your exeat permits.']].map(([ic, tx]) => (
            <div className="auth-feat" key={tx}><div className="af-ic">{ic}</div><div className="af-txt">{tx}</div></div>
          ))}
        </div>
        <span className="auth-footer-text">Mountain Top University · Students' Affairs Division</span>
      </div>
      {view === 'login' ? (
        <div className="auth-right">
          <h3>Sign In</h3><p>Enter your registered email and password.</p>
          {err  && <div className="err-msg">⚠️ {err}</div>}
          {info && <div className="info-msg">ℹ️ {info} {info.includes('new one') && <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={resendVerification}>Resend email</span>}</div>}
          <div className="af"><label>Email Address</label><input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr(''); setInfo(''); }} placeholder="you@gmail.com" /></div>
          <div className="af"><label>Password</label><input type="password" value={pass} onChange={e => { setPass(e.target.value); setErr(''); }} placeholder="Your password" /></div>
          <button className="auth-btn" onClick={handleLogin} disabled={loading}>{loading ? 'Signing in…' : 'Sign In →'}</button>
          <div className="auth-div"><span>New student?</span></div>
          <button className="alt-btn" onClick={() => { setView('signup'); setErr(''); setInfo(''); }}>Create your account →</button>
          <div style={{ marginTop: 14, textAlign: 'center' }}><span className="auth-link" style={{ color: 'var(--text3)', fontSize: 11 }} onClick={() => go('landing')}>← Back to portal selection</span></div>
        </div>
      ) : (
        <div className="auth-right" style={{ overflowY: 'auto' }}>
          <h3>Student Registration</h3><p>Fill in all fields accurately.</p>
          {err && <div className="err-msg">⚠️ {err}</div>}
          <div className="sg">
            {[['surname', 'Surname', 'e.g. Adeyemi'], ['otherNames', 'Other Names', 'e.g. John Emmanuel'], ['matric', 'Matric. Number', 'MTU/22/0001'], ['room', 'Room No.', 'e.g. A-204'], ['phone', 'Your Phone', '+234 800 000 0000'], ['email', 'Your Email', 'you@gmail.com']].map(([k, l, ph]) => (
              <div className="af" key={k}><label>{l}</label><input type={k === 'email' ? 'email' : k === 'phone' ? 'tel' : 'text'} value={form[k]} onChange={e => setF(k, e.target.value)} placeholder={ph} /></div>
            ))}
            <div className="af"><label>College</label><select value={form.college} onChange={e => setF('college', e.target.value)}><option value="">Select college</option><option>CBAS</option><option>CBSS</option><option>COES</option><option>CBMS</option></select></div>
            <div className="af"><label>Department</label><input type="text" value={form.dept} onChange={e => setF('dept', e.target.value)} placeholder="e.g. Computer Science" /></div>
          </div>
          <div className="sec-div">Parent / Guardian</div>
          <div className="sg">
            <div className="af"><label>Parent Full Name</label><input type="text" value={form.parentName} onChange={e => setF('parentName', e.target.value)} placeholder="e.g. Mr. Adeyemi K." /></div>
            <div className="af"><label>Relationship</label><select value={form.relationship} onChange={e => setF('relationship', e.target.value)}><option>Father</option><option>Mother</option><option>Guardian</option></select></div>
            <div className="af"><label>Parent Email</label><input type="email" value={form.parentEmail} onChange={e => setF('parentEmail', e.target.value)} placeholder="parent@gmail.com" /></div>
            <div className="af"><label>Parent Phone</label><input type="tel" value={form.parentPhone} onChange={e => setF('parentPhone', e.target.value)} placeholder="+234 800 000 0001" /></div>
          </div>
          <div className="sec-div">Set Password</div>
          <div className="sg">
            <div className="af"><label>Password</label><input type="password" value={form.password} onChange={e => setF('password', e.target.value)} placeholder="Min. 8 characters" /></div>
            <div className="af"><label>Confirm Password</label><input type="password" value={form.confirm} onChange={e => setF('confirm', e.target.value)} placeholder="Repeat password" /></div>
          </div>
          <div className="terms-row"><input type="checkbox" checked={form.terms} onChange={e => setF('terms', e.target.checked)} /><span>I confirm all information is accurate and agree to MTU's exeat portal terms.</span></div>
          <button className="auth-btn" onClick={handleSignup} disabled={loading}>{loading ? 'Creating account…' : 'Create Account & Verify Email ✉️'}</button>
          <span className="auth-link" onClick={() => { setView('login'); setErr(''); setInfo(''); }}>Already have an account? Sign in</span>
        </div>
      )}
    </div>
  );
}

/* ─── AFFAIRS LOGIN ─── */
function AffairsLogin({ go, onLogin }) {
  const [email, setEmail] = useState(''); const [pass, setPass] = useState(''); const [err, setErr] = useState('');
  function handleLogin() {
    if (email === PORTAL_CREDS.affairs.email && pass === PORTAL_CREDS.affairs.password) {
      onLogin({ role: 'affairs', name: 'Student Affairs' }); go('affairs-dashboard');
    } else { setErr('Invalid email or password.'); }
  }
  return (
    <div className="auth-wrap">
      <div className="auth-left" style={{ background: 'linear-gradient(160deg,var(--green-d) 0%,#0a5040 100%)' }}>
        <div>
          <div className="nav-logo" style={{ marginBottom: 18, width: 42, height: 42, fontSize: 12, background: 'var(--green-l)', color: 'var(--green-d)' }}>MTU</div>
          <h2>Student Affairs Portal</h2><p>Authorised Student Affairs staff only.</p>
        </div>
        <div className="auth-features">
          {[['📋', 'Review all incoming exeat requests.'], ['🔍', 'Search student records by matric number.'], ['📡', 'Real-time notifications when parent approvals arrive.']].map(([ic, tx]) => (
            <div className="auth-feat" key={tx}><div className="af-ic">{ic}</div><div className="af-txt">{tx}</div></div>
          ))}
        </div>
        <span className="auth-footer-text">Mountain Top University · Student Affairs Division</span>
      </div>
      <div className="auth-right">
        <h3>Staff Sign In</h3><p>Use your official Student Affairs credentials.</p>
        <div className="cred-hint"><strong>Demo Credentials</strong>Email: <code>affairs@mtu.edu.ng</code><br />Password: <code>Affairs@MTU2025</code></div>
        {err && <div className="err-msg">⚠️ {err}</div>}
        <div className="af"><label>Email</label><input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} placeholder="affairs@mtu.edu.ng" /></div>
        <div className="af"><label>Password</label><input type="password" value={pass} onChange={e => { setPass(e.target.value); setErr(''); }} placeholder="Enter password" /></div>
        <button className="auth-btn affairs" onClick={handleLogin}>Sign In to Student Affairs →</button>
        <div style={{ marginTop: 14, textAlign: 'center' }}><span className="auth-link" style={{ color: 'var(--text3)', fontSize: 11 }} onClick={() => go('landing')}>← Back</span></div>
      </div>
    </div>
  );
}

/* ─── CSO LOGIN ─── */
function CSOLogin({ go, onLogin }) {
  const [email, setEmail] = useState(''); const [pass, setPass] = useState(''); const [err, setErr] = useState('');
  function handleLogin() {
    if (email === PORTAL_CREDS.cso.email && pass === PORTAL_CREDS.cso.password) {
      onLogin({ role: 'cso', name: 'CSO' }); go('cso-dashboard');
    } else { setErr('Invalid credentials. Access denied.'); }
  }
  return (
    <div className="auth-wrap">
      <div className="auth-left" style={{ background: 'linear-gradient(160deg,var(--amber) 0%,#4A2800 100%)' }}>
        <div>
          <div className="nav-logo" style={{ marginBottom: 18, width: 42, height: 42, fontSize: 12, background: 'var(--amber-l)', color: 'var(--amber)' }}>CSO</div>
          <h2>CSO Portal</h2><p>Restricted to the Chief Security Officer.</p>
        </div>
        <div className="auth-features">
          {[['🛡', 'Final approval authority for all exeat permits.'], ['✅', 'Only review requests cleared by Student Affairs.'], ['🗂', 'Full session log of all CSO decisions.']].map(([ic, tx]) => (
            <div className="auth-feat" key={tx}><div className="af-ic">{ic}</div><div className="af-txt">{tx}</div></div>
          ))}
        </div>
        <span className="auth-footer-text">Mountain Top University · Office of the CSO</span>
      </div>
      <div className="auth-right">
        <h3>CSO Sign In</h3><p>Enter your CSO credentials.</p>
        <div className="cred-hint"><strong>Demo Credentials</strong>Email: <code>cso@mtu.edu.ng</code><br />Password: <code>CSO1795MTU</code></div>
        {err && <div className="err-msg">⚠️ {err}</div>}
        <div className="af"><label>Email</label><input type="email" value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} placeholder="cso@mtu.edu.ng" /></div>
        <div className="af"><label>Password</label><input type="password" value={pass} onChange={e => { setPass(e.target.value); setErr(''); }} placeholder="Enter password" /></div>
        <button className="auth-btn cso" onClick={handleLogin}>Sign In to CSO Portal →</button>
        <div style={{ marginTop: 14, textAlign: 'center' }}><span className="auth-link" style={{ color: 'var(--text3)', fontSize: 11 }} onClick={() => go('landing')}>← Back</span></div>
      </div>
    </div>
  );
}

/* ─── EXEAT PROGRESS TRACKER (with timestamps) ─── */
function ExeatTracker({ exeat }) {
  const steps = [
    { key: 'submitted', label: 'Submitted',     time: exeat.createdAt },
    { key: 'parent',    label: 'Parent Consent', time: exeat.parentActionAt },
    { key: 'affairs',   label: 'Affairs Review', time: exeat.affairsActionAt },
    { key: 'cso',       label: 'CSO Approval',   time: exeat.csoActionAt },
  ];

  function getStepState(key) {
    const s = exeat.status;
    if (key === 'submitted') return 'done';
    if (key === 'parent') {
      if (s === 'awaiting-parent') return 'active';
      if (['awaiting-affairs', 'awaiting-cso', 'cso-approved', 'approved', 'declined'].includes(s)) return 'done';
      return 'pending';
    }
    if (key === 'affairs') {
      if (s === 'awaiting-affairs') return 'active';
      if (['awaiting-cso', 'cso-approved', 'approved'].includes(s)) return 'done';
      return 'pending';
    }
    if (key === 'cso') {
      if (s === 'awaiting-cso') return 'active';
      if (['cso-approved', 'approved'].includes(s)) return 'done';
      return 'pending';
    }
    return 'pending';
  }

  return (
    <div className="track-bar">
      {steps.map((st, i) => {
        const state = getStepState(st.key);
        return (
          <div key={st.key} className={`track-step ${state}`}>
            <div className="ts-circle">{state === 'done' ? '✓' : state === 'active' ? '●' : i + 1}</div>
            <div className="ts-lbl">{st.label}</div>
            {st.time && state === 'done' && <div className="ts-time">{fmtDate(st.time)}</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ─── STUDENT DASHBOARD ─── */
function StudentDashboard({ go, user }) {
  const [exeats, setExeats]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('dashboard');
  const [modal, setModal]     = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'exeats'), where('studentUid', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setExeats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user?.uid]);

  const pending = exeats.filter(e => !['cso-approved', 'approved', 'declined'].includes(e.status));
  const history = exeats;

  if (tab === 'pending') return (
    <>
      <div className="stu-head">
        <div className="stu-info">
          <div className="avatar">{initials(user?.name)}</div>
          <div><h2>{user?.name} <span className="active-pill">Active</span></h2><p>{user?.matric} · {user?.dept} · {user?.college} · Room {user?.room}</p></div>
        </div>
        <button className="btn-sec" onClick={() => setTab('dashboard')}>← Dashboard</button>
      </div>
      <div className="spanel">
        <h4>⏳ Pending Exeats ({pending.length})</h4>
        {loading && <div className="spinner" />}
        {!loading && pending.length === 0 && <div className="empty-state"><div style={{ fontSize: 32 }}>✅</div><p>No pending exeats. All requests have been resolved.</p></div>}
        {pending.map(e => (
          <div key={e.id} className="exeat-card">
            <div className="exeat-card-head">
              <div>
                <div className="ec-ref">{e.refNo}</div>
                <div className="ec-title" style={{ marginTop: 8 }}>{e.purpose} — {e.reason?.slice(0, 60)}{e.reason?.length > 60 ? '…' : ''}</div>
                <div className="ec-meta">{fmtDate(e.exitDate)} → {fmtDate(e.returnDate)}</div>
              </div>
              <StatusBadge type={e.status} />
            </div>
            <ExeatTracker exeat={e} />
            <div className="ec-detail">
              <div className="ec-d-item"><label>Submitted</label><span>{fmtDateTime(e.createdAt)}</span></div>
              <div className="ec-d-item"><label>Parent Consent</label><span>{e.parentStatus === 'approved' ? `✓ ${fmtDate(e.parentActionAt)}` : e.parentStatus === 'declined' ? '✗ Declined' : '⏳ Awaiting'}</span></div>
              <div className="ec-d-item"><label>Affairs Review</label><span>{e.affairsStatus === 'approved' ? `✓ ${fmtDate(e.affairsActionAt)}` : e.affairsStatus === 'declined' ? '✗ Declined' : '⏳ Awaiting'}</span></div>
              <div className="ec-d-item"><label>CSO Decision</label><span>{e.csoStatus === 'approved' ? `✓ ${fmtDate(e.csoActionAt)}` : e.csoStatus === 'declined' ? '✗ Declined' : '⏳ Awaiting'}</span></div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  if (tab === 'history') return (
    <>
      <div className="stu-head">
        <div className="stu-info">
          <div className="avatar">{initials(user?.name)}</div>
          <div><h2>{user?.name}</h2><p>{user?.matric} · {user?.dept}</p></div>
        </div>
        <button className="btn-sec" onClick={() => setTab('dashboard')}>← Dashboard</button>
      </div>
      {modal && (
        <div className="modal-bg" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            <h3>{modal.refNo}</h3>
            <StatusBadge type={modal.status} />
            <ExeatTracker exeat={modal} />
            <div className="modal-sect">Exit Details</div>
            {[['Purpose', modal.purpose], ['Reason', modal.reason], ['Exit Date', fmtDate(modal.exitDate)], ['Return Date', fmtDate(modal.returnDate)]].map(([k, v]) => (
              <div className="modal-row" key={k}><span className="modal-key">{k}</span><span className="modal-val">{v}</span></div>
            ))}
            <div className="modal-sect">Approval Trail &amp; Timestamps</div>
            <div className="ts-timeline">
              {[
                { label: 'Submitted',       status: 'done',                          time: modal.createdAt },
                { label: 'Parent Consent',  status: modal.parentStatus || 'pending',  time: modal.parentActionAt },
                { label: 'Affairs Review',  status: modal.affairsStatus || 'pending', time: modal.affairsActionAt },
                { label: 'CSO Decision',    status: modal.csoStatus || 'pending',     time: modal.csoActionAt },
              ].map(r => (
                <div className="ts-row" key={r.label}>
                  <div className={`ts-dot ${r.status === 'approved' || r.status === 'done' ? 'ts-dot-done' : 'ts-dot-pnd'}`} />
                  <span className="ts-label">{r.label}</span>
                  <span className="ts-val">{r.time ? fmtDateTime(r.time) : '—'}</span>
                  {r.status !== 'done' && r.status !== 'pending' && <StatusBadge type={r.status} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="spanel">
        <h4>📋 My Exeat Records ({history.length})</h4>
        {loading && <div className="spinner" />}
        {!loading && history.length === 0 && <div className="empty-state"><div style={{ fontSize: 32 }}>📭</div><p>No exeat records yet.</p></div>}
        {!loading && (
          <table className="stable">
            <thead><tr><th>Reference</th><th>Purpose</th><th>Exit Date</th><th>Return</th><th>Submitted</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {history.map(e => (
                <tr key={e.id} onClick={() => setModal(e)}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--mtu)' }}>{e.refNo}</span></td>
                  <td><div style={{ fontWeight: 600 }}>{e.purpose}</div><div style={{ fontSize: 11, color: 'var(--text2)' }}>{e.reason?.slice(0, 40)}{e.reason?.length > 40 ? '…' : ''}</div></td>
                  <td style={{ color: 'var(--text2)' }}>{fmtDate(e.exitDate)}</td>
                  <td style={{ color: 'var(--text2)' }}>{fmtDate(e.returnDate)}</td>
                  <td style={{ color: 'var(--text2)', fontSize: 11 }}>{fmtDateTime(e.createdAt)}</td>
                  <td><StatusBadge type={e.status} /></td>
                  <td><button className="pgbtn" onClick={ev => { ev.stopPropagation(); setModal(e); }}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );

  return (
    <>
      <div className="stu-head">
        <div className="stu-info">
          <div className="avatar">{initials(user?.name)}</div>
          <div>
            <h2>{user?.name || 'Student'} <span className="active-pill">Active</span></h2>
            <p>{user?.matric || '—'} · {user?.dept || '—'} · {user?.college || '—'} · Room {user?.room || '—'}</p>
          </div>
        </div>
        <div className="head-meta"><div className="hm-count">My Exeat Portal</div><div className="hm-sess">Session 2024/2025</div></div>
      </div>
      <div className="action-grid">
        <div className="ac" onClick={() => go('exeat-form')}>
          <div className="ac-ic ic-p">➕</div>
          <h4>Request New Exeat</h4>
          <p>Submit a new exeat permit with parent consent and track every approval stage.</p>
          <div className="ac-link" style={{ color: 'var(--mtu)' }}>Start request →</div>
        </div>
        <div className="ac" onClick={() => setTab('pending')}>
          <div className="ac-ic ic-a">⏳</div>
          <h4>Pending Exeats</h4>
          <p>Track exeats awaiting parent, Student Affairs, or CSO approval.</p>
          {loading ? <div style={{ marginTop: 14 }}><span className="sbadge sb-pnd">Loading…</span></div> :
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="sbadge sb-pnd">{pending.length} pending</span>
              <span className="ac-link" style={{ color: 'var(--amber)', margin: 0 }}>View all →</span>
            </div>
          }
        </div>
        <div className="ac" onClick={() => setTab('history')}>
          <div className="ac-ic ic-g">📋</div>
          <h4>My Exeat Records</h4>
          <p>Full history of all your approved, pending and declined exeat permits.</p>
          {loading ? <div style={{ marginTop: 14 }}><span className="sbadge sb-pnd">Loading…</span></div> :
            <div className="ac-link" style={{ color: 'var(--green-d)', marginTop: 14 }}>View {exeats.length} records →</div>
          }
        </div>
      </div>
      <div className="hist">
        <h4>📌 Parent / Guardian on File</h4>
        <div className="ex-row">
          <div>
            <div className="ex-pur">{user?.parentName || 'Not set'} ({user?.relationship || '—'})</div>
            <div className="ex-met">{user?.parentEmail || '—'} · {user?.parentPhone || '—'}</div>
          </div>
          <span className="sbadge sb-ok">On file</span>
        </div>
        <div className="ex-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <div><div className="ex-pur">Your email</div><div className="ex-met">{user?.email || '—'}</div></div>
          <span className="sbadge sb-ok">Verified ✓</span>
        </div>
      </div>
    </>
  );
}

/* ─── EXEAT FORM ─── */
function ExeatForm({ go, user }) {
  const [consent, setConsent]     = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState('');
  const [exitDate, setExitDate]   = useState('');
  const [returnDate, setReturn]   = useState('');
  const [purpose, setPurpose]     = useState('Unofficial');
  const [reason, setReason]       = useState('');
  const [refNo] = useState(() => `EX-2025-${Math.floor(1000 + Math.random() * 9000)}`);

  async function handleSubmit() {
    if (!exitDate || !returnDate) return setErr('Please select exit and return dates.');
    if (new Date(returnDate) < new Date(exitDate)) return setErr('Return date cannot be before exit date.');
    if (!reason.trim()) return setErr('Please describe the reason for your exit.');
    if (!user?.parentEmail) return setErr('No parent email on file. Please contact Student Affairs.');
    setLoading(true); setErr('');
    try {
      const now = new Date().toISOString();
      const exeatDoc = {
        refNo, studentUid: user.uid, studentName: user.name, matricNo: user.matric,
        department: `${user.dept} · ${user.college}`, college: user.college, dept: user.dept,
        roomNo: user.room, exitDate, returnDate, purpose, reason,
        parentName: user.parentName, parentEmail: user.parentEmail, parentPhone: user.parentPhone,
        status: 'awaiting-parent', parentStatus: 'pending', affairsStatus: 'pending', csoStatus: 'pending',
        createdAt: now, // consistent ISO string — no serverTimestamp() to avoid hydration diffs
      };
      const docRef = doc(collection(db, 'exeats'));
      await setDoc(docRef, { ...exeatDoc, exeatId: docRef.id });

      const res = await fetch('/api/send-consent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refNo, studentName: user.name, matricNo: user.matric,
          department: `${user.dept} · ${user.college}`, roomNo: user.room,
          exitDate, returnDate, purpose, reason,
          parentName: user.parentName, parentEmail: user.parentEmail,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Email sending failed');
      setSubmitted(true);
      setTimeout(() => go('student-dashboard'), 3500);
    } catch (e) { setErr('Submission failed: ' + e.message); }
    setLoading(false);
  }

  return (
    <>
      <div className="form-head">
        <div><h2>Exeat Permit Application</h2><p>Students' Affairs Division · Mountain Top University</p></div>
        <div className="ref-pill"><div className="ref-lbl">Reference No.</div><div className="ref-val">{refNo}</div></div>
      </div>
      {submitted && (
        <div className="success-banner">
          <span style={{ fontSize: 26 }}>✅</span>
          <p><strong>Exeat request submitted successfully!</strong><br />
            A consent email has been sent to {user?.parentName} at {user?.parentEmail}. Redirecting…</p>
        </div>
      )}
      <div className="form-card">
        <div className="form-sec">Personal Information</div>
        <div className="form-grid">
          <div className="ff"><label>Full Name</label><input readOnly value={user?.name || ''} style={{ background: 'var(--surf2)' }} /></div>
          <div className="ff"><label>Matric. Number</label><input readOnly value={user?.matric || ''} style={{ background: 'var(--surf2)' }} /></div>
          <div className="ff"><label>College</label><input readOnly value={user?.college || ''} style={{ background: 'var(--surf2)' }} /></div>
          <div className="ff"><label>Department</label><input readOnly value={user?.dept || ''} style={{ background: 'var(--surf2)' }} /></div>
          <div className="ff"><label>Room No.</label><input readOnly value={user?.room || ''} style={{ background: 'var(--surf2)' }} /></div>
        </div>
        <div className="form-sec">Exit Details</div>
        <div className="form-grid">
          <div className="ff"><label>Date of Exit</label><input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} /></div>
          <div className="ff"><label>Date of Return</label><input type="date" value={returnDate} onChange={e => setReturn(e.target.value)} /></div>
        </div>
        <div className="ff" style={{ marginBottom: 20 }}>
          <label>Purpose of Exit</label>
          <div className="radio-grp">
            <label className="radio-opt"><input type="radio" name="purpose" value="Official" checked={purpose === 'Official'} onChange={() => setPurpose('Official')} /> Official</label>
            <label className="radio-opt"><input type="radio" name="purpose" value="Unofficial" checked={purpose === 'Unofficial'} onChange={() => setPurpose('Unofficial')} /> Unofficial</label>
          </div>
        </div>
        <div className="ff" style={{ marginBottom: 24 }}>
          <label>Reason(s) for Exit</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Describe your reason in full detail — where you are going and why." />
        </div>
        <div className="form-sec">Student Declaration</div>
        <div className="ff" style={{ marginBottom: 22 }}>
          <label>Full Legal Name (digital signature)</label>
          <input readOnly value={user?.name || ''} style={{ background: 'var(--surf2)' }} />
        </div>
        <div className="ptoggle">
          <div className="ptoggle-lbl">
            <p>👨‍👩‍👧 Send to Parent / Guardian for Consent</p>
            <span>Your parent receives an email link to approve or decline before this proceeds to Student Affairs.</span>
          </div>
          <button className={`toggle-sw${consent ? '' : ' off'}`} style={{ background: consent ? 'var(--mtu)' : undefined }} onClick={() => setConsent(c => !c)} />
        </div>
        {consent && user?.parentEmail && (
          <div className="consent-box">
            <strong>✉️ Consent email will be sent to:</strong>
            {user.parentName} ({user.relationship}) &nbsp;·&nbsp; {user.parentEmail} &nbsp;·&nbsp; {user.parentPhone}
            <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, display: 'block' }}>Parent clicks approve/decline in their email → automatically forwarded to Student Affairs.</span>
          </div>
        )}
        {err && <div className="err-msg">⚠️ {err}</div>}
        <div className="form-actions">
          <button className="btn-sec" onClick={() => go('student-dashboard')}>Cancel</button>
          <button className="btn-pri" onClick={handleSubmit} disabled={loading || submitted || !consent}>
            {loading ? 'Sending…' : submitted ? 'Submitted ✓' : 'Submit & Send for Parent Consent ✈️'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── EXEAT MODAL ─── */
function ExeatModal({ exeat, onClose, actions }) {
  if (!exeat) return null;
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3>Exeat — {exeat.refNo}</h3>
        <div style={{ marginTop: 8 }}><StatusBadge type={exeat.status} /></div>
        <ExeatTracker exeat={exeat} />
        <div className="modal-sect">Student Information</div>
        {[['Name', exeat.studentName], ['Matric No.', exeat.matricNo], ['Department', exeat.department], ['Room', exeat.roomNo]].map(([k, v]) => (
          <div className="modal-row" key={k}><span className="modal-key">{k}</span><span className="modal-val">{v || '—'}</span></div>
        ))}
        <div className="modal-sect">Exit Details</div>
        {[['Purpose', exeat.purpose], ['Reason', exeat.reason], ['Exit Date', fmtDate(exeat.exitDate)], ['Return Date', fmtDate(exeat.returnDate)]].map(([k, v]) => (
          <div className="modal-row" key={k}><span className="modal-key">{k}</span><span className="modal-val">{v || '—'}</span></div>
        ))}
        <div className="modal-sect">Parent / Guardian</div>
        {[['Name', exeat.parentName], ['Email', exeat.parentEmail], ['Phone', exeat.parentPhone]].map(([k, v]) => (
          <div className="modal-row" key={k}><span className="modal-key">{k}</span><span className="modal-val">{v || '—'}</span></div>
        ))}
        <div className="modal-sect">Approval Trail &amp; Timestamps</div>
        <div className="ts-timeline">
          {[
            { label: 'Submitted',      status: 'done',                           time: exeat.createdAt },
            { label: 'Parent Consent', status: exeat.parentStatus || 'pending',   time: exeat.parentActionAt },
            { label: 'Affairs Review', status: exeat.affairsStatus || 'pending',  time: exeat.affairsActionAt },
            { label: 'CSO Decision',   status: exeat.csoStatus || 'pending',      time: exeat.csoActionAt },
          ].map(r => (
            <div className="ts-row" key={r.label}>
              <div className={`ts-dot ${r.status === 'approved' || r.status === 'done' ? 'ts-dot-done' : 'ts-dot-pnd'}`} />
              <span className="ts-label">{r.label}</span>
              <span className="ts-val">{r.time ? fmtDateTime(r.time) : '—'}</span>
            </div>
          ))}
        </div>
        {actions && <div className="modal-acts">{actions}</div>}
      </div>
    </div>
  );
}

/* ─── SORTABLE COLUMN HEADER ─── */
function SortTh({ label, field, sort, onSort }) {
  const active = sort.field === field;
  return (
    <th
      className={`sortable${active ? ` sort-${sort.dir}` : ''}`}
      onClick={() => onSort(field)}
    >{label}</th>
  );
}

/* ─── AFFAIRS DASHBOARD ─── */
function AffairsDashboard() {
  const [exeats, setExeats]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFStat]  = useState('All');
  const [filterCollege, setFColl] = useState('All');
  const [filterDept, setFDept]    = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [sort, setSort]           = useState({ field: 'createdAt', dir: 'desc' });
  const [modal, setModal]         = useState(null);
  const [tab, setTab]             = useState('records');
  const [page, setPage]           = useState(0);
  const PAGE_SIZE = 8;

  useEffect(() => {
    const q = query(collection(db, 'exeats'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setExeats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  function handleSort(field) {
    setSort(s => ({ field, dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc' }));
    setPage(0);
  }

  const stats = {
    total:    exeats.length,
    pending:  exeats.filter(e => ['awaiting-parent', 'awaiting-affairs'].includes(e.status)).length,
    approved: exeats.filter(e => ['awaiting-cso', 'cso-approved', 'approved'].includes(e.status)).length,
    declined: exeats.filter(e => e.status === 'declined').length,
  };

  const notifications = exeats
    .filter(e => e.status === 'awaiting-affairs')
    .map(e => ({ type: 'new', title: `Parent approved — ${e.studentName}`, meta: `${e.matricNo} · pending review`, exeat: e }))
    .concat(exeats.filter(e => e.status === 'awaiting-cso').map(e => ({
      type: 'done', title: `Forwarded to CSO — ${e.studentName}`, meta: `${e.matricNo}`, exeat: e,
    })));

  // unique depts for filter dropdown
  const allDepts = [...new Set(exeats.map(e => e.dept).filter(Boolean))].sort();

  const filtered = exeats.filter(e => {
    const s = (search || '').toLowerCase();
    const matchSearch = !s || e.studentName?.toLowerCase().includes(s) || e.matricNo?.toLowerCase().includes(s) || e.dept?.toLowerCase().includes(s);
    const matchStatus = filterStatus === 'All' || (
      filterStatus === 'Pending'  ? ['awaiting-parent', 'awaiting-affairs'].includes(e.status) :
      filterStatus === 'Approved' ? ['awaiting-cso', 'cso-approved', 'approved'].includes(e.status) :
      filterStatus === 'Declined' ? e.status === 'declined' : true
    );
    const matchCollege = filterCollege === 'All' || e.college === filterCollege;
    const matchDept    = !filterDept || e.dept?.toLowerCase().includes(filterDept.toLowerCase());
    const exitTs = e.exitDate ? new Date(e.exitDate).getTime() : null;
    const matchFrom = !dateFrom || (exitTs && exitTs >= new Date(dateFrom).getTime());
    const matchTo   = !dateTo   || (exitTs && exitTs <= new Date(dateTo).getTime());
    return matchSearch && matchStatus && matchCollege && matchDept && matchFrom && matchTo;
  });

  // client-side sort
  const sorted = [...filtered].sort((a, b) => {
    let av = a[sort.field], bv = b[sort.field];
    if (sort.field === 'exitDate' || sort.field === 'createdAt') {
      av = av ? new Date(av).getTime() : 0;
      bv = bv ? new Date(bv).getTime() : 0;
    } else {
      av = (av || '').toString().toLowerCase();
      bv = (bv || '').toString().toLowerCase();
    }
    return sort.dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const pageCount = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function clearFilters() {
    setSearch(''); setFStat('All'); setFColl('All'); setFilterDept(''); setDateFrom(''); setDateTo(''); setPage(0);
  }
  function setFilterDept(v) { setFDept(v); setPage(0); }

  async function forwardToCSO(exeat) {
    await updateDoc(doc(db, 'exeats', exeat.id), {
      status: 'awaiting-cso', affairsStatus: 'approved', affairsActionAt: new Date().toISOString(),
    });
    setModal(null);
  }
  async function declineExeat(exeat) {
    await updateDoc(doc(db, 'exeats', exeat.id), {
      status: 'declined', affairsStatus: 'declined', affairsActionAt: new Date().toISOString(),
    });
    setModal(null);
  }

  function statusType(s) {
    if (['awaiting-parent', 'awaiting-affairs'].includes(s)) return 'pending';
    if (['awaiting-cso', 'cso-approved', 'approved'].includes(s)) return 'approved';
    if (s === 'declined') return 'declined';
    return 'pending';
  }

  const hasFilters = search || filterStatus !== 'All' || filterCollege !== 'All' || filterDept || dateFrom || dateTo;

  return (
    <>
      {modal && (
        <ExeatModal exeat={modal} onClose={() => setModal(null)} actions={
          modal.status === 'awaiting-affairs' ? (
            <>
              <button className="btn-sec" style={{ flex: 1 }} onClick={() => declineExeat(modal)}>✗ Decline</button>
              <button className="btn-pri" style={{ flex: 1, background: 'var(--green-d)' }} onClick={() => forwardToCSO(modal)}>✓ Forward to CSO</button>
            </>
          ) : null
        } />
      )}
      <div className="portal-head green">
        <div><h2>Student Affairs Dashboard</h2><p>Students' Affairs Division · Exeat Management &amp; Records</p></div>
        <div className="notif-pill" onClick={() => setTab(t => t === 'notifications' ? 'records' : 'notifications')}>
          {notifications.filter(n => n.type === 'new').length > 0 && <span className="nav-dot" />}
          <span>{notifications.filter(n => n.type === 'new').length} new notifications</span>
        </div>
      </div>

      <div className="stats-row">
        {[
          { n: stats.total,    l: 'Total This Session', c: 'var(--text)',  f: 'All' },
          { n: stats.pending,  l: 'Pending Review',      c: 'var(--amber)', f: 'Pending' },
          { n: stats.approved, l: 'Forwarded/Approved',  c: 'var(--green)', f: 'Approved' },
          { n: stats.declined, l: 'Declined',             c: 'var(--red)',   f: 'Declined' },
        ].map(s => (
          <div className={`stat${filterStatus === s.f ? ' active' : ''}`} key={s.l} onClick={() => { setFStat(s.f); setTab('records'); setPage(0); }}>
            <div className="stat-n" style={{ color: s.c }}>{s.n}</div>
            <div className="stat-l">{s.l}</div>
          </div>
        ))}
      </div>

      {tab === 'notifications' ? (
        <div className="npanel">
          <h4>🔔 Live Notifications <span className="nav-dot" /></h4>
          {loading && <div className="spinner" />}
          {!loading && notifications.length === 0 && <div className="empty-state"><p>No notifications at this time.</p></div>}
          {notifications.map((n, i) => (
            <div key={i} className={`ni ${n.type === 'new' ? 'ni-new' : 'ni-done'}`}>
              <div className="ni-t">{n.title}</div>
              <div className="ni-m">{n.meta}</div>
              {n.type === 'new' && (
                <div className="ni-acts">
                  <button className="ni-btn rev" onClick={() => { setModal(n.exeat); setTab('records'); }}>Review Now</button>
                  <button className="ni-btn" onClick={() => setTab('records')}>Dismiss</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="sa-grid">
          <div className="spanel">
            <h4>Student Exeat Records</h4>

            {/* Search */}
            <div className="sbar">
              <input
                type="text"
                placeholder="Search by name, matric, or department…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
              />
              <button onClick={() => setSearch('')}>✕</button>
            </div>

            {/* Filters row */}
            <div className="frow">
              <label>College</label>
              <select className="fsel" value={filterCollege} onChange={e => { setFColl(e.target.value); setPage(0); }}>
                <option>All</option><option>CBAS</option><option>CBSS</option><option>COES</option><option>CBMS</option>
              </select>

              <label>Status</label>
              <select className="fsel" value={filterStatus} onChange={e => { setFStat(e.target.value); setPage(0); }}>
                <option>All</option><option>Pending</option><option>Approved</option><option>Declined</option>
              </select>

              <label>Dept</label>
              <select className="fsel" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                <option value="">All</option>
                {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              <label>Exit from</label>
              <input className="fdate" type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} />

              <label>to</label>
              <input className="fdate" type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} />

              {hasFilters && <button className="clear-btn" onClick={clearFilters}>✕ Clear</button>}
            </div>

            {loading && <div className="spinner" />}
            {!loading && sorted.length === 0 && <div className="empty-state"><p>No records match your filters.</p></div>}
            {!loading && sorted.length > 0 && (
              <>
                <table className="stable">
                  <thead>
                    <tr>
                      <SortTh label="Student"    field="studentName" sort={sort} onSort={handleSort} />
                      <SortTh label="Matric No." field="matricNo"    sort={sort} onSort={handleSort} />
                      <SortTh label="Department" field="dept"        sort={sort} onSort={handleSort} />
                      <SortTh label="Exit Date"  field="exitDate"    sort={sort} onSort={handleSort} />
                      <SortTh label="Submitted"  field="createdAt"   sort={sort} onSort={handleSort} />
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map(e => (
                      <tr key={e.id} onClick={() => setModal(e)}>
                        <td><div className="sn">{e.studentName}</div><div className="sd">{e.college}</div></td>
                        <td style={{ color: 'var(--text2)' }}>{e.matricNo}</td>
                        <td style={{ color: 'var(--text2)' }}>{e.dept}</td>
                        <td style={{ color: 'var(--text2)' }}>{fmtDate(e.exitDate)}</td>
                        <td style={{ color: 'var(--text2)', fontSize: 11 }}>{fmtDateTime(e.createdAt)}</td>
                        <td><StatusBadge type={statusType(e.status)} /></td>
                        <td><button className="pgbtn" onClick={ev => { ev.stopPropagation(); setModal(e); }}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="tfoot">
                  <span>Showing {paged.length} of {sorted.length} records{hasFilters ? ' (filtered)' : ''}</span>
                  <div className="pgbtns">
                    <button className="pgbtn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
                    <span style={{ fontSize: 12, padding: '0 4px', color: 'var(--text2)' }}>{page + 1} / {pageCount || 1}</span>
                    <button className="pgbtn" onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>Next →</button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="npanel">
            <h4>🔔 Notifications <span className="nav-dot" /></h4>
            {loading && <div style={{ fontSize: 12, color: 'var(--text3)' }}>Loading…</div>}
            {!loading && notifications.length === 0 && <div style={{ fontSize: 12, color: 'var(--text2)' }}>No notifications.</div>}
            {notifications.slice(0, 6).map((n, i) => (
              <div key={i} className={`ni ${n.type === 'new' ? 'ni-new' : 'ni-done'}`}>
                <div className="ni-t">{n.title}</div>
                <div className="ni-m">{n.meta}</div>
                {n.type === 'new' && (
                  <div className="ni-acts">
                    <button className="ni-btn rev" onClick={() => setModal(n.exeat)}>Review Now</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ─── CSO DASHBOARD ─── */
function CSODashboard() {
  const [exeats, setExeats]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [tab, setTab]         = useState('queue');

  useEffect(() => {
    const q = query(collection(db, 'exeats'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setExeats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const queue    = exeats.filter(e => e.status === 'awaiting-cso');
  const approved = exeats.filter(e => ['cso-approved', 'approved'].includes(e.status));
  const referred = exeats.filter(e => e.status === 'referred');
  const total    = exeats.filter(e => !['awaiting-parent', 'awaiting-affairs'].includes(e.status));

  const stats = [
    { n: queue.length,    l: 'Pending Your Approval', c: 'var(--amber)', t: 'queue' },
    { n: approved.length, l: 'Approved This Session',  c: 'var(--green)', t: 'approved' },
    { n: referred.length, l: 'Referred Back',           c: 'var(--red)',   t: 'all' },
    { n: total.length,    l: 'Total Processed',         c: 'var(--mtu)',   t: 'all' },
  ];

  async function approveExeat(exeat) {
    await updateDoc(doc(db, 'exeats', exeat.id), {
      status: 'cso-approved', csoStatus: 'approved', csoActionAt: new Date().toISOString(),
    });
    setModal(null);
  }
  async function referExeat(exeat) {
    await updateDoc(doc(db, 'exeats', exeat.id), {
      status: 'referred', csoStatus: 'declined', csoActionAt: new Date().toISOString(),
    });
    setModal(null);
  }

  const displayList = tab === 'queue' ? queue : tab === 'approved' ? approved : total;

  return (
    <>
      {modal && (
        <ExeatModal exeat={modal} onClose={() => setModal(null)} actions={
          modal.status === 'awaiting-cso' ? (
            <>
              <button className="btn-sec" style={{ flex: 1, color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => referExeat(modal)}>↩ Refer Back</button>
              <button className="btn-pri" style={{ flex: 1, background: 'var(--green-d)' }} onClick={() => approveExeat(modal)}>✓ Approve Exeat</button>
            </>
          ) : null
        } />
      )}
      <div className="portal-head amber">
        <div><h2>CSO — Final Approval Portal</h2><p>Chief Security Officer · Exeat Clearance Queue</p></div>
        <div className="cso-badge"><span>{queue.length} awaiting final approval</span></div>
      </div>
      <div className="stats-row">
        {stats.map(s => (
          <div className={`stat${tab === s.t && s.t !== 'all' ? ' active' : ''}`} key={s.l} onClick={() => setTab(s.t)}>
            <div className="stat-n" style={{ color: s.c }}>{s.n}</div>
            <div className="stat-l">{s.l}</div>
          </div>
        ))}
      </div>
      <div className="cso-q">
        <h4>
          {tab === 'queue'    && <>Exeat Approval Queue <span className="q-sub">All have parent consent &amp; Affairs clearance</span></>}
          {tab === 'approved' && <>Recently Approved by CSO</>}
          {tab === 'all'      && <>All Processed Exeats</>}
        </h4>
        {loading && <div className="spinner" />}
        {!loading && displayList.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: 32 }}>{tab === 'queue' ? '🎉' : '📭'}</div>
            <p>{tab === 'queue' ? 'No exeats pending your approval.' : 'No records here yet.'}</p>
          </div>
        )}
        {!loading && displayList.map((q, i) => {
          const { bg, cl } = avatarColors(i);
          return (
            <div className="qi" key={q.id}>
              <div className="q-av" style={{ background: bg, color: cl }}>{initials(q.studentName)}</div>
              <div style={{ flex: 1 }}>
                <div className="q-name">{q.studentName}</div>
                <div className="q-meta">{q.matricNo} · {q.department} · Exit: {fmtDate(q.exitDate)} – {fmtDate(q.returnDate)}</div>
                <div className="q-rsn">Reason: {q.reason?.slice(0, 100)}{q.reason?.length > 100 ? '…' : ''}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
                  Submitted: {fmtDateTime(q.createdAt)}
                  {q.affairsActionAt && ` · Affairs cleared: ${fmtDateTime(q.affairsActionAt)}`}
                </div>
                <div className="flow-bs">
                  <span className="fb fb-p">✓ Parent Approved</span>
                  <span className="fb fb-a">✓ Affairs Cleared</span>
                  {['cso-approved', 'approved'].includes(q.status)
                    ? <span className="fb fb-ok">✓ CSO Approved</span>
                    : q.status === 'referred'
                      ? <span className="fb" style={{ background: 'var(--red-l)', color: 'var(--red)' }}>↩ Referred</span>
                      : <span className="fb fb-c">CSO Pending</span>
                  }
                </div>
              </div>
              <div className="q-acts">
                <button className="qa-v" onClick={() => setModal(q)}>👁 View</button>
                {q.status === 'awaiting-cso' && <button className="qa-a" onClick={() => approveExeat(q)}>✓ Approve</button>}
                {['cso-approved', 'approved'].includes(q.status) && <span className="sbadge sb-ok">Approved</span>}
                {q.status === 'referred' && <span className="sbadge sb-dcl">Referred</span>}
              </div>
            </div>
          );
        })}
      </div>
      {tab === 'approved' && approved.length > 0 && (
        <div className="rec-card">
          <h4>CSO Approval Log</h4>
          {approved.map(r => (
            <div className="rr" key={r.id}>
              <div><span className="rr-n">{r.studentName}</span><span className="rr-m"> · {r.matricNo}</span></div>
              <div className="rr-r">
                {fmtDateTime(r.csoActionAt || r.createdAt)}
                <span className="sbadge sb-ok">✓ CSO Approved</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ─── ROOT ─── */
export default function App() {
  const [page, setPage]         = useState('landing');
  const [session, setSession]   = useState(null);
  // FIX: Read query params client-side only, after mount, to avoid hydration mismatch
  const [consentMsg, setConsent] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Restore student session on refresh via Firebase onAuthStateChanged
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.emailVerified) {
        // Only restore student sessions (staff use simple password auth, no persistence needed)
        try {
          const snap = await getDoc(doc(db, 'students', firebaseUser.uid));
          if (snap.exists()) {
            const p = snap.data();
            const restored = {
              role: 'student', uid: firebaseUser.uid,
              name: `${p.surname || ''} ${p.otherNames || ''}`.trim() || firebaseUser.email.split('@')[0],
              email: firebaseUser.email, matric: p.matric || '', dept: p.dept || '', college: p.college || '',
              room: p.room || '', phone: p.phone || '', parentName: p.parentName || '',
              parentEmail: p.parentEmail || '', parentPhone: p.parentPhone || '', relationship: p.relationship || '',
            };
            setSession(restored);
            setPage('student-dashboard');
          }
        } catch { /* silently fail — user goes to landing */ }
      }
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // Read consent query param safely after mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cm = params.get('consent');
    if (cm) setConsent(cm);
  }, []);

  function handleLogin(info)  { setSession(info); }
  function handleLogout()     {
    auth.signOut().catch(() => {});
    setSession(null);
    setPage('landing');
  }

  // 5-minute inactivity logout
  const warnInactive = useInactivityLogout(!!session, handleLogout);

  if (!authReady) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <NavBar />
        <div className="page"><div className="spinner" /></div>
      </>
    );
  }

  function renderPage() {
    switch (page) {
      case 'landing':           return <Landing go={setPage} consentMsg={consentMsg} />;
      case 'student-login':     return <StudentLogin go={setPage} onLogin={handleLogin} />;
      case 'affairs-login':     return <AffairsLogin go={setPage} onLogin={handleLogin} />;
      case 'cso-login':         return <CSOLogin go={setPage} onLogin={handleLogin} />;
      case 'student-dashboard': return <StudentDashboard go={setPage} user={session} />;
      case 'exeat-form':        return <ExeatForm go={setPage} user={session} />;
      case 'affairs-dashboard': return <AffairsDashboard />;
      case 'cso-dashboard':     return <CSODashboard />;
      default:                  return <Landing go={setPage} consentMsg={consentMsg} />;
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {warnInactive && (
        <div className="inactivity-bar">
          ⚠️ You will be signed out in 60 seconds due to inactivity. Move your mouse or press a key to stay signed in.
        </div>
      )}
      <NavBar role={session?.role} user={session?.name} onLogout={handleLogout} />
      <div className="page">{renderPage()}</div>
    </>
  );
}