(function(){
 const KEY='petlove_service_requests_v1';
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||[]}catch(_){return[]}};
 const write=items=>localStorage.setItem(KEY,JSON.stringify(items));
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 document.addEventListener('DOMContentLoaded',()=>{
  const form=document.querySelector('#service-request-form');
  if(form){
   const params=new URLSearchParams(location.search),chosen=params.get('servicio'),select=form.querySelector('#request-service');
   if(chosen&&select)[...select.options].forEach(o=>{if(o.text.toLowerCase()===chosen.toLowerCase())select.value=o.text});
   try{const session=JSON.parse(localStorage.getItem('petlove_session_v1'));if(session){form.querySelector('#request-name').value=session.name||'';form.querySelector('#request-email').value=session.email||'';form.querySelector('#request-phone').value=session.phone||'';}}catch(_){}
   form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;
    const data=Object.fromEntries(new FormData(form).entries());
    data.id='SOL-'+Date.now().toString().slice(-7);data.createdAt=new Date().toLocaleString('es-CO');data.status='Esperando respuesta';data.response='';data.respondedAt='';
    const all=read();all.unshift(data);write(all);
    const msg=document.querySelector('#request-message');msg.textContent='mensaje enviado, te contestaremos lo más rápido que podamos.';msg.classList.remove('hidden');
    form.reset();setTimeout(()=>location.href='servicio_solicitado.html',900);
   });
  }
  const host=document.querySelector('#service-status-list');if(!host)return;
  const all=read();if(!all.length){host.innerHTML='<div class="status-empty"><h2>Aún no tienes solicitudes</h2><p>Cuando envíes una solicitud, podrás consultar aquí su estado y la respuesta del equipo.</p></div>';return;}
  host.innerHTML=all.map(item=>{
   const answered=String(item.status||'').toLowerCase()==='contestado';
   return `<article class="status-item"><div class="status-item-top"><span class="status-id">${esc(item.id||'Solicitud')}</span><span class="status-pill ${answered?'status-pill-answered':''}">${answered?'Contestado':'Esperando respuesta'}</span></div><h2>${esc(item.service||'Solicitud de servicio')}</h2><p class="status-description">${esc(item.description||'')}</p><div class="status-meta"><span>Enviada: ${esc(item.createdAt||'')}</span>${answered&&item.respondedAt?`<span>Respondida: ${esc(item.respondedAt)}</span>`:''}</div><div class="request-response"><strong>Respuesta del equipo</strong><p>${answered&&item.response?esc(item.response):answered?'El equipo marcó esta solicitud como contestada.':'Aún estamos revisando tu solicitud. Te mostraremos aquí la respuesta cuando el equipo conteste.'}</p></div></article>`;
  }).join('');
 });
})();
