// 產一個最小合法 .glb(四角錐/方尖碑)當「可替換模型」管線的測試素材。零依賴,手刻 glb 二進位。
// 用法:node tools/make-test-glb.mjs <輸出路徑.glb>
import { writeFileSync } from 'node:fs';
const out = process.argv[2] || '/tmp/test-pyramid.glb';

// 方尖碑:方形底 + 尖頂(5 頂點 6 三角)
const pos = new Float32Array([ -1,0,-1,  1,0,-1,  1,0,1,  -1,0,1,  0,3.2,0 ]);
const idx = new Uint16Array([ 0,1,4, 1,2,4, 2,3,4, 3,0,4, 0,2,1, 0,3,2 ]);
const min=[-1,0,-1], max=[1,3.2,1];

const posBytes = Buffer.from(pos.buffer);
const idxBytes = Buffer.from(idx.buffer);
const pad4 = b => b.length%4 ? Buffer.concat([b, Buffer.alloc(4-b.length%4)]) : b;
const posP = pad4(posBytes), idxP = pad4(idxBytes);
const bin = Buffer.concat([posP, idxP]);

const gltf = {
  asset:{version:'2.0', generator:'make-test-glb'},
  scene:0, scenes:[{nodes:[0]}], nodes:[{mesh:0}],
  meshes:[{primitives:[{attributes:{POSITION:0}, indices:1}]}],
  buffers:[{byteLength:bin.length}],
  bufferViews:[
    {buffer:0, byteOffset:0,            byteLength:posBytes.length, target:34962},
    {buffer:0, byteOffset:posP.length,  byteLength:idxBytes.length, target:34963},
  ],
  accessors:[
    {bufferView:0, componentType:5126, count:5,  type:'VEC3', min, max},   // FLOAT positions
    {bufferView:1, componentType:5123, count:18, type:'SCALAR'},           // USHORT indices
  ],
};
let json = Buffer.from(JSON.stringify(gltf), 'utf8');
const jpad = (4 - json.length % 4) % 4;                // JSON chunk 必須用「空白 0x20」補滿到 4(用 0x00 會被當非法字元)
if (jpad) json = Buffer.concat([json, Buffer.from(' '.repeat(jpad))]);

const chunk = (data, type) => { const h=Buffer.alloc(8); h.writeUInt32LE(data.length,0); h.writeUInt32LE(type,4); return Buffer.concat([h,data]); };
const jsonChunk = chunk(json, 0x4E4F534A);  // 'JSON'
const binChunk  = chunk(bin,  0x004E4942);  // 'BIN\0'
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546C67, 0);        // 'glTF'
header.writeUInt32LE(2, 4);                  // version
header.writeUInt32LE(12 + jsonChunk.length + binChunk.length, 8);
writeFileSync(out, Buffer.concat([header, jsonChunk, binChunk]));
console.log('wrote', out, '—', 12+jsonChunk.length+binChunk.length, 'bytes');
