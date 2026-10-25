// One accessible native modal, used for editable song metadata and memberships.
export function libraryDialog({ title, message = '', fields = [], choices = [['save','Save'],['cancel','Cancel']] }) {
  return new Promise(resolve => {
    const previous=document.activeElement, dialog=document.createElement('dialog'), form=document.createElement('form');
    dialog.className='tuning-dialog library-dialog'; form.method='dialog';
    const heading=document.createElement('h2'); heading.id='library-dialog-title'; heading.textContent=title; dialog.setAttribute('aria-labelledby',heading.id);
    const description=document.createElement('p'); description.textContent=message; form.append(heading,description);
    const inputs=new Map();
    for (const f of fields) {
      const label=document.createElement('label'); label.textContent=f.label;
      const input=document.createElement(f.type==='textarea'?'textarea':f.type==='select'?'select':'input');
      if (f.type==='select') for (const [value,text] of f.options) input.add(new Option(text,value));
      else if (f.type!=='textarea') input.type=f.type||'text';
      if (f.type==='checkbox') input.checked=Boolean(f.value); else input.value=f.value??'';
      if (f.required) input.required=true;
      if (f.maxLength) input.maxLength=f.maxLength;
      input.name=f.key; label.append(input); form.append(label); inputs.set(f.key,input);
    }
    const actions=document.createElement('div'); actions.className='dialog-actions'; let result={action:'cancel'};
    for (const [action,text] of choices) {
      const b=document.createElement('button'); b.type='button'; b.textContent=text; b.dataset.choice=action;
      b.addEventListener('click',()=> {
        if (action!=='cancel' && !form.reportValidity()) return;
        result={action,values:Object.fromEntries([...inputs].map(([key,input])=>[key,input.type==='checkbox'?input.checked:input.value.trim()]))}; dialog.close();
      }); actions.append(b);
    }
    form.addEventListener('submit',e=>{e.preventDefault(); actions.firstElementChild.click();});
    form.append(actions); dialog.append(form); document.body.append(dialog);
    dialog.addEventListener('close',()=>{dialog.remove(); if(previous?.isConnected) previous.focus(); resolve(result);},{once:true});
    dialog.showModal(); (inputs.values().next().value || actions.querySelector('[data-choice="cancel"]') || actions.firstElementChild).focus();
  });
}
