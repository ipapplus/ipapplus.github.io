(function(){
  'use strict';
  const list=document.getElementById('latest-additions');
  const times=[];
  function refresh(){
    times.forEach(({element,date})=>{element.textContent=RepoUI.relativeTime(date);});
  }
  fetch('latest-additions.json').then(response=>{
    if(!response.ok)throw new Error('Additions request failed');
    return response.json();
  }).then(entries=>{
    const timestamp=entry=>entry.addedAt?Date.parse(entry.addedAt):NaN;
    entries.sort((a,b)=>(timestamp(b)||0)-(timestamp(a)||0));
    list.replaceChildren();
    if(!entries.length){list.textContent='No additions recorded yet.';return;}
    entries.forEach(entry=>{
      const row=document.createElement('p');row.className='addition';
      const name=document.createElement('span');
      name.textContent=entry.name+' · '+entry.version;name.title=entry.package;
      row.appendChild(name);
      const time=document.createElement('time');
      const date=new Date(timestamp(entry));
      if(Number.isNaN(date.getTime()))time.textContent='Addition date unknown';
      else{
        time.dateTime=entry.addedAt;time.title=date.toLocaleString();
        times.push({element:time,date});
      }
      row.appendChild(time);list.appendChild(row);
    });
    refresh();
  }).catch(()=>{list.textContent='Unable to load latest additions.';});
  setInterval(refresh,60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
