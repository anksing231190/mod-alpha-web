/* Synthetic demonstration data only. Never use these figures as actual fund performance. */
window.MOD_ALPHA_DATA = {
  asOf: '30 Oct 2026',
  funds: [
    {id:'MA001',name:'Aurora Flexi Cap Fund - Direct Growth',short:'Aurora Flexi Cap',amc:'Aurora Mutual Fund',category:'Flexi Cap',type:'Equity',plan:'Direct',option:'Growth',nav:84.62,returns:{1:18.4,3:16.8,5:19.2,10:15.7},risk:'Very High',aum:'₹18,420 Cr',benchmark:'Nifty 500 TRI',inception:'2012-06-18',vol:14.2},
    {id:'MA002',name:'Pioneer Large Cap Fund - Direct Growth',short:'Pioneer Large Cap',amc:'Pioneer Mutual Fund',category:'Large Cap',type:'Equity',plan:'Direct',option:'Growth',nav:156.38,returns:{1:14.2,3:15.1,5:16.3,10:13.8},risk:'Very High',aum:'₹24,810 Cr',benchmark:'Nifty 100 TRI',inception:'2008-03-11',vol:12.8},
    {id:'MA003',name:'Summit Midcap Opportunities - Direct Growth',short:'Summit Midcap',amc:'Summit Investments',category:'Mid Cap',type:'Equity',plan:'Direct',option:'Growth',nav:112.74,returns:{1:22.8,3:19.6,5:21.4,10:17.1},risk:'Very High',aum:'₹9,760 Cr',benchmark:'Nifty Midcap 150 TRI',inception:'2010-09-23',vol:18.9},
    {id:'MA004',name:'Evergreen Short Duration Fund - Direct Growth',short:'Evergreen Short Duration',amc:'Evergreen Mutual Fund',category:'Short Duration',type:'Debt',plan:'Direct',option:'Growth',nav:28.16,returns:{1:7.2,3:7.5,5:6.9,10:7.4},risk:'Low to Moderate',aum:'₹6,540 Cr',benchmark:'CRISIL Short Duration Debt A-II Index',inception:'2015-01-12',vol:2.1},
    {id:'MA005',name:'Horizon Balanced Advantage - Direct Growth',short:'Horizon Balanced Advantage',amc:'Horizon Mutual Fund',category:'Dynamic Asset Allocation',type:'Hybrid',plan:'Direct',option:'Growth',nav:42.91,returns:{1:12.6,3:13.9,5:13.1,10:11.8},risk:'Moderately High',aum:'₹12,360 Cr',benchmark:'Nifty 50 Hybrid Composite Debt 50:50',inception:'2013-07-05',vol:8.7},
    {id:'MA006',name:'Aurora Flexi Cap Fund - Regular Growth',short:'Aurora Flexi Cap (Regular)',amc:'Aurora Mutual Fund',category:'Flexi Cap',type:'Equity',plan:'Regular',option:'Growth',nav:79.48,returns:{1:17.1,3:15.5,5:17.8,10:14.4},risk:'Very High',aum:'₹18,420 Cr',benchmark:'Nifty 500 TRI',inception:'2012-06-18',vol:14.6},
    {id:'MA007',name:'Pioneer Large Cap Fund - Direct IDCW',short:'Pioneer Large Cap IDCW',amc:'Pioneer Mutual Fund',category:'Large Cap',type:'Equity',plan:'Direct',option:'IDCW',nav:62.13,returns:{1:13.6,3:14.4,5:15.2,10:12.9},risk:'Very High',aum:'₹4,110 Cr',benchmark:'Nifty 100 TRI',inception:'2011-02-17',vol:12.9},
    {id:'MA008',name:'Summit Corporate Bond Fund - Direct Growth',short:'Summit Corporate Bond',amc:'Summit Investments',category:'Corporate Bond',type:'Debt',plan:'Direct',option:'Growth',nav:31.85,returns:{1:8.1,3:7.8,5:7.4,10:7.7},risk:'Moderate',aum:'₹8,240 Cr',benchmark:'Nifty Corporate Bond Index',inception:'2014-04-09',vol:2.8},
    {id:'MA009',name:'Horizon Small Cap Fund - Direct Growth',short:'Horizon Small Cap',amc:'Horizon Mutual Fund',category:'Small Cap',type:'Equity',plan:'Direct',option:'Growth',nav:68.42,returns:{1:25.3,3:21.7,5:23.6,10:18.2},risk:'Very High',aum:'₹7,920 Cr',benchmark:'Nifty Smallcap 250 TRI',inception:'2011-11-21',vol:21.3},
    {id:'MA010',name:'Evergreen Aggressive Hybrid - Direct Growth',short:'Evergreen Aggressive Hybrid',amc:'Evergreen Mutual Fund',category:'Aggressive Hybrid',type:'Hybrid',plan:'Direct',option:'Growth',nav:51.72,returns:{1:15.8,3:14.9,5:15.6,10:12.6},risk:'Very High',aum:'₹5,780 Cr',benchmark:'Nifty 50 Hybrid Composite 65:35',inception:'2016-05-16',vol:10.4}
  ],
  navSeries: [100,101.4,99.8,103.2,105.1,104.6,108.7,110.3,109.5,114.2,117.8,116.9,121.4,124.8,123.6,129.2,132.5,131.8,137.1,141.6,140.2,145.8,149.4,154.1],
  categories: ['Large Cap','Flexi Cap','Mid Cap','Small Cap','Debt','Hybrid'],
  sipDate: {month:'November 2026',date:12,status:'Published for demo',published:'28 Oct 2026',version:'DEMO-v1.0'},
  users: [
    {id:'U-10021',name:'Aarav Mehta',email:'aarav@example.com',joined:'22 Oct 2026',status:'Active',kyc:'Verified',plan:'Annual Plus',sub:'Active'},
    {id:'U-10022',name:'Diya Sharma',email:'diya@example.com',joined:'21 Oct 2026',status:'Active',kyc:'Pending',plan:'Free',sub:'Free'},
    {id:'U-10023',name:'Kabir Rao',email:'kabir@example.com',joined:'19 Oct 2026',status:'Active',kyc:'Not started',plan:'Quarterly',sub:'Active'},
    {id:'U-10024',name:'Meera Iyer',email:'meera@example.com',joined:'18 Oct 2026',status:'Suspended',kyc:'Verified',plan:'Monthly',sub:'Past due'},
    {id:'U-10025',name:'Rohan Das',email:'rohan@example.com',joined:'16 Oct 2026',status:'Active',kyc:'In review',plan:'Free',sub:'Free'}
  ],
  plans:[{name:'Free',price:0,period:'Free',tagline:'Basic features to get started',features:['Access to 50+ funds','Basic charts','1 AI query per day']},{name:'Pro',price:299,period:'Monthly',tagline:'For serious investors',features:['Access to 250+ funds','Advanced analytics','10 AI questions a day (200 a month)','Historical SIP comparisons','Email support']},{name:'Premium',price:499,period:'Monthly',tagline:'For power users',features:['Everything in Pro','Custom analytics reports','Priority support','Early access to new features']}],
  insights:[{tag:'CATEGORY WATCH',title:'Mid-cap category shows wider return dispersion',body:'The data shows a wider spread between top and median mid-cap fund returns over the selected period. Compare risk and benchmark context before drawing conclusions.',time:'Today · 09:30 AM'},{tag:'SIP DATE NOTE',title:'November reminder date is published',body:'The platform-wide reminder date is 12 November 2026. It is a reminder only; no investment instruction or transaction is created.',time:'28 Oct 2026'},{tag:'DATA QUALITY',title:'NAV data refreshed',body:'The latest NAV data has been validated and published.',time:'27 Oct 2026'}]
};

