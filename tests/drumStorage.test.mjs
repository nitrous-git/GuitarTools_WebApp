import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createDrumProjectRepository} from '../src/storage/drumProjectRepository.js';
import {defaultDrums,createMarker} from '../src/domain/drumMarkers.js';
import {DB_NAME,DB_VERSION,STORES,openDatabase,transaction,requestResult} from '../src/storage/db.js';
const require=createRequire(import.meta.url),{IDBFactory,IDBObjectStore}=require(process.env.FAKE_INDEXEDDB_MODULE||'fake-indexeddb');
let db,repo;
test('v2 to v3 additive migration preserves tuning, song and binary records',async()=>{
  globalThis.indexedDB=new IDBFactory();const old=await new Promise(resolve=>{const r=indexedDB.open(DB_NAME,2);r.onupgradeneeded=()=>STORES.filter(s=>s!=='drumProjects').forEach(s=>r.result.createObjectStore(s,{keyPath:s==='preferences'?'key':'id'}));r.onsuccess=()=>resolve(r.result);});
  const values={tunings:{id:'keep-tuning',notes:[40,45,50,55,59,64]},songs:{id:'keep-song',fileId:'source'},songFiles:{id:'source',bytes:new Uint8Array([1,2,3])}};
  await transaction(Object.keys(values),'readwrite',async tx=>{for(const [name,value]of Object.entries(values))await requestResult(tx.objectStore(name).put(value));},async()=>old);old.close();db=await openDatabase();assert.equal(db.version,DB_VERSION);assert.equal(DB_VERSION,3);
  await transaction(Object.keys(values),'readonly',async tx=>{for(const [name,value]of Object.entries(values))assert.deepEqual(await requestResult(tx.objectStore(name).get(value.id)),value);},async()=>db);repo=createDrumProjectRepository(async()=>db);
});
const draft=()=>{const drums=defaultDrums(),m=createMarker(1,5,drums[0].id);m.result={hz:55,quality:'usable',confidence:.8,version:'test',spectrum:[[55,0]]};return {id:'project',schema:1,title:'Kit',artist:'Artist',duration:5,drums,markers:[m],range:{start:.5,end:3},scope:'excerpt',sources:{original:{name:'mix.wav',duration:5,offset:0}},revision:0,notes:'Heads',algorithmVersion:'test'};};
test('project save/reopen, rename, revision conflicts and delete',async()=>{const p=await repo.save(draft());assert.deepEqual((await repo.list())[0],p);const renamed=await repo.save({...p,title:'Renamed'});assert.equal(renamed.revision,2);await assert.rejects(repo.save(p),/another tab/);assert.equal((await repo.list())[0].markers[0].result.hz,55);await assert.rejects(repo.remove(p),/another tab/);await repo.remove(renamed);assert.deepEqual(await repo.list(),[]);});
test('quota failure preserves saved reference and in-memory draft',async()=>{const p=await repo.save(draft()),copy=structuredClone(p),put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('Full','QuotaExceededError');};try{await assert.rejects(repo.save({...p,title:'Unsaved'}),{name:'QuotaExceededError'});}finally{IDBObjectStore.prototype.put=put;}assert.deepEqual(p,copy);assert.equal((await repo.list())[0].title,'Kit');});
test('invalid marker regions are rejected before a write',async()=>{const p=draft();p.markers[0].end=6;await assert.rejects(repo.save(p),/region/i);assert.equal((await repo.list())[0].markers[0].end,1.4);db.close();});
