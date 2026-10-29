/** Future provider contract (no requests or keys in the manual workstation).
 * Input: {audio: Blob, range: {start:number,end:number}, signal: AbortSignal}
 * onProgress: ({state:'queued'|'running'|'completed'|'failed'|'cancelled', progress:0..1|null}) => void
 * Output: Promise<{stem:Blob, offsetSeconds:number, sourceDuration:number, provider:string}>
 * Stem offset is absolute original-source time, including excerpt jobs.
 * Errors: {code:'unavailable'|'unsupported'|'cancelled'|'provider', message:string}
 * A future remote implementation must explicitly obtain upload consent outside this boundary.
 */
export class UnavailableSeparationProvider {
  available=false;
  async separate(_input,_onProgress) { throw Object.assign(new Error('Automatic separation is not connected. Import a drum stem.'),{code:'unavailable'}); }
}