/* v22: reference-screen fund catalogue (illustrative values only — not live data or performance claims). */
(function(){
  const D=window.MOD_ALPHA_DATA;
  const ref=[
    {id:'QSC01',name:'Quant Small Cap Fund',short:'Quant Small Cap',amc:'Quant Mutual Fund',category:'Small Cap',type:'Equity',plan:'Direct',option:'Growth',nav:425.60,returns:{1:18.2,3:24.8,5:32.4,10:21.6},sharpe:2.1,riskLabel:'Low',since2021:4.256,risk:'Very High',aum:'₹24,620 Cr',benchmark:'Nifty Smallcap 250 TRI',inception:'2013-01-01',vol:19.4,icon:'trophy',color:'#f4b72f'},
    {id:'SBC02',name:'SBI Contra Fund',short:'SBI Contra',amc:'SBI Mutual Fund',category:'Contra',type:'Equity',plan:'Direct',option:'Growth',nav:388.12,returns:{1:16.4,3:22.1,5:28.1,10:18.9},sharpe:1.8,riskLabel:'Moderate',risk:'Very High',aum:'₹41,830 Cr',benchmark:'BSE 500 TRI',inception:'2013-01-01',vol:15.2,icon:'mark',color:'#2f86f6'},
    {id:'HMC03',name:'HDFC Mid-Cap Opportunities Fund',short:'HDFC Mid Cap',amc:'HDFC Mutual Fund',category:'Mid Cap',type:'Equity',plan:'Direct',option:'Growth',nav:196.48,returns:{1:15.9,3:21.4,5:26.8,10:19.2},sharpe:1.7,riskLabel:'Moderate',risk:'Very High',aum:'₹79,720 Cr',benchmark:'Nifty Midcap 150 TRI',inception:'2013-01-01',vol:16.8,icon:'mark',color:'#ef3340'},
    {id:'PPF04',name:'Parag Parikh Flexi Cap Fund',short:'Parag Parikh Flexi Cap',amc:'PPFAS Mutual Fund',category:'Flexi Cap',type:'Equity',plan:'Direct',option:'Growth',nav:92.37,returns:{1:14.8,3:19.6,5:24.1,10:18.4},sharpe:1.9,riskLabel:'Low',risk:'Very High',aum:'₹98,540 Cr',benchmark:'Nifty 500 TRI',inception:'2013-05-24',vol:11.9,icon:'mark',color:'#16c784'},
    {id:'AXM05',name:'Axis Midcap 150 Fund',short:'Axis Midcap 150',amc:'Axis Mutual Fund',category:'Large Cap',type:'Equity',plan:'Direct',option:'Growth',nav:118.05,returns:{1:13.7,3:18.2,5:22.3,10:17.0},sharpe:1.5,riskLabel:'Moderate',risk:'Very High',aum:'₹31,260 Cr',benchmark:'Nifty Midcap 150 TRI',inception:'2013-01-01',vol:15.6,icon:'mark',color:'#b42ee8'}
  ];
  const extra=[
    ['NSE06','Nova Small Cap Fund','Small Cap','Equity',21.9],['MRC07','Meridian Bluechip Fund','Large Cap','Equity',17.2],['CTF08','Crest Tax Saver Fund','ELSS','Equity',19.8],
    ['ORI09','Orion Nifty 50 Index Fund','Index','Equity',15.1],['VRT10','Vertex Flexi Cap Fund','Flexi Cap','Equity',18.6],['ATL11','Atlas Balanced Advantage Fund','Hybrid','Hybrid',13.4],
    ['SLV12','Silverline ELSS Fund','ELSS','Equity',17.9],['KST13','Keystone Midcap Fund','Mid Cap','Equity',20.4],['HZN14','Zenith Nifty Next 50 Index','Index','Equity',16.2]
  ].map(([id,name,category,type,r5],i)=>({id,name,short:name.replace(/ Fund$/,''),amc:name.split(' ')[0]+' Mutual Fund',category,type,plan:'Direct',option:'Growth',nav:40+i*13.7,returns:{1:+(r5*0.7).toFixed(1),3:+(r5*0.85).toFixed(1),5:r5,10:+(r5*0.8).toFixed(1)},sharpe:+(1.1+(i%4)*0.15).toFixed(1),riskLabel:['Moderate','Low','Moderate','High'][i%4],risk:'Very High',aum:'₹'+(4200+i*1310).toLocaleString('en-IN')+' Cr',benchmark:'Nifty 500 TRI',inception:'2014-01-01',vol:12+i*.6,icon:'mark',color:['#2f86f6','#16c784','#b42ee8','#f4b72f','#ef3340'][i%5]}));
  D.funds=[...ref,...D.funds.map(f=>Object.assign({},f,{returns:Object.assign({},f.returns,{5:Math.min(f.returns[5],21.8)})})).map((f,i)=>Object.assign({sharpe:+(1.2+(i%4)*0.12).toFixed(1),riskLabel:f.risk.split(' ')[0],icon:'mark',color:['#2f86f6','#16c784','#b42ee8','#f4b72f','#ef3340'][i%5]},f)),...extra];
  D.categories=['Equity','Small Cap','Mid Cap','Large Cap','Flexi Cap','Contra','Hybrid','Index','ELSS','Debt'];
})();
