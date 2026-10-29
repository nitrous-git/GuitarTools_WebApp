import {transaction,requestResult as read} from './db.js';
import {validateRegion,REVIEW_STATES} from '../domain/drumMarkers.js';
export function validateProject(p) {
  if(!p||typeof p.id!=='string'||!p.id||typeof p.title!=='string'||!p.title.trim()||!Number.isFinite(p.duration)||p.duration<0||p.schema!==1)throw new Error('Invalid drum project.');
  if(!Array.isArray(p.drums)||p.drums.length>100||!Array.isArray(p.markers)||p.markers.length>5000)throw new Error('Project exceeds drum/marker limits.');
  if(new Set(p.drums.map(d=>d.id)).size!==p.drums.length||new Set(p.markers.map(m=>m.id)).size!==p.markers.length)throw new Error('Duplicate project identifiers.');
  for(const d of p.drums)if(typeof d.label!=='string'||!['kick','snare','tom'].includes(d.kind))throw new Error('Invalid drum entry.');
  for(const m of p.markers){validateRegion(m.start,m.end,p.duration);if(m.onset<m.start||m.onset>m.end||!Number.isFinite(m.onset)||!REVIEW_STATES.includes(m.review)||!['manual','automatic'].includes(m.origin)||m.drumId&&!p.drums.some(d=>d.id===m.drumId))throw new Error('Invalid hit marker.');}
  if(p.duration)validateRegion(p.range.start,p.range.end,p.duration);
  return p;
}
export function createDrumProjectRepository(open) {
  const run=(mode,fn)=>transaction(['drumProjects'],mode,tx=>fn(tx.objectStore('drumProjects')),open);
  return {
    list:()=>run('readonly',s=>read(s.getAll())),
    async save(project){const p=structuredClone(validateProject(project));return run('readwrite',async s=>{const old=await read(s.get(p.id));if(old&&old.revision!==p.revision)throw new Error('This reference changed in another tab. Save a copy or reload it.');p.revision=(old?.revision||0)+1;p.updatedAt=new Date().toISOString();await read(s.put(p));return p;});},
    async remove(project){return run('readwrite',async s=>{const old=await read(s.get(project.id));if(old&&old.revision!==project.revision)throw new Error('This reference changed in another tab. Refresh before deleting.');await read(s.delete(project.id));});}
  };
}
export const drumProjectRepository=createDrumProjectRepository();
