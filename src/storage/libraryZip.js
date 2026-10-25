// Small ZIP32 STORE codec for this application's portable archives. Original files
// are already compressed in modern GP formats. No external runtime dependency.
export const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;
const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', { fatal: true });
const table = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
export function crc32(bytes) { let crc = 0xffffffff; for (const b of bytes) crc = table[(crc ^ b) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
function safePath(name) {
  if (typeof name !== 'string' || name.length > 400 || !/^[a-zA-Z0-9_./-]+$/.test(name) || name.startsWith('/') || name.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('Unsafe archive path.');
}
export function encodeZip(entries) {
  if (!entries.length || entries.length > 10001) throw new Error('Too many archive entries.');
  let offset = 0; const locals = [], centrals = [], names = new Set();
  for (const [name, bytes] of entries) {
    safePath(name); if (names.has(name)) throw new Error('Duplicate archive path.'); names.add(name);
    const n = encoder.encode(name), crc = crc32(bytes), local = new Uint8Array(30 + n.length), v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x800, true);
    v.setUint32(14, crc, true); v.setUint32(18, bytes.length, true); v.setUint32(22, bytes.length, true); v.setUint16(26, n.length, true); local.set(n, 30);
    const central = new Uint8Array(46 + n.length), c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true);
    c.setUint32(16, crc, true); c.setUint32(20, bytes.length, true); c.setUint32(24, bytes.length, true); c.setUint16(28, n.length, true); c.setUint32(42, offset, true); central.set(n, 46);
    locals.push(local, bytes); centrals.push(central); offset += local.length + bytes.length;
    if (offset > MAX_ARCHIVE_BYTES) throw new Error('Library exceeds the 256 MiB portable archive limit. Nothing was exported.');
  }
  const centralSize = centrals.reduce((sum, x) => sum + x.length, 0), end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true); e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
  if (offset + centralSize + 22 > MAX_ARCHIVE_BYTES) throw new Error('Archive exceeds 256 MiB.');
  return new Blob([...locals, ...centrals, end], { type: 'application/zip' });
}
export async function decodeZip(file) {
  if (file.size < 22 || file.size > MAX_ARCHIVE_BYTES) throw new Error('Archive must be a valid ZIP no larger than 256 MiB.');
  const bytes = new Uint8Array(await file.arrayBuffer()), v = new DataView(bytes.buffer), end = bytes.length - 22;
  const fail = () => { throw new Error('Malformed or unsupported archive. Use an unmodified Guitar Tools library backup (ZIP STORE).'); };
  if (v.getUint32(end, true) !== 0x06054b50 || v.getUint16(end + 4,true) || v.getUint16(end + 6,true) || v.getUint16(end + 20,true)) fail();
  const count = v.getUint16(end + 10,true), size = v.getUint32(end + 12,true), start = v.getUint32(end + 16,true);
  if (!count || count > 10001 || count !== v.getUint16(end + 8,true) || start + size !== end) fail();
  const result = new Map(); let p = start, localEnd = 0;
  for (let i = 0; i < count; i++) {
    if (p + 46 > end || v.getUint32(p,true) !== 0x02014b50) fail();
    const flags = v.getUint16(p+8,true), method = v.getUint16(p+10,true), crc = v.getUint32(p+16,true), length = v.getUint32(p+20,true), raw = v.getUint32(p+24,true);
    const nl = v.getUint16(p+28,true), extra = v.getUint16(p+30,true), comment = v.getUint16(p+32,true), at = v.getUint32(p+42,true);
    if ((flags !== 0x800 && flags !== 0) || method !== 0 || length !== raw || extra || comment || v.getUint16(p+34,true) || p+46+nl > end || at !== localEnd || at+30+nl+length > start) fail();
    const name = decoder.decode(bytes.subarray(p+46,p+46+nl)); safePath(name);
    if (result.has(name) || v.getUint32(at,true) !== 0x04034b50 || v.getUint16(at+6,true) !== flags || v.getUint16(at+8,true) !== method || v.getUint32(at+14,true) !== crc || v.getUint32(at+18,true) !== length || v.getUint32(at+22,true) !== raw || v.getUint16(at+26,true) !== nl || v.getUint16(at+28,true) || decoder.decode(bytes.subarray(at+30,at+30+nl)) !== name) fail();
    const data = bytes.slice(at+30+nl, at+30+nl+length);
    if (crc32(data) !== crc) throw new Error(`Archive checksum failed: ${name}`);
    result.set(name,data); localEnd = at+30+nl+length; p += 46+nl;
  }
  if (p !== end || localEnd !== start) fail();
  return result;
}
