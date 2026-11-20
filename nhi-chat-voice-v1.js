/* Click-to-dictate Vietnamese or Korean into the existing AI chat input.
   Uses the browser's SpeechRecognition service, never auto-sends messages. */
(function(){
 'use strict';
 function init(){
  const form=document.getElementById('aiForm'),field=document.getElementById('aiInput');
  if(!form||!field||form.querySelector('.nhi-chat-mic'))return;
  const select=document.createElement('select');
  select.className='nhi-chat-voice-lang';
  select.setAttribute('aria-label','Ngôn ngữ nói');
  [['vi-VN','Việt'],['ko-KR','Hàn']].forEach(function(pair){
    const option=document.createElement('option');option.value=pair[0];option.textContent=pair[1];select.appendChild(option);
  });
  const mic=document.createElement('button');
  mic.type='button';mic.className='nhi-chat-mic';
  mic.title='Nhấn để nói; nhấn lại để dừng. Chuyển lời nói thành văn bản trước khi gửi.';
  mic.setAttribute('aria-label','Nhấn micro để nhập câu hỏi bằng giọng nói');
  mic.setAttribute('aria-pressed','false');
  mic.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/></svg>';
  const send=form.querySelector('button[type="submit"]');
  form.insertBefore(mic,send);
  form.insertBefore(select,send);
  const status=document.createElement('p');status.id='nhiChatMicStatus';status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');form.after(status);
  const Recognizer=window.SpeechRecognition||window.webkitSpeechRecognition;
  let recognition=null,active=false,base='',finalTranscript='',transcriptTouched=false,hasError=false;
  function label(text){status.textContent=text;}
  function listening(on){active=on;mic.setAttribute('aria-pressed',String(on));mic.setAttribute('aria-label',on?'Dừng nhận dạng giọng nói':'Nhấn micro để nhập câu hỏi bằng giọng nói');}
  function write(text){
    field.value=base+(base&&!/\s$/.test(base)?' ':'')+text;
    field.dispatchEvent(new Event('input',{bubbles:true}));
    field.focus({preventScroll:true});
    try{field.setSelectionRange(field.value.length,field.value.length);}catch(_e){}
  }
  function stop(){if(recognition&&active){try{recognition.stop();}catch(_e){}}}
  mic.addEventListener('click',function(){
    if(active){stop();return;}
    if(!Recognizer){
      label('Trình duyệt chưa hỗ trợ nhập giọng nói. Hãy thử Chrome hoặc Edge và cấp quyền micro.');
      return;
    }
    if(!window.isSecureContext){
      label('Nhận dạng giọng nói cần mở trang bằng HTTPS và cấp quyền micro.');
      return;
    }
    base=field.value;finalTranscript='';transcriptTouched=false;hasError=false;
    try{
      recognition=new Recognizer();
      recognition.lang=select.value;
      recognition.continuous=false;
      recognition.interimResults=true;
      recognition.maxAlternatives=1;
      recognition.onstart=function(){
        listening(true);
        label('🎙 Đang nghe '+(select.value==='ko-KR'?'tiếng Hàn':'tiếng Việt')+'… nói rồi nhấn micro để dừng.');
      };
      recognition.onresult=function(e){
        let finalText='',interimText='';
        for(let i=0;i<e.results.length;i++){
          const segment=e.results[i][0]&&e.results[i][0].transcript||'';
          if(e.results[i].isFinal)finalText+=segment+' ';
          else interimText+=segment;
        }
        finalTranscript=finalText.trim();
        transcriptTouched=true;
        write((finalText+interimText).trim());
      };
      recognition.onerror=function(e){
        hasError=true;
        const error=e.error||'';
        const map={
          'not-allowed':'Quyền micro bị từ chối. Hãy cấp quyền micro cho website trong cài đặt trình duyệt.',
          'service-not-allowed':'Thiết bị đang chặn dịch vụ nhận dạng giọng nói.',
          'no-speech':'Không nhận được lời nói. Hãy thử lại ở nơi yên tĩnh.',
          'audio-capture':'Không tìm thấy micro trên thiết bị.',
          'network':'Dịch vụ nhận dạng giọng nói không kết nối được.'
        };
        label(map[error]||'Không nhận dạng được giọng nói ('+error+'). Hãy thử lại.');
        listening(false);
      };
      recognition.onend=function(){
        listening(false);
        if(transcriptTouched&&finalTranscript){
          write(finalTranscript);
          label('Đã chuyển giọng nói thành văn bản. Kiểm tra rồi nhấn Enter hoặc Gửi.');
        }else if(!hasError){
          label('Chưa nhận được văn bản. Bạn có thể nhấn micro để thử lại.');
        }
        recognition=null;
      };
      recognition.start();
    }catch(err){
      recognition=null;listening(false);
      label('Không thể bật micro: '+String(err&&err.message||err).slice(0,130));
    }
  });
  select.addEventListener('change',function(){if(active)stop();});
  document.getElementById('aiClose')?.addEventListener('click',stop);
  document.getElementById('aiNewBtn')?.addEventListener('click',function(){stop();label('');});
  // Speech is transcribed into the field only. The user's Enter/Gửi action
  // remains the one and only way to submit it.
  form.addEventListener('submit',function(){if(active)stop();},true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
 else init();
})();
