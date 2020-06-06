'use strict';

const logEl = document.getElementById('log');
const csvEl = document.getElementById('csv');
const worker = new Worker('worker.js');
let csvRes = '';
let log = '';
let msgQueue = [];
let writeHeader = true;
const BROWSER = navigator.userAgent.match(/(Chrome|Safari|Firefox)\/(\d|\.)+/)[0];


function csvAppend(msg) {
  csvRes += msg + '\n';
  log += msg.split(',').map(x => x.padStart(10)).join(' ') + '\n';
  logEl.value = log;
  csvEl.value = csvRes;
}

// For all % binary cases.
function simulateCellComuptation(cells) {
  const hasher = new Hasher();
  for (const cell of cells) {
    if (0 * cell === 0) {  // a number
      hasher.update(cell);
    } else {  // a string.
      hasher.update(cell.length);
    }
  }
  return hasher.digest;
}

function processMsg(data) {
  const tMainRx = Date.now();
  let numCells = 0;
  let computeRes = 0;
  if (data.type.indexOf('buf') >= 0) {
    const arr = binaryProcess(data.buf);
    numCells = arr[0];
    computeRes = arr[1];;
  } else if (data.type === 'obj') {
    numCells = data.buf.length;
    computeRes = simulateCellComuptation(data.buf);
  } else if (data.type === 'json') {
    const decoded = JSON.parse(data.buf);
    numCells = decoded.length;
    computeRes = simulateCellComuptation(decoded);
  }
  if (numCells !== data.numCells) throw new Error('Num cells mismatch');
  const tEnd = Date.now();

  const e2eMs = tEnd - data.tStart;
  const txMs = data.tWorkerStart - data.tStart;
  const wrkMs = data.tWorkerEnd - data.tWorkerStart;
  const rxMs = tMainRx - data.tWorkerEnd;
  const procMs = tEnd - tMainRx;
  let len = 0;
  if (data.buf && data.buf.byteLength !== undefined) {
    len = data.buf.byteLength;
  } else if (data.buf && data.buf.length !== undefined) {
    len = data.buf.length;
  }
  if (writeHeader) {
    writeHeader = false;
    csvAppend('BROWSER,TYPE,NCELLS,STR_RATIO,E2E,TX,WRK,RX,DEC,WIRE,HASH');
  }
  csvAppend(`${BROWSER},${data.type},${data.numCells},${data.strRatio},${e2eMs},${txMs},${wrkMs},${rxMs},${procMs},${len},${computeRes.toString(16)}`);
}

function startJob(type) {
  worker.postMessage({type: type, tStart: Date.now()});
}

worker.onmessage = (e) => {
  if (!e.data.type.startsWith('set_ratio_'))
    processMsg(e.data);

  // Send next
  if (msgQueue.length > 0) {
    const type = msgQueue.shift();
    setTimeout(() => startJob(type), 10);  // Play nicely with TurboBoost.
  }
};

function start() {
  writeHeader = true;
  for (let strRatio = 0; strRatio <= 10; strRatio++) {
    msgQueue.push(`set_ratio_${strRatio}`);
    for (let i = 0; i < 10; i++) {
      msgQueue.push('buf');
      msgQueue.push('buf_cpy');
      msgQueue.push('buf_xfr');
      msgQueue.push('obj');
      msgQueue.push('json');
    }
  }
  startJob('set_ratio_0');
}

// Give some time to the worker to start. Science has proven that no workers
// start later than 200ms on any browser :)
setTimeout(start, 200);
