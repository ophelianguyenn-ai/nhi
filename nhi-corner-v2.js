/* Nhi's Learning Corner 2.0 — progressive, real-data UI, no demo grades. */
(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const P=()=>window.NHI_PLAN_V2;
const KEY='nhi-v2-learning-metrics-v1',EXAMPLE='nhi-v2-saved-examples-v1';
const GRAMMAR='nhi-v2-grammar-notes-v1';
const patterns=[
 {name:'-아/어야 합니다',meaning:'Phải làm / nghĩa vụ',rx:/(?:아야|어야|해야)\s*합니다/},
 {name:'-(으)면 됩니다',meaning:'Chỉ cần làm là được',rx:/(?:으면|면)\s*됩니다/},
 {name:'-(으)려고 합니다',meaning:'Dự định làm',rx:/(?:려고|으려고)\s*합니다/},
 {name:'-고 있습니다',meaning:'Đang thực hiện',rx:/고\s*있습니다/},
 {name:'-기 전에',meaning:'Trước khi làm',rx:/기\s*전에/},
 {name:'-기 때문에',meaning:'Bởi vì / do',rx:/기\s*때문에/},
 {name:'-(으)ㄹ 예정입니다',meaning:'Dự kiến sẽ',rx:/(?:을|ㄹ)\s*예정입니다/}
];
const scenarios=[
 ['Giao ca','교대 근무를 인계하겠습니다.','Tôi sẽ bàn giao ca làm việc.'],
 ['Báo lỗi thiết bị','설비에서 이상 소음이 발생했습니다.','Thiết bị phát ra tiếng ồn bất thường.'],
 ['Báo cáo tiến độ','작업 진행 상황을 보고드리겠습니다.','Tôi xin báo cáo tiến độ công việc.'],
 ['Xin phê duyệt','검토 후 승인 부탁드립니다.','Sau khi xem xét, mong anh/chị phê duyệt.'],
 ['An toàn lao động','작업 전에 안전 상태를 확인하겠습니다.','Tôi sẽ kiểm tra an toàn trước khi làm việc.'],
 ['QC · chất lượng','품질 검사 결과를 공유드리겠습니다.','Tôi xin chia sẻ kết quả kiểm tra chất lượng.'],
 ['Trao đổi bản vẽ','수정된 도면을 확인 부탁드립니다.','Nhờ anh/chị kiểm tra bản vẽ đã sửa.']
];
let panel='',noteTab='grammar',term='',scope='lesson',sourceLesson='',scenario=0;
let voice=null,recorder=null,audioChunks=[],recordUrl='',transcript='',answerRevealed=false;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const data=()=>P()?.snapshot?.()||{lessons:[],items:[],active:false,syncEnabled:false};
function read(k,def){try{const v=JSON.parse(localStorage.getItem(k));return v==null?def:v}catch(e){return def}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){status('Trình duyệt không còn đủ dung lượng lưu dữ liệu. Hãy xuất bản sao lưu trước.');return false}}
function clean(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()}
function date(s){if(!s)return '—';const p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0]}
function status(s){let x=$('#nhiV2Toast');if(!x){x=document.createElement('div');x.id='nhiV2Toast';x.setAttribute('role','status');document.body.appendChild(x);}x.textContent=s;x.hidden=false;clearTimeout(status.t);status.t=setTimeout(()=>x.hidden=true,3400);}
function button(action,text,cls='ghost'){return '<button type="button" class="'+cls+'" data-v2-act="'+esc(action)+'">'+esc(text)+'</button>'}
function pageTitle(t,sub=''){return '<div class="nhi-v2-title"><h2>'+esc(t)+'</h2>'+ (sub?'<p>'+esc(sub)+'</p>':'')+'</div>'}
function setPanel(next){
 panel=next||'';document.body.classList.toggle('nhi-v2-panel-active',!!panel);
 const wrap=$('#nhiV2Workspace');if(!wrap)return;
 wrap.hidden=!panel;$$('.nhi-v2-top [data-v2-nav]').forEach(b=>b.setAttribute('aria-current',b.dataset.v2Nav===panel?'page':'false'));
 if(panel){renderPanel();window.scrollTo({top:0,behavior:'smooth'});}
}
function route(next){
 if(next==='chat'){setPanel('');window.NLC_AI?.open();return}
 if(next==='today'||next==='calendar'){
  setPanel('');const btn=$('#tab-plan');if(btn)btn.click();
  P()?.setView?.(next==='today'?'home':'days');
  return;
 }
 if(['notebook','errors','progress','search','practice','speak','settings','listen','threads'].includes(next)){
  setPanel(next);return;
 }
 const button=$('#tab-'+next);if(button){setPanel('');button.click();}
}
function firstLesson(){const d=data();return d.lessons.find(x=>x.status==='today')||d.lessons.find(x=>x.status==='late')||d.lessons[0]||null;}
function visibleItems(){const d=data(),l=d.lessons.find(x=>x.id===sourceLesson)||firstLesson();return scope==='all'?d.items:(l?d.items.filter(it=>l.ids.includes(it.id)):d.items);}
function renderPanel(){
 const out=$('#nhiV2Workspace');if(!out)return;
 if(panel==='search')out.innerHTML=renderSearch();
 else if(panel==='notebook'||panel==='errors')out.innerHTML=renderNotebook();
 else if(panel==='progress')out.innerHTML=renderProgress();
 else if(panel==='practice')out.innerHTML=renderPractice();
 else if(panel==='listen'||panel==='speak')out.innerHTML=renderListenSpeak();
 else if(panel==='threads')out.innerHTML=renderThreads();
 else if(panel==='settings')out.innerHTML=renderSettings();
 else out.textContent='';
}
function renderSearch(){
 const d=data();const matches=d.items.filter(it=>{
  const l=d.lessons.find(x=>x.id===it.lesson);
  return !term||[it.ko,it.vi,it.note,it.topic,l&&l.title].some(x=>clean(x).includes(clean(term)));
 });
 return pageTitle('🔎 Tìm kiếm toàn bộ','Tìm đồng thời Hàn, Việt, ghi chú và chủ đề; mở đúng thẻ.')
   +'<label class="nhi-v2-search-field"><span>🔎</span><input id="nhiV2SearchInput" type="search" autocomplete="off" value="'+esc(term)+'" placeholder="Nhập từ, câu, ghi chú hoặc chủ đề…"></label>'
   +'<p class="nhi-v2-hint">'+matches.length+' kết quả'+(!term?' · Gõ để tìm':'')+'</p>'
   +matches.slice(0,45).map(it=>{
     const l=d.lessons.find(x=>x.id===it.lesson);
     return '<article class="nhi-v2-surface"><strong lang="ko">'+esc(it.ko)+'</strong><p>'+esc(it.vi)+'</p>'
       +(it.note?'<small>'+esc(it.note.slice(0,120))+'</small>':'')
       +'<small>Bài: '+esc(l&&l.title||it.topic)+' · '+esc(it.topic)+'</small>'
       +button('open-item:'+it.id,'Mở đúng thẻ','ghost')+'</article>';
   }).join('')+(matches.length>45?'<p class="nhi-v2-hint">Hiện 45 kết quả đầu. Hãy nhập cụ thể hơn.</p>':'');
}
function renderNotebook(){
 const d=data(),history=read(KEY,{ratings:[]}).ratings||[];
 const hard=d.items.filter(it=>it.hard||it.rate==='hard'||history.filter(h=>h.id===it.id&&h.grade==='hard').length>=2);
 const saved=read(EXAMPLE,[]);
 let html=pageTitle(panel==='errors'?'🧠 Lỗi sai của tôi':'📝 Sổ tay của Nhi','Gắn trực tiếp với từ và câu Hàn–Việt đã học.');
 html+='<div class="nhi-v2-pills">'+[['grammar','Ngữ pháp'],['errors','Lỗi sai ('+hard.length+')'],['examples','Ví dụ đã lưu']].map(x=>button('note-tab:'+x[0],x[1],noteTab===x[0]?'primary':'ghost')).join('')+'</div>';
 if(panel==='errors')noteTab='errors';
 if(noteTab==='errors'){
   html+='<div class="nhi-v2-surface"><strong>Ôn thêm thẻ thường quên</strong><p>Ôn tự nguyện không làm thay đổi lịch hoàn thành 5 lượt.</p>'+button('practice-hard','▶ Luyện thẻ khó','primary')+'</div>';
   if(!hard.length)html+='<p class="nhi-v2-hint">Chưa có thẻ đánh dấu Khó hoặc lặp lại nhiều lần. Đây là dữ liệu thật, chưa tự tạo lỗi sai.</p>';
   hard.slice(0,50).forEach(it=>{
     const n=history.filter(h=>h.id===it.id&&h.grade==='hard').length;
     html+='<article class="nhi-v2-surface"><div class="nhi-v2-tag">Khó'+(n?' · '+n+' lần':'')+'</div>'
     +'<strong lang="ko">'+esc(it.ko)+'</strong><p>'+esc(it.vi)+'</p>'
     +button('open-item:'+it.id,'Xem thẻ')+' '+button('ask-error:'+it.id,'Phân tích vì sao dễ nhầm')+'</article>';
   });
 }else if(noteTab==='examples'){
   if(!saved.length)html+='<p class="nhi-v2-hint">Chưa lưu ví dụ. Bấm ＋ cạnh một cặp Hàn–Việt trong chat để lưu vào đây.</p>';
   saved.slice().reverse().slice(0,60).forEach((e,i)=>{
     html+='<article class="nhi-v2-surface"><strong lang="ko">'+esc(e.ko)+'</strong><p>'+esc(e.vi)+'</p>'
       +button('make-card:'+esc(e.id),'＋ Tạo thẻ')+'</article>';
   });
 }else{
   html+='<p class="nhi-v2-hint">Các mẫu dưới đây chỉ được đánh dấu đã học khi có câu phù hợp trong dữ liệu của bạn đã được ôn.</p>';
   patterns.forEach((g,i)=>{
    const related=d.items.filter(it=>it.type==='s'&&g.rx.test(it.ko));
    const learned=related.filter(it=>it.known||it.rate==='known');
    html+='<article class="nhi-v2-surface"><div class="nhi-v2-between"><strong lang="ko">'+esc(g.name)+'</strong><span class="nhi-v2-tag">'+learned.length+' đã thuộc / '+related.length+' câu</span></div>'
     +'<p>'+esc(g.meaning)+'</p>'
     +(related.length?'<p lang="ko">'+esc(related[0].ko)+'</p><p>'+esc(related[0].vi)+'</p>'
     +button('open-item:'+related[0].id,'Mở câu liên quan'):'<small>Chưa tìm thấy câu tương ứng trong học phần.</small>')
     +'<textarea data-v2-grammar="'+i+'" rows="2" placeholder="Ghi chú cá nhân tự lưu khi rời ô…">'+esc((read(GRAMMAR,{})[g.name])||'')+'</textarea>'
     +button('ask-grammar:'+i,'Giải thích bằng AI')+'</article>';
   });
 }
 return html;
}
function renderProgress(){
 const d=data(),m=read(KEY,{ratings:[],minutes:{}}),ratings=m.ratings||[],minutes=m.minutes||{};
 const last7=[],today=new Date();for(let i=6;i>=0;i--){let x=new Date(today);x.setDate(today.getDate()-i);let k=x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');last7.push({day:k,min:Math.round((minutes[k]||0)/60)});}
 const nmin=last7.reduce((a,x)=>a+x.min,0),first=ratings.filter(x=>x.first),remember=first.filter(x=>x.grade==='known').length;
 const answered=ratings.filter(x=>x.grade==='mid'||x.grade==='known').length;
 const accuracy=ratings.length?Math.round(answered/ratings.length*100):null;
 const hard=d.items.filter(it=>it.hard||it.rate==='hard').length;
 const grammat=patterns.filter(g=>d.items.some(it=>it.type==='s'&&g.rx.test(it.ko)&&(it.known||it.rate==='known'))).length;
 return pageTitle('📈 Tiến độ học tập','Số liệu được ghi nhận thật từ khi bật phiên bản này; không có điểm XP hay bảng xếp hạng.')
 +'<div class="nhi-v2-metrics">'+[
  [nmin+' phút','Trong 7 ngày'],[first.length?remember+'/'+first.length:'—','Nhớ ngay lần đầu'],
  [hard,'Thẻ còn khó'],[accuracy==null?'—':accuracy+'%','Đánh giá Vừa / Dễ']
 ].map(x=>'<div class="nhi-v2-metric"><strong>'+esc(x[0])+'</strong><span>'+esc(x[1])+'</span></div>').join('')+'</div>'
 +'<section class="nhi-v2-surface"><h3>Thời gian thực học theo ngày</h3><div class="nhi-v2-bars">'+last7.map(x=>'<div><span style="height:'+Math.max(3,Math.min(100,x.min*4))+'%"></span><small>'+esc(x.day.slice(8))+'</small><small>'+x.min+'p</small></div>').join('')+'</div></section>'
 +'<section class="nhi-v2-surface"><b>Ngữ pháp đã gặp và thuộc: '+grammat+'/'+patterns.length+' cấu trúc</b><p>Lượt học nhỏ hoàn thành: '+read('nhi-v2-batches-v1',[]).length+'</p>'
 +button('note-tab:grammar','Xem sổ ngữ pháp','primary')+'</section>'
 +'<p class="nhi-v2-hint">Các bài học trước ngày nâng cấp không có nhật ký số phút hoặc lần trả lời đầu tiên, nên không được tự suy đoán số liệu quá khứ.</p>';
}
function renderPractice(){
 const d=data(),l=d.lessons.find(x=>x.id===sourceLesson)||firstLesson();
 return pageTitle('🧩 Luyện tập','Chọn chế độ và xác nhận nguồn dữ liệu trước khi bắt đầu.')
 +'<section class="nhi-v2-surface"><label>Học với</label><div class="nhi-v2-pills">'
 +button('scope:lesson','Bài hiện tại',scope==='lesson'?'primary':'ghost')
 +button('scope:all','Toàn bộ học phần',scope==='all'?'primary':'ghost')+'</div>'
 +'<label for="nhiV2LessonSelect">Bài học</label><select id="nhiV2LessonSelect">'
 +d.lessons.map(x=>'<option value="'+esc(x.id)+'"'+(l&&x.id===l.id?' selected':'')+'>'+esc(x.title)+'</option>').join('')+'</select>'
 +'<p class="nhi-v2-hint">Nguồn: '+(scope==='all'?'Toàn bộ học phần · '+d.items.length+' thẻ':esc(l&&l.title||'Bài hiện tại')+' · '+(l&&l.total||0)+' thẻ')+'</p></section>'
 +'<div class="nhi-v2-practice-grid">'+[
  ['flash','📇 Flashcard · 10 thẻ / lượt'],['write','✍️ Viết'],['quiz','🧩 Trắc nghiệm'],['test','📋 Kiểm tra'],['listen','🎧 Nghe không nhìn chữ'],['speak','🎤 Nói và thu âm'],['dialog','🗣️ Hội thoại công việc'],['match','🧩 Ghép thẻ']
 ].map(x=>button('mode:'+x[0],x[1],'ghost')).join('')+'</div>'
 +'<p class="nhi-v2-hint">Các chế độ cũ giữ nguyên. Flashcard theo bài lưu lượt học 10 thẻ; chỉ hoàn tất toàn bài mới tính lịch ôn.</p>';
}
function renderListenSpeak(){
 const items=visibleItems();const it=items[0];
 const select=items.slice(0,80).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.vi.slice(0,90))+'</option>').join('');
 return pageTitle(panel==='listen'?'🎧 Nghe không nhìn chữ':'🎤 Luyện nói tiếng Hàn',
 panel==='listen'?'Nghe trước, tự gõ lại rồi mới hiện chữ.':'Thu âm và nghe lại câu của chính bạn, đối chiếu với giọng mẫu.')
 +'<section class="nhi-v2-surface"><label for="nhiV2ListenSelect">Chọn câu trong dữ liệu thật</label><select id="nhiV2ListenSelect">'+select+'</select>'
 +'<div class="nhi-v2-practice-buttons">'+button('sample-audio','🔊 Nghe câu mẫu','primary')
 +(panel==='speak'?button('record-toggle',recorder&&recorder.state==='recording'?'⏹ Dừng thu':'🎤 Thu âm','ghost'):'')+'</div>'
 +(recordUrl?'<audio controls src="'+esc(recordUrl)+'"></audio>':'')
 +'<textarea id="nhiV2Answer" rows="3" placeholder="'+(panel==='speak'?'Lời nhận dạng bằng giọng nói (nếu trình duyệt hỗ trợ)…':'Gõ câu tiếng Hàn nghe được…')+'">'+esc(transcript)+'</textarea>'
 +'<div class="nhi-v2-practice-buttons">'+button('reveal','Hiện câu mẫu / So sánh','ghost')
 +(panel==='speak'?button('speech-text','Nhận dạng lời nói','ghost'):'')+'</div>'
 +(answerRevealed&&it?'<div class="nhi-v2-answer"><p lang="ko">'+esc(it.ko)+'</p><p>'+esc(it.vi)+'</p></div>':'')
 +'<p class="nhi-v2-hint">Nhận dạng văn bản chỉ giúp kiểm tra nội dung, không phải điểm phát âm. Không chấm độ chính xác phát âm nếu chưa có hệ thống chuyên dụng.</p></section>'
 +'<section class="nhi-v2-surface"><h3>🗣️ Hội thoại tình huống nhà máy</h3><div class="nhi-v2-scenarios">'
 +scenarios.map((x,i)=>button('scenario:'+i,x[0],i===scenario?'primary':'ghost')).join('')+'</div>'
 +'<p lang="ko"><b>'+esc(scenarios[scenario][1])+'</b></p><p>'+esc(scenarios[scenario][2])+'</p>'
 +'<div class="nhi-v2-practice-buttons">'+button('ask-scenario','Bắt đầu hội thoại với AI','primary')
 +button('save-scenario','＋ Lưu câu mẫu làm thẻ','ghost')+'</div></section>';
}
function renderThreads(){
 const threads=window.NLC_AI?.history?.()||[];
 return pageTitle('💬 Lịch sử hội thoại','Được lưu trên trình duyệt này. Chỉ lưu nội dung hội thoại, không lưu khóa API.')
 +button('new-thread','＋ Hội thoại mới','primary')
 +(threads.length?threads.map(t=>'<article class="nhi-v2-surface nhi-v2-between"><div><b>'+esc(t.title)+'</b><small>'+new Date(t.updated).toLocaleDateString('vi-VN')+' · '+t.count+' tin</small></div>'
 +button('thread:'+t.id,'Mở')+button('rename-thread:'+t.id,'✎')+'</article>').join(''):'<p class="nhi-v2-hint">Chưa có hội thoại đã lưu. Mở Hỏi AI để bắt đầu.</p>');
}
function renderSettings(){
 const d=data(),sync=d.syncEnabled;
 return pageTitle('⚙️ Cài đặt dễ dùng','Các cài đặt gốc vẫn được giữ lại; API và đồng bộ đặt trong Nâng cao.')
 +'<section class="nhi-v2-surface"><h3>🌸 Cơ bản</h3>'
 +button('open-settings','Giọng đọc, tốc độ, sáng/tối, cỡ chữ','primary')
 +button('export-progress','Xuất tiến độ','ghost')
 +button('backup-all','Xuất toàn bộ JSON trên thiết bị','ghost')
 +'<p>✓ Tự lưu trên thiết bị hiện tại</p>'
 +'<p>'+(sync?'✓ Đã bật đồng bộ · Xem thời gian cập nhật trong bảng đồng bộ':'○ Chưa bật đồng bộ')+'</p>'
 +'<small>Tự lưu không có nghĩa là tự đồng bộ. Để dùng nhiều thiết bị, cần bật đồng bộ và thiết lập địa chỉ dữ liệu.</small></section>'
 +'<details class="nhi-v2-surface"><summary>🛠 Cài đặt nâng cao</summary><p>Cỡ chữ riêng, chiều cao thẻ, đồng bộ Firebase, khóa API, khôi phục và xử lý xung đột.</p>'
 +button('open-settings','Mở cài đặt nâng cao')+button('restore-check','Kiểm tra tệp sao lưu trước khi khôi phục')+'</details>'
 +'<p class="nhi-v2-hint">Nên xuất bản sao lưu trước khi xóa hoặc nhập đè dữ liệu. Không nên sửa đồng thời cùng một thẻ trên hai thiết bị khi chưa đồng bộ xong.</p>';
}
function nav(){
 const old=$('#nhiV2TopNav');if(old)return;
 const bar=document.createElement('nav');bar.id='nhiV2TopNav';bar.className='nhi-v2-top';
 bar.setAttribute('aria-label','Điều hướng chính');
 const opts=[['today','🏠 Hôm nay'],['calendar','🗓 Lịch học'],['practice','🧩 Luyện tập'],['notebook','📒 Sổ tay'],['progress','📈 Tiến độ'],['search','🔎 Tìm kiếm'],['chat','💬 Hỏi AI']];
 opts.forEach(x=>{const b=document.createElement('button');b.type='button';b.dataset.v2Nav=x[0];b.textContent=x[1];b.addEventListener('click',()=>route(x[0]));bar.appendChild(b);});
 const header=$('#topbar');header.after(bar);
 const workspace=document.createElement('section');workspace.id='nhiV2Workspace';workspace.hidden=true;workspace.setAttribute('aria-live','polite');
 $('#app').insertBefore(workspace,$('#app').firstChild);
 const menu=$('#menuList');if(menu){
  const group=document.createElement('details');group.className='nhi-v2-menu-group';
  const summary=document.createElement('summary');summary.textContent='🧩 Luyện tập · Mở các chế độ';group.appendChild(summary);
  ['cards','write','test','match','quiz','list','words','sets'].forEach(x=>{const b=$('#tab-'+x);if(b)group.appendChild(b);});
  menu.insertBefore(group,menu.querySelector('hr'));
  [['today','🏠 Hôm nay'],['calendar','🗓 Lịch học'],['notebook','📒 Sổ tay'],['progress','📈 Tiến độ'],['search','🔎 Tìm kiếm'],['speak','🎤 Luyện nói']].forEach(x=>{
   const b=document.createElement('button');b.type='button';b.textContent=x[1];
   b.addEventListener('click',()=>{$('#menuBtn')?.click();route(x[0]);});
   menu.insertBefore(b,group);
  });
  $('#tab-plan').textContent='🏠 Trang Hôm nay / Lịch học';
 }
 const history=document.createElement('button');history.type='button';history.className='iconbtn sm nhi-v2-chat-history';
 history.textContent='☷';history.title='Lịch sử hội thoại có tên';history.setAttribute('aria-label','Lịch sử hội thoại');
 history.addEventListener('click',()=>{$('#aiClose')?.click();route('threads')});
 $('#aiPanel .aihead')?.insertBefore(history,$('#aiCfgBtn'));
}
function updateSource(){
 const p=$('#modeHead');if(!p||document.body.classList.contains('nhi-v2-panel-active'))return;
 const t=$('#modeTitle')?.textContent||'';
 if(!t||t==='Lịch học')return;
 let b=$('#nhiV2Source');if(!b){b=document.createElement('p');b.id='nhiV2Source';p.appendChild(b);}
 const deck=$('#decks [aria-pressed="true"]')||$('#decks .active'),source=deck?.textContent?.trim()||'Bộ đang chọn';
 const value=t+' · Bộ: '+source+' · Luyện từ học phần hiện tại';
 if(b.textContent!==value)b.textContent=value;
}
function hookSettings(){
 const sheet=$('#setSheet .sheetbox');if(!sheet||$('#nhiV2SettingsTabs'))return;
 const row=document.createElement('div');row.id='nhiV2SettingsTabs';row.className='nhi-v2-pills';
 row.innerHTML='<button type="button" class="primary" data-stab="basic">🌸 Cơ bản</button><button type="button" class="ghost" data-stab="advanced">⚙️ Nâng cao</button>';
 sheet.querySelector('.sheethead')?.after(row);
 sheet.classList.add('nhi-v2-settings-basic');
 row.addEventListener('click',e=>{const b=e.target.closest('[data-stab]');if(!b)return;
  sheet.classList.toggle('nhi-v2-settings-basic',b.dataset.stab==='basic');
  sheet.classList.toggle('nhi-v2-settings-advanced',b.dataset.stab==='advanced');
  row.querySelectorAll('button').forEach(x=>x.className=x===b?'primary':'ghost');
 });
 const foot=$('#footNote');if(foot)foot.textContent='Tự lưu trên thiết bị này. Đồng bộ giữa các máy cần được bật và thiết lập riêng. Hãy sao lưu trước khi xóa dữ liệu.';
}
function exampleFrom(text){
 const t=String(text||'').replace(/[＋✓🎧]/g,'').trim();
 const m=t.match(/([가-힣][^\n()（）]{1,130}[.?!。]?)\s*[\(（]([^()（）\n]{2,170})[\)）]/);
 if(!m||!/[a-zA-ZÀ-ỹ]/.test(m[2]))return null;
 let ko=m[1].replace(/^[0-9.\-*•\s]+/,'').trim(),vi=m[2].trim();
 if(ko.length>160||vi.length>175)return null;
 return {ko,vi};
}
function attachExamples(){
 const log=$('#aiLog');if(!log)return;
 log.querySelectorAll('.nhi-ai-paragraph').forEach(p=>{
  if(p.dataset.v2Checked)return;p.dataset.v2Checked='1';
  const text=p.querySelector('.nhi-ai-paragraph-text')?.textContent||'';
  let pair=exampleFrom(text);
  if(!pair){
    const next=p.nextElementSibling;
    pair=exampleFrom(text+' '+(next?.querySelector('.nhi-ai-paragraph-text')?.textContent||''));
  }
  const existing=p.querySelector('.nhi-add-to-note');
  if(!pair){if(existing)existing.remove();return;}
  p.dataset.v2Ko=pair.ko;p.dataset.v2Vi=pair.vi;
  let add=existing;
  if(!add){add=document.createElement('button');add.type='button';add.className='nhi-add-to-note';add.textContent='＋';p.appendChild(add);}
  add.title='Lưu đúng một câu Hàn và một câu Việt';
  add.onclick=function(ev){
   ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
   const saved=read(EXAMPLE,[]);if(!saved.some(x=>x.ko===pair.ko&&x.vi===pair.vi)){
    saved.push({id:'ex-'+Date.now()+'-'+Math.random().toString(36).slice(2,5),ko:pair.ko,vi:pair.vi,at:Date.now()});write(EXAMPLE,saved.slice(-300));
   }
   if(P()?.active?.()&&P()?.appendChatExample)P().appendChatExample(pair.ko+' ('+pair.vi+')');
   status('Đã lưu 1 câu Hàn + 1 câu Việt');
  };
 });
}
function recordLearning(){
 const state=read(KEY,{ratings:[],minutes:{}}),seen=new Set(state.ratings.map(x=>x.id));
 window.addEventListener('nhi:review',e=>{
  const x=e.detail;if(!x||!x.id)return;
  const log=read(KEY,{ratings:[],minutes:{}});log.ratings=Array.isArray(log.ratings)?log.ratings:[];
  const first=!log.ratings.some(r=>r.id===x.id);
  log.ratings.push({id:x.id,grade:x.grade,lesson:x.lesson||'',practice:!!x.practice,at:Date.now(),first:first});
  log.ratings=log.ratings.slice(-2000);write(KEY,log);
 });
 let last=Date.now();
 setInterval(()=>{
  const now=Date.now(),elapsed=Math.min(now-last,15000);last=now;
  if(document.visibilityState!=='visible'||!P()?.active?.())return;
  const log=read(KEY,{ratings:[],minutes:{}});log.minutes=log.minutes||{};
  const today=new Date(),day=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  log.minutes[day]=(log.minutes[day]||0)+elapsed/1000;write(KEY,log);
  const percent=Math.min(100,(log.minutes[day]/600)*100);
  const b=$('.nhi-v2-goal-track span');if(b)b.style.width=percent+'%';
 },10000);
}
function loadAnswer(){
 const id=$('#nhiV2ListenSelect')?.value,items=visibleItems(),it=items.find(x=>x.id===id)||items[0];return it;
}
function playSample(){const it=loadAnswer();if(!it)return status('Không có câu để luyện');window.NHI_SPEECH?.speak(it.ko,'ko-KR');}
async function recordToggle(){
 if(recorder&&recorder.state==='recording'){recorder.stop();return;}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return status('Trình duyệt này chưa hỗ trợ thu âm.');
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  audioChunks=[];recorder=new MediaRecorder(stream);
  recorder.ondataavailable=e=>{if(e.data.size)audioChunks.push(e.data)};
  recorder.onstop=()=>{
   if(recordUrl)URL.revokeObjectURL(recordUrl);
   recordUrl=URL.createObjectURL(new Blob(audioChunks,{type:recorder.mimeType||'audio/webm'}));
   stream.getTracks().forEach(x=>x.stop());renderPanel();status('Đã thu âm trên thiết bị. Nghe lại để đối chiếu với câu mẫu.');
  };
  recorder.start();renderPanel();status('Đang thu âm. Nhấn Dừng để kết thúc.');
 }catch(e){status('Không mở được micro. Hãy kiểm tra quyền truy cập.');}
}
function recognize(){
 const S=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!S)return status('Trình duyệt chưa hỗ trợ chuyển lời nói thành văn bản.');
 const x=new S();x.lang='ko-KR';x.interimResults=false;
 x.onresult=e=>{transcript=e.results[0][0].transcript;const input=$('#nhiV2Answer');if(input)input.value=transcript;status('Đã nhận văn bản. Đây không phải điểm phát âm.');};
 x.onerror=e=>status('Không nhận dạng được lời nói: '+e.error);
 try{x.start()}catch(e){status('Không thể mở nhận dạng giọng nói.');}
}
function makeCard(ko,vi){
 if(!window.NHI_CREATE_CARD_V2)return status('Chức năng tạo thẻ đang chưa khả dụng.');
 const r=window.NHI_CREATE_CARD_V2(ko,vi,'Từ tình huống giao tiếp');
 status(r?.created?'Đã lưu thẻ vào học phần Hội thoại công việc':(r?.message||'Chưa lưu được thẻ'));
}
function ask(text){
 window.NLC_AI?.open();
 if(window.NLC_AI?.ask)window.NLC_AI.ask(text);
 else{const el=$('#aiInput');if(el){el.value=text;el.focus();}}
}
function handle(act){
 const d=data();
 if(act.startsWith('note-tab:')){noteTab=act.slice(9);setPanel('notebook');return;}
 if(act.startsWith('scope:')){scope=act.slice(6);renderPanel();return;}
 if(act.startsWith('open-item:')){
  const id=act.slice(10),it=d.items.find(x=>x.id===id),lesson=d.lessons.find(x=>x.id===it?.lesson);
  if(!it||!lesson)return status('Không còn thẻ này.');
  setPanel('');P()?.follow?.({lesson:lesson.id,queue:lesson.ids,pos:Math.max(0,lesson.ids.indexOf(id)),card:id,kind:'free'});return;
 }
 if(act.startsWith('ask-error:')){
  const it=d.items.find(x=>x.id===act.slice(10));if(it)ask('Tôi hay nhớ sai câu tiếng Hàn này: '+it.ko+' ('+it.vi+'). Giải thích nguyên nhân dễ nhầm, so sánh cấu trúc gần giống và cho 2 ví dụ đúng Hàn–Việt.');return;
 }
 if(act.startsWith('ask-grammar:')){
  const g=patterns[+act.slice(12)];if(g)ask('Giải thích ngữ pháp '+g.name+' ('+g.meaning+') cho người làm nhà máy và cho hai ví dụ song ngữ tự nhiên.');return;
 }
 if(act==='practice-hard'){const ids=d.items.filter(x=>x.hard||x.rate==='hard').map(x=>x.id);if(!ids.length)return status('Chưa có thẻ khó');setPanel('');P()?.startPractice?.(ids,'Lỗi sai của tôi · luyện tự nguyện');return;}
 if(act.startsWith('make-card:')){const e=read(EXAMPLE,[]).find(x=>x.id===act.slice(10));if(e)makeCard(e.ko,e.vi);return;}
 if(act.startsWith('mode:')){
  const type=act.slice(5),l=d.lessons.find(x=>x.id===sourceLesson)||firstLesson();
  if(type==='listen'||type==='speak'||type==='dialog'){setPanel(type==='listen'?'listen':'speak');if(type==='dialog'){scenario=1;renderPanel();}return;}
  if(type==='flash'){setPanel('');if(scope==='lesson'&&l)P()?.startLessonById?.(l.id);else P()?.startPractice?.(d.items.map(x=>x.id),'Ôn tổng hợp tất cả học phần');return;}
  const tab={write:'write',quiz:'quiz',test:'test',match:'match'}[type];
  if(tab){status('Chế độ '+type+' dùng bộ lọc học phần gốc. Hãy kiểm tra tên nguồn ở đầu trang.');route(tab);}return;
 }
 if(act==='sample-audio'){playSample();return}
 if(act==='record-toggle'){recordToggle();return}
 if(act==='speech-text'){recognize();return}
 if(act==='reveal'){answerRevealed=!answerRevealed;const el=$('#nhiV2Answer');if(el)transcript=el.value;renderPanel();return;}
 if(act.startsWith('scenario:')){scenario=+act.slice(9);renderPanel();return;}
 if(act==='ask-scenario'){const s=scenarios[scenario];ask('Hãy đóng vai quản lý người Hàn trong tình huống "'+s[0]+'". Hỏi tôi từng câu một bằng tiếng Hàn, chờ tôi trả lời rồi sửa lỗi cá nhân, giải thích bằng tiếng Việt và đề xuất một câu nói tự nhiên. Bắt đầu với câu hỏi đầu tiên.');return;}
 if(act==='save-scenario'){const s=scenarios[scenario];makeCard(s[1],s[2]);return;}
 if(act==='new-thread'){window.NLC_AI?.newThread?.('Hội thoại · '+new Date().toLocaleDateString('vi-VN'));setPanel('');window.NLC_AI?.open();return;}
 if(act.startsWith('thread:')){if(window.NLC_AI?.switchThread?.(act.slice(7))){setPanel('');window.NLC_AI.open();}return;}
 if(act.startsWith('rename-thread:')){const id=act.slice(14);const title=prompt('Đặt tên cho hội thoại:');if(title)window.NLC_AI?.renameThread?.(id,title);renderPanel();return;}
 if(act==='open-settings'){$('#setBtn')?.click();return;}
 if(act==='export-progress'){$('#exportBtn')?.click();return;}
 if(act==='backup-all'){exportAll();return;}
 if(act==='restore-check'){$('#nhiV2RestoreFile')?.click();return;}
}
function exportAll(){
 const selected={version:2,exported:new Date().toISOString(),type:'nhi-full-local-export',keys:{}};
 for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(/^(viko-|nlc-|nhi-)/.test(key)&&!/(key|token|secret|api|auth|credential|sync-config)/i.test(key))selected.keys[key]=localStorage.getItem(key);}
 const blob=new Blob([JSON.stringify(selected,null,2)],{type:'application/json'}),a=document.createElement('a');
 const url=URL.createObjectURL(blob);a.href=url;a.download='Nhi-Learning-Corner-full-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
 status('Đã xuất dữ liệu học trên thiết bị. Khóa API và cấu hình nhạy cảm không được xuất.');
}
function installRestorePreview(){
 const input=document.createElement('input');input.type='file';input.id='nhiV2RestoreFile';input.accept='.json,application/json';input.hidden=true;document.body.appendChild(input);
 input.addEventListener('change',async()=>{
  const file=input.files[0];if(!file)return;try{
   const txt=await file.text(),obj=JSON.parse(txt);
   const keys=obj?.keys||{},count=Object.keys(keys).length;
   const ok=obj.type==='nhi-full-local-export'&&count>0;
   const msg=ok?'Tệp hợp lệ: '+count+' nhóm dữ liệu. Chưa nhập hay ghi đè. Để khôi phục, dùng quy trình sao lưu toàn bộ ở Cài đặt nâng cao.':'Tệp này không đúng định dạng sao lưu đầy đủ của Nhi Learning Corner.';
   alert(msg);
  }catch(e){alert('Không đọc được JSON. Dữ liệu hiện tại không thay đổi.');}
  input.value='';
 });
}
function installImportPreview(){
 const root=$('#setsBox');if(!root)return;
 let approved=false;
 root.addEventListener('submit',function(e){
  const form=e.target;if(form.dataset.form!=='import'||approved)return;
  e.preventDefault();e.stopImmediatePropagation();
  const raw=form.bulk?.value||'',lines=raw.split(/\r?\n/).filter(Boolean),d=data(),norm=s=>clean(s).replace(/\s+/g,'');
  const seen=new Set(d.items.map(x=>norm(x.vi)+'|'+norm(x.ko))),unique=[],duplicates=[],bad=[];
  lines.forEach(line=>{
   const parts=line.split(/\t|\s+\|\s+|;/).map(x=>x.trim()).filter(Boolean);
   if(parts.length<2){bad.push(line);return;}
   const key=norm(parts[0])+'|'+norm(parts[1]);
   if(seen.has(key))duplicates.push(line);
   else{seen.add(key);unique.push(line);}
  });
  const ok=confirm('XEM TRƯỚC NHẬP EXCEL\nDòng mới: '+unique.length+'\nDòng trùng (bỏ qua): '+duplicates.length+'\nDòng không hợp lệ: '+bad.length+'\n\nKhông làm mất dữ liệu cũ. Bạn có muốn chỉ nhập những dòng mới không?');
  if(!ok)return;
  if(!unique.length)return status('Không có dòng mới để nhập.');
  form.bulk.value=unique.join('\n');approved=true;
  try{form.requestSubmit()}finally{approved=false;}
 },true);
}
function init(){
 if(!P()||!$('#app'))return;nav();hookSettings();recordLearning();installRestorePreview();installImportPreview();
 const wrap=$('#nhiV2Workspace');
 wrap.addEventListener('click',e=>{
  const b=e.target.closest('[data-v2-act]');if(!b)return;handle(b.dataset.v2Act);
 });
 wrap.addEventListener('input',e=>{
  if(e.target.id==='nhiV2SearchInput'){
   term=e.target.value;const start=e.target.selectionStart;renderPanel();
   const next=$('#nhiV2SearchInput');if(next){next.focus({preventScroll:true});next.setSelectionRange(start,start);}
  }else if(e.target.id==='nhiV2Answer')transcript=e.target.value;
 });
 wrap.addEventListener('change',e=>{
  if(e.target.id==='nhiV2LessonSelect'){sourceLesson=e.target.value;renderPanel();}
  if(e.target.dataset.v2Grammar!=null){
   const g=patterns[Number(e.target.dataset.v2Grammar)];
   const saved=read(GRAMMAR,{});saved[g.name]=e.target.value;write(GRAMMAR,saved);
  }
  if(e.target.id==='nhiV2ListenSelect'){answerRevealed=false;transcript='';renderPanel();}
 });
 const log=$('#aiLog');if(log){
  new MutationObserver(()=>attachExamples()).observe(log,{childList:true,subtree:true});
  attachExamples();
 }
 window.addEventListener('nhi:lessons-ready',()=>{if(panel)renderPanel();});
 window.addEventListener('nhi:chat-history',()=>{if(panel==='threads')renderPanel();});
 const mode=$('#modeHead');if(mode)new MutationObserver(()=>updateSource()).observe(mode,{childList:true,subtree:true});
 window.addEventListener('hashchange',()=>{if(/^#\/bai\//.test(location.hash))setPanel('');});
 const h=$('#aiBtn');if(h)h.setAttribute('title','Hỏi AI · giữ nguyên chat kéo giãn');
 updateSource();
 // One-time client-side copy of learning state only (never credentials or keys).
 try{if(!localStorage.getItem('nhi-v2-rollback-progress-20261117')){const old=localStorage.getItem('viko-plan-v1');if(old)localStorage.setItem('nhi-v2-rollback-progress-20261117',old);}}catch(e){}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
