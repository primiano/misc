'use strict';

class Hasher {
  constructor() {
    this._digest = 0x811c9dc5;
    this._len = 0;
  }
  update(x) {
    // if (this._len === 0)
    //   console.group('hasher')
    // this._len++;
    // console.log('H', x, ~~(x));
    this._digest ^= ~~x;
    this._digest *= 0x01000193;
  }
  get digest() {
    // console.log('H', this._len, this._digest.toString(16));
    // console.groupEnd();
    return this._digest;
  }
};

const encoder = new TextEncoder('utf-8');
const decoder = new TextDecoder('utf-8');

const TAG_MASK = 0x3;
const TAG_INT32 = 0;
const TAG_FLOAT64 = 1;
const TAG_STRING = 2;

// cells: a JS array of numbers and strings.
function binaryEncode(cells) {
  // Overestimate, will resize at the end.
  let buf = new ArrayBuffer(cells.length * 40);
  const b8 = new Uint8Array(buf);
  const b32 = new Uint32Array(buf);
  const f64 = new Float64Array(buf);

  b32[0] = cells.length;
  let dataOff = cells.length + 4;
  for (let i = 0; i < cells.length; i++) {
    const tagOff = 4 + i;
    const cell = cells[i];
    if (0 * cell === 0) {  // a number
      if (cell <= 0x7FFFFFFF) {
        b8[tagOff] = TAG_INT32;
        const idx = ~~((dataOff + 3) / 4);
        dataOff = (idx + 1) * 4;
        b32[idx] = cell;
      } else {
        b8[tagOff] = TAG_FLOAT64;
        const idx = ~~((dataOff + 7) / 8);
        dataOff = (idx + 1) * 8;
        f64[idx] = cell;
      }
    } else {  // a string
      if (cell.length >= 64) throw new Error('Not supported');
      b8[tagOff] = TAG_STRING | cell.length << 2;
      // Safari doesn't like encodeInto() and, in any case, we don't care about
      // encoding speed in this benchmark, only decoding.
      const enc = encoder.encode(cell);
      b8.set(enc, dataOff);
      dataOff += enc.length;
    }
  }
  dataOff = ~~((dataOff + 7) / 8) * 8;
  if (dataOff >= buf.byteLength) throw new Error('overflow');
  return buf.slice(0, dataOff);
}


function binaryProcess(buf) {
  const b8 = new Uint8Array(buf);
  const b32 = new Uint32Array(buf);
  const f64 = new Float64Array(buf);
  const numCells = b32[0];
  let dataOff = numCells + 4;
  const hasher = new Hasher();
  for (let i = 0; i < numCells; i++) {
    const hdr = b8[4 + i];
    const tag = hdr & TAG_MASK;
    let cell;
    if (tag === TAG_INT32) {
      const idx = ~~((dataOff + 3) / 4);
      cell = b32[idx];
      hasher.update(cell);
      dataOff = (idx + 1) * 4;
    } else if (tag === TAG_FLOAT64) {
      const idx = ~~((dataOff + 7) / 8);
      cell = f64[idx];
      hasher.update(cell);
      dataOff = (idx + 1) * 8;
    } else if (tag === TAG_STRING) {
      const len = (hdr >>> 2) & 0x3f;
      cell = decoder.decode(b8.subarray(dataOff, dataOff + len));
      hasher.update(cell.length);
      dataOff += len;
    }
  }
  return [numCells, hasher.digest];
}

// let N_ROWS = 20000;
// let N_COLS = 6;  // Must be > 2
// let N_TEXT_COLS = 2;
// let N_CELLS = N_ROWS * N_COLS;
// let CHECK = true;

// // Generate a pool of random strings.
// const RAND_STRINGS = [];
// for (let i = 0; i < 128; i++) {
//   // const len = (i + 1) * 8 + i;
//   const len = 16 + (i % 8);
//   let str = '';
//   for (let c = 0; c < len; c++) {
//     str += String.fromCharCode(65 + ((c + i) % 25));
//   }
//   RAND_STRINGS.push(str);
// }


// const TAG_MASK       = 0xC0000000;
// const TAG_NULL       = 0x00000000;
// const TAG_INLINE_INT = 0x80000000;
// const TAG_STRING     = 0x40000000;
// const TAG_FLOAT64    = 0xC0000000;

// // Writes a header with 4 bytes for each cell + payload at the end.
// // Allows seek at the cost of some extra overhead.
// function binaryEncode(buf) {
//   const b8 = new Uint8Array(buf);
//   const b32 = new Uint32Array(buf);
//   const f64 = new Float64Array(buf);

//   console.time('fill');
//   const expectedValues = [];
//   let dataOff = N_ROWS * N_COLS * 4;
//   for (let row = 0; row < N_ROWS; row++) {
//     for (let col = 0; col < N_COLS; col++) {
//       const cellIdx = row * N_COLS + col;
//       if (col < 2) {
//         const colValue = cellIdx;
//         expectedValues.push(colValue);
//         b32[cellIdx] = TAG_INLINE_INT | colValue;
//       } else if (col < N_COLS - N_TEXT_COLS) {
//         const colValue = 8000000000 + cellIdx;
//         expectedValues.push(colValue);
//         const idx64 = ~~((dataOff + 7) / 8);  // Align to the next 64b boundary.
//         f64[idx64] = colValue;
//         b32[cellIdx] = TAG_FLOAT64 | idx64;
//         dataOff = (idx64 + 1) * 8;
//       } else {
//         const colValue = RAND_STRINGS[cellIdx % RAND_STRINGS.length];
//         expectedValues.push(colValue);
//         const idx32 = ~~((dataOff + 3) / 4);  // Align to the next 32b boundary.
//         b32[cellIdx] = TAG_STRING | idx32;
//         dataOff = (idx32 + 1) * 4;  // Advance, these will be backfilled with the len.
//         const dst = b8.subarray(dataOff);
//         const written = encoder.encodeInto(colValue, dst).written;
//         b32[idx32] = written;
//         dataOff += written;
//       }
//     }
//   }
//   console.timeEnd('fill');
//   console.assert(dataOff <= buf.byteLength);
//   // return expectedValues;
//   return ~~((dataOff + 7) / 8) * 8;
// }

// function decodeUTF8(u8arr, off, len) {
//   const subArr = u8arr.subarray(off, off + len);
//   return decoder.decode(subArr);
// }

// function binaryDecode(buf) {
//   const b8 = new Uint8Array(buf);
//   const b32 = new Uint32Array(buf);
//   const f64 = new Float64Array(buf);

//   console.time('parse');
//   const actualValues = [];
//   const cellHdr = new Uint32Array(buf, 0, N_CELLS);
//   for (let cell = 0; cell < N_CELLS; cell++) {
//     const hdr = cellHdr[cell];
//     const inlineValue = hdr & ~TAG_MASK;
//     let cellValue = undefined;
//     switch(hdr & TAG_MASK) {
//       case TAG_INLINE_INT & TAG_MASK:
//         cellValue = inlineValue;
//         actualValues.push(cellValue);
//         break;
//       case TAG_FLOAT64 & TAG_MASK:
//         cellValue = f64[inlineValue];
//         actualValues.push(cellValue);
//         break;
//       case TAG_STRING & TAG_MASK:
//         const len = b32[inlineValue];
//         const off = (inlineValue + 1) * 4;
//         cellValue = decodeUTF8(b8, off, len);
//         actualValues.push(cellValue);
//         break;
//       default:
//         console.assert(false);
//     }
//     // console.assert(cellValue !== undefined);
//   }
//   console.timeEnd('parse');

//   return actualValues;
// }
