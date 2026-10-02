(function(){
  'use strict';
  const list=document.getElementById('latest-additions');
  if(!list)return;
  const times=[];
  function refresh(){
    times.forEach(({element,date})=>{element.textContent=RepoUI.additionTime(date);});
  }
  async function load(){
    try{
      const entries=await RepoUI.loadAdditions();
      list.textContent='';
      if(!entries.length){list.textContent='No additions recorded yet.';return;}
      entries.forEach(entry=>{
        const row=document.createElement('p');row.className='addition';
        const name=document.createElement('span');
        name.textContent=entry.name+' · '+entry.version;name.title=entry.package;
        row.appendChild(name);
        const time=document.createElement('time');
        const date=new Date(entry.addedAt);
        time.dateTime=entry.addedAt;time.title=date.toLocaleString();
        times.push({element:time,date});
        row.appendChild(time);list.appendChild(row);
      });
      refresh();
    }catch(error){list.textContent='Unable to load latest additions.';}
  }
  load();
  setInterval(refresh,60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
