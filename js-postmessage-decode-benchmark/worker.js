'use strict';

self.importScripts('binary_serializer.js');

const NUM_CELLS = 100000;

// Generate a pool of random strings of random length [16, 32].
const RAND_STRINGS = [];
for (let i = 0; i < 128; i++) {
  let str = '';
  for (let c = 0; c < 16 + (i % 16); c++)
    str += String.fromCharCode(65 + ((c + i) % 25));
  RAND_STRINGS.push(str);
}

// stringRatio needs to be 0-10 (it's 10% steps).
//  0: no strings
//  10: 100% of cells are strings.
function genFakeTableData(nCells, stringRatio) {
  let res = [];
  for (let i = 0; i < nCells; i++) {
    let value;
    if (i % 10 < stringRatio) {
      value = RAND_STRINGS[i % RAND_STRINGS.length];
    } else if (i % 2 == 0) {
      value = i % 64;  // Simulate small ints, quite frequent in tracing.
    } else {
      value = i * 1000000000 + 1;  // Simulate a large timestamp.
    }
    res.push(value);
  }
  return res;
}

let g_ratio = 0;
let g_obj =  undefined; //genFakeTableData(NUM_CELLS, STRING_RATIO_DECA);
let g_buf =  undefined; //binaryEncode(g_obj);
let g_json = undefined; // JSON.stringify(g_obj);
let g_bufCopies = [];

self.onmessage = (e) => {
  let transferList = [];
  const reply = {
    numCells: NUM_CELLS,
    strRatio: g_ratio,
    type: e.data.type,
    tStart: e.data.tStart,
    tWorkerStart: Date.now(),
    tWorkerEnd: undefined,
  };
  if (e.data.type.startsWith('set_ratio_')) {
    g_ratio = parseInt(e.data.type.substr(10));
    g_obj = genFakeTableData(NUM_CELLS, g_ratio);
    g_buf = binaryEncode(g_obj);
    g_json = JSON.stringify(g_obj);
    g_bufCopies = [];
    for (let i = 0; i < 20; i++)
      g_bufCopies[i] = g_buf.slice();
  } else if (e.data.type === 'buf') {
    reply.buf = g_buf;
  } else if (e.data.type === 'buf_cpy') {
    reply.buf = g_buf.slice();
    transferList = [reply.buf];
  } else if (e.data.type === 'buf_xfr') {
    if (g_bufCopies.length === 0) throw new Error('Ran out');
    reply.buf = g_bufCopies.pop();
    transferList = [reply.buf];
  } else if (e.data.type === 'obj') {
    reply.buf = g_obj;
  } else if (e.data.type === 'json') {
    reply.buf = g_json;
  } else {
    reply.buf = 'UNKNOWN';
  }

  reply.tWorkerEnd = Date.now();
  self.postMessage(reply, transferList);
};