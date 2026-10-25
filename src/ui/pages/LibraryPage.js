import { songRepository as repository } from '../../storage/songRepository.js';
import { parseSong, songTuning, stringTracks, tuningLabel, FORMATS } from '../../services/songImport.js';
import { libraryBackup, downloadFile } from '../../storage/libraryBackup.js';
import { libraryDialog } from '../libraryDialog.js';
import { storageMessage } from '../../storage/db.js';
const node=(tag,cls,text)=> { const n=document.createElement(tag); if(cls)n.className=cls; if(text!==undefined)n.textContent=text; return n; };
const sizeLabel=n=>n<1024?`${n} B`:n<1024*1024?`${(n/1024).toFixed(1)} KiB`:`${(n/1024/1024).toFixed(1)} MiB`;
const dateLabel=s=>new Date(s).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
const recent=s=>Date.now()-Date.parse(s.createdAt)<30*24*60*60*1000;
export function createLibraryPage({openSong,openTuning}={}) {
  const element=node('article','library-page'); element.hidden=true; element.setAttribute('aria-labelledby','library-title');
  // Static template only. Imported and user text is inserted with textContent/value.
  element.innerHTML=`<header class="library-heading"><div><p class="eyebrow">YOUR MUSIC / 02</p><h1 id="library-title" tabindex="-1">Song Library</h1><p>Every tab, organized and ready to play. Your files stay on this device.</p></div><div class="library-heading-actions"><button data-action="new">＋ New collection</button><button class="primary" data-action="import">⇧ Import Guitar Pro files</button></div></header>
    <input id="library-import" type="file" accept=".gp,.gpx,.gp5,.gp4,.gp3" multiple hidden><input id="library-restore" type="file" accept=".zip" hidden>
    <p id="library-status" role="status" aria-live="polite"></p>
    <div class="library-columns"><aside class="library-sidebar"><div><h2>LIBRARY</h2><nav id="library-views" aria-label="Library views"></nav><div class="library-collections"><h2>COLLECTIONS</h2><nav id="library-collections" aria-label="Song collections"></nav><button data-action="new">＋ New collection</button></div></div><div class="library-local"><h2>LOCAL COLLECTION</h2><p id="library-size"></p><p class="hint">Files are saved in this browser. Browser data can be cleared or evicted. Export a backup to keep your collection portable.</p><button data-action="export">↓ Export library backup</button><button data-action="restore">↑ Restore library backup</button><button data-action="refresh">Refresh storage</button><small>Backups include saved state, not unsaved drafts. Maximum archive: 256 MiB.</small></div></aside>
    <section class="library-main" aria-label="Songs"><div class="library-toolbar"><label class="library-search"><span class="sr-only">Search songs</span><input id="library-search" type="search" placeholder="Search title, artist, tuning or filename…"></label><label><span class="sr-only">File format</span><select id="library-format"><option value="">All formats</option></select></label><label><span class="sr-only">Sort songs</span><select id="library-sort"><option value="recent">Sort: Recently added</option><option value="title">Sort: Title</option><option value="artist">Sort: Artist</option><option value="tempo">Sort: Tempo</option></select></label><button id="library-compact" aria-pressed="false" aria-label="Compact rows">☷</button></div>
    <div class="library-table-scroll" tabindex="0" role="region" aria-label="Scrollable songs table"><table class="library-table"><thead><tr><th scope="col" aria-label="Favorite">★</th><th scope="col">SONG</th><th scope="col">ARTIST</th><th scope="col">FORMAT</th><th scope="col">TUNING</th><th scope="col">BPM</th><th scope="col">TRACKS</th><th scope="col">ADDED</th><th scope="col" aria-label="Actions"></th></tr></thead><tbody id="library-rows"></tbody></table><div id="library-empty"></div></div><p id="library-result-count" class="hint"></p><section id="library-inspector" class="library-inspector" aria-label="Selected song"></section></section></div>`;
  const $=s=>element.querySelector(s);
  let songs=[],collections=[],selectedId,view='all',busy=false;
  for(const format of FORMATS) $('#library-format').add(new Option(format.toUpperCase(),format));
  function status(message,error=false){$('#library-status').textContent=message;$('#library-status').classList.toggle('error',error);$('#library-status').setAttribute('role',error?'alert':'status');}
  async function run(fn){if(busy)return;busy=true;element.setAttribute('aria-busy','true');try{await fn();}catch(error){status(storageMessage(error),true);}finally{busy=false;element.removeAttribute('aria-busy');}}
  function button(text,handler,cls){const b=node('button',cls,text);b.type='button';b.addEventListener('click',handler);return b;}
  function matchesView(s,key=view){return key==='all'||key==='favorites'&&s.favorite||key==='recent'&&recent(s)||key==='uncategorized'&&!s.collectionIds.length||s.collectionIds.includes(key);}
  function viewButton(label,key){const b=button('',()=>{view=key;render();},'library-view');b.setAttribute('aria-pressed',String(view===key));b.append(node('span','',label),node('span','',songs.filter(s=>matchesView(s,key)).length));return b;}
  async function refresh(){({songs,collections}=await repository.snapshot());if(!songs.some(s=>s.id===selectedId))selectedId=songs[0]?.id;render();}
  function render(){
    $('#library-views').replaceChildren(...[['▤ All songs','all'],['★ Favorites','favorites'],['◷ Recently added · 30 days','recent']].map(([label,key])=>viewButton(label,key)));
    $('#library-collections').replaceChildren();
    for(const c of collections){const row=node('div','library-collection-row'),more=button('···',()=>run(()=>manageCollection(c)));more.setAttribute('aria-label',`Manage collection ${c.name}`);row.append(viewButton(`▧ ${c.name}`,c.id),more);$('#library-collections').append(row);}
    $('#library-collections').append(viewButton('▧ Uncategorized','uncategorized'));
    const bytes=[...new Map(songs.map(s=>[s.fileId,s.size])).values()].reduce((a,b)=>a+b,0);
    $('#library-size').textContent=`${songs.length} songs · ${sizeLabel(bytes)} of original files`;
    renderRows();
  }
  function renderRows(){
    const query=$('#library-search').value.trim().toLowerCase(),format=$('#library-format').value,sort=$('#library-sort').value;
    const rows=songs.filter(s=>matchesView(s)&&(!format||s.format===format)&&`${s.title} ${s.artist} ${s.filename} ${songTuning(s)}`.toLowerCase().includes(query));
    rows.sort((a,b)=>sort==='recent'?b.createdAt.localeCompare(a.createdAt):sort==='tempo'?(a.tempo??Infinity)-(b.tempo??Infinity):a[sort].localeCompare(b[sort]));
    if(!rows.some(s=>s.id===selectedId))selectedId=rows[0]?.id;
    $('#library-rows').replaceChildren();
    for(const song of rows){
      const tr=node('tr',song.id===selectedId?'selected':'');tr.dataset.songId=song.id;
      const star=button(song.favorite?'★':'☆',()=>run(async()=>{await repository.update(song,{favorite:!song.favorite});await refresh();}),'library-star');star.setAttribute('aria-label',`Favorite ${song.title}`);star.setAttribute('aria-pressed',String(song.favorite));
      const title=button('',()=>{selectedId=song.id;renderRows();},'library-song-title');title.append(node('span','library-song-icon','♫'),node('strong','',song.title));title.setAttribute('aria-label',`Select ${song.title}`);
      const menu=button('···',()=>run(()=>songActions(song)));menu.setAttribute('aria-label',`Actions for ${song.title}`);
      for(const value of [star,title,song.artist||'Unknown artist',node('span','library-format',song.format.toUpperCase()),songTuning(song),song.tempo??'—',`${song.tracks.length} tracks`,dateLabel(song.createdAt),menu]){const td=node('td');typeof value==='object'?td.append(value):td.textContent=value;tr.append(td);}
      tr.addEventListener('click',e=>{if(!e.target.closest('button')){selectedId=song.id;renderRows();}});
      tr.addEventListener('dblclick',e=>{if(!e.target.closest('button'))run(()=>openPlayer(song));});$('#library-rows').append(tr);
    }
    const empty=$('#library-empty');empty.replaceChildren();empty.hidden=!!rows.length;
    if(!rows.length){empty.append(node('h2','',songs.length?'No matching songs':'Your next practice starts here'),node('p','',songs.length?'Try another search, format or collection.':'Drop Guitar Pro files here, or import them from your device. Originals stay unchanged.'),button('⇧ Import Guitar Pro files',()=>$('#library-import').click(),'primary'));}
    $('#library-result-count').textContent=`${rows.length} of ${songs.length} songs · Drop files anywhere on this page to import`;
    renderInspector(songs.find(s=>s.id===selectedId));
  }
  function renderInspector(song){
    const inspector=$('#library-inspector');inspector.replaceChildren();
    if(!song){inspector.append(node('p','hint','Select a song to inspect its original tuning, notes and tracks.'));return;}
    const cover=node('div','library-cover');cover.append(node('span','','♫'),node('small','','GUITAR PRO'));
    const data=node('div','library-inspect-data'),heading=node('div','library-inspect-title'),identity=node('div');identity.append(node('strong','',song.title),node('span','',song.artist||'Unknown artist'));
    const actions=node('div','library-inspect-actions');actions.append(button('♫ Open tuning',()=>run(()=>openSourceTuning(song))),button('▶ Open in Player',()=>run(()=>openPlayer(song)),'primary'));
    heading.append(identity,actions);const grid=node('div','library-inspect-grid');
    const info=(pairs)=>{const box=node('div');for(const [label,value] of pairs)box.append(node('small','',label),node('div','',value));return box;};
    grid.append(info([['FILE FORMAT',`${song.format.toUpperCase()} · ${song.filename}`],['IMPORTED',dateLabel(song.createdAt)]]),info([['TUNING',stringTracks(song).map(t=>`${tuningLabel(t.notesLowToHigh)} · ${t.notesLowToHigh.length} strings${t.capo?` · capo ${t.capo}`:''}`).join(' / ')||'—'],['TEMPO',song.tempo?`${song.tempo} BPM`:'—']]),info([['INSTRUMENTS / TRACKS',song.tracks.map(t=>`${t.name}${t.staves.some(s=>s.percussion)?' (percussion)':t.program!==null?` (MIDI ${t.program+1})`:''}`).join(' · ')],['LOCATION',collections.filter(c=>song.collectionIds.includes(c.id)).map(c=>c.name).join(' / ')||'Uncategorized']]));
    const notes=info([['PERSONAL NOTES',song.notes||'Add practice notes…']]);notes.append(button('Edit details & notes',()=>run(()=>editSong(song))));grid.append(notes);data.append(heading,grid);inspector.append(cover,data);
  }
  async function editSong(song){
    const result=await libraryDialog({title:'Song details',message:'Display metadata and practice notes do not change the original file.',fields:[{key:'title',label:'Song title',value:song.title,required:true,maxLength:500},{key:'artist',label:'Artist',value:song.artist,maxLength:500},{key:'notes',label:'Personal notes',type:'textarea',value:song.notes,maxLength:20000}]});
    if(result.action==='save'){await repository.update(song,result.values);await refresh();status('Song details saved.');}
  }
  async function memberships(song){
    if(!collections.length){status('Create a collection first, then assign this song.');return;}
    const result=await libraryDialog({title:'Song collections',message:'Choose any number of collections. The original file is stored only once.',fields:collections.map(c=>({key:c.id,label:c.name,type:'checkbox',value:song.collectionIds.includes(c.id)}))});
    if(result.action==='save'){await repository.update(song,{collectionIds:collections.filter(c=>result.values[c.id]).map(c=>c.id)});await refresh();status('Collections saved.');}
  }
  async function songActions(song){
    const {action}=await libraryDialog({title:song.title,choices:[['open','Open in Player'],['edit','Edit details & notes'],['collections','Assign collections'],['download','Download original'],['delete','Delete song'],['cancel','Cancel']]});
    if(action==='open')await openPlayer(song);
    if(action==='edit')await editSong(song);
    if(action==='collections')await memberships(song);
    if(action==='download')downloadFile(await repository.file(song),song.filename);
    if(action==='delete'&&(await libraryDialog({title:'Delete song?',message:`Remove “${song.title}” from this browser? Other library entries are kept. Export a backup first if needed.`,choices:[['delete','Delete song'],['cancel','Cancel']]})).action==='delete'){await repository.remove(song);await refresh();status('Song deleted.');}
  }
  async function newCollection(){const r=await libraryDialog({title:'New collection',fields:[{key:'name',label:'Collection name',value:'',required:true,maxLength:80}]});if(r.action==='save'){await repository.saveCollection(r.values.name);await refresh();status('Collection created.');}}
  async function manageCollection(c){
    const r=await libraryDialog({title:'Manage collection',message:'Deleting a collection keeps every song.',fields:[{key:'name',label:'Collection name',value:c.name,required:true,maxLength:80}],choices:[['save','Rename'],['delete','Delete collection'],['cancel','Cancel']]});
    if(r.action==='save')await repository.saveCollection(r.values.name,c);
    if(r.action==='delete'){const confirm=await libraryDialog({title:'Delete collection?',message:`Delete “${c.name}”? Its songs stay in All songs.`,choices:[['delete','Delete collection'],['cancel','Cancel']]});if(confirm.action!=='delete')return;await repository.removeCollection(c);if(view===c.id)view='all';}
    if(r.action!=='cancel'){await refresh();status('Collection updated.');}
  }
  async function openPlayer(song){if(!openSong)throw new Error('Player navigation is unavailable.');await openSong(await repository.file(song));}
  async function openSourceTuning(song){
    const supported=stringTracks(song).filter(s=>[6,7,8].includes(s.notesLowToHigh.length)&&s.program!==null&&s.program>=24&&s.program<=31);
    if(!supported.length){await libraryDialog({title:'No supported guitar tuning',message:'Open tuning supports six-, seven- and eight-string guitar tracks. This file has no matching guitar track with original tuning data.',choices:[['cancel','Close']]});return;}
    let track=supported[0];
    if(supported.length>1){const r=await libraryDialog({title:'Choose original guitar tuning',message:'Choose the source track. Pitches remain in physical string order, before capo.',fields:[{key:'track',label:'Track',type:'select',options:supported.map((s,i)=>[String(i),`${s.name} · ${tuningLabel(s.notesLowToHigh)} · ${s.notesLowToHigh.length} strings`]),value:'0'}],choices:[['open','Open new tuning draft'],['cancel','Cancel']]});if(r.action!=='open')return;track=supported[Number(r.values.track)];}
    if(!openTuning)throw new Error('Tuning navigation is unavailable.');await openTuning({name:`${song.title} — ${track.name}`,notesLowToHigh:track.notesLowToHigh});
  }
  async function importFiles(files){
    let imported=0,skipped=0;const errors=[];
    for(const file of files){status(`Importing ${file.name}…`);try{
      const parsed=await parseSong(file);let keep=false;
      if(await repository.hasHash(parsed.hash)){const r=await libraryDialog({title:'Duplicate file',message:`${file.name} has identical bytes to a saved file.`,choices:[['skip','Skip duplicate'],['keep','Keep separate library entry']]});if(r.action!=='keep'){skipped++;continue;}keep=true;}
      let song=await repository.add(parsed,keep);
      if(!song){const r=await libraryDialog({title:'Duplicate added in another tab',message:file.name,choices:[['skip','Skip duplicate'],['keep','Keep separate library entry']]});if(r.action==='keep')song=await repository.add(parsed,true);}
      if(song){selectedId=song.id;imported++;}else skipped++;
    }catch(error){errors.push(error.message);}}
    await refresh();status(`${imported} imported · ${skipped} skipped${errors.length?` · ${errors.length} failed\n${errors.join('\n')}`:''}`,!!errors.length);
  }
  $('#library-import').addEventListener('change',e=>{const files=[...e.target.files];e.target.value='';void run(()=>importFiles(files));});
  $('#library-restore').addEventListener('change',e=>{const file=e.target.files[0];e.target.value='';if(file)run(async()=>{
    status('Validating archive and source files…');const preview=await libraryBackup.preview(file),m=preview.manifest,c=preview.collisions;
    const r=await libraryDialog({title:'Restore full library?',message:`Backup: ${m.songs.length} songs, ${m.collections.length} song collections, ${m.files.length} original files, ${m.tunings.length} tunings, ${m.categories.length} tuning categories. Collisions: ${c.songs} song IDs, ${c.collections} collection IDs, ${c.tunings} tuning IDs, ${c.categories} category IDs; ${c.files} files can be reused. Identical records are skipped; different records with matching IDs get new IDs. Existing preferences and drafts are kept.`,choices:[['restore','Merge backup'],['cancel','Cancel']]});
    if(r.action==='restore'){const n=await libraryBackup.restore(preview);await refresh();status(`Restored ${n.songs} songs, ${n.collections} collections, ${n.tunings} tunings and ${n.categories} tuning categories.`);}else status('Restore cancelled.');
  });});
  element.addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(!action||busy)return;
    if(action==='import')$('#library-import').click();if(action==='restore')$('#library-restore').click();if(action==='new')run(newCollection);
    if(action==='refresh')run(async()=>{await refresh();status('Library refreshed.');});
    if(action==='export')run(async()=>{status('Preparing saved-state backup…');downloadFile(await libraryBackup.export(),`guitar-tools-library-${new Date().toISOString().slice(0,10)}.zip`);status('Full library backup exported. Unsaved drafts are not included.');});
  });
  for(const id of ['#library-search','#library-format','#library-sort'])$(id).addEventListener(id==='#library-search'?'input':'change',renderRows);
  $('#library-compact').addEventListener('click',()=>{$('.library-table').classList.toggle('compact');$('#library-compact').setAttribute('aria-pressed',String($('.library-table').classList.contains('compact')));});
  element.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();element.classList.add('library-dragging');}});
  element.addEventListener('dragleave',e=>{if(!element.contains(e.relatedTarget))element.classList.remove('library-dragging');});
  element.addEventListener('drop',e=>{e.preventDefault();element.classList.remove('library-dragging');const files=[...e.dataTransfer.files];if(busy){status('Please wait for the current operation, then drop the files again.');return;}run(()=>importFiles(files));});
  return {element,show(){element.hidden=false;run(refresh);},hide(){element.hidden=true;}};
}
