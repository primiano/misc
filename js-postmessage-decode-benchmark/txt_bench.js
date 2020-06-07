'use strict';


// Generate a pool of random strings of random length [16, 32].
const RAND_STRINGS = [];
for (let i = 0; i < 128; i++) {
  let str = '';
  for (let c = 0; c < 16 + (i % 16); c++)
    str += String.fromCharCode(65 + ((c + i) % 25));
  RAND_STRINGS.push(str);
}



function AsciiToStr(array, start, end) {
  let out = '';
  for (let i = start; i < end; i++) {
    const c = array[i];
    out += String.fromCharCode(c);
  }
  return out;
}

function runTxtBench() {
  const BROWSER = navigator.userAgent.match(/(Chrome|Safari|Firefox)\/(\d|\.)+/)[0];
  const encoder = new TextEncoder('utf-8');
  const decoder = new TextDecoder('utf-8');

  // Prepare
  const NUM_STRINGS = 10000;
  const strArr = [];
  for (let i = 0; i < NUM_STRINGS; i++)
    strArr.push(RAND_STRINGS[i % RAND_STRINGS.length]);

  const json = JSON.stringify(strArr);

  let arr1 = new Uint8Array(NUM_STRINGS * 64);  // Overestimate
  let arr2 = new Uint8Array(NUM_STRINGS * 64);  // Overestimate

  let off1 = 0;
  let off2 = 0;
  for (const str of strArr) {
    const enc = encoder.encode(str)
    const len = enc.length;
    console.assert(len <= 0xff);

    arr1[off1++] = len;
    arr1.set(enc, off1);
    off1 += len;

    arr2.set(enc, off2);
    off2 += len;
    arr2[off2++] = 0; // space
  }
  off2--;  // Remove last space.
  arr1 = arr1.slice(0, off1);
  arr2 = arr2.slice(0, off2);

  // Decode

  for (let rep = 0; rep < 20; rep++) {
    // 1. Json
    let res1 = 0;
    const t1 = performance.now();
    const dataJ = JSON.parse(json);
    for (const str of dataJ)
      res1 += str.length;
    const t2 = performance.now();

    // 2. Individual strings using TextDecoder
    let res2 = 0;
    for (let off1 = 0; off1 < arr1.length;) {
      const len = arr1[off1++];
      if (len === 0)
        break;
      const str = decoder.decode(arr1.subarray(off1, off1 + len));
      off1 += len;
      res2 += str.length;
    }

    const t3 = performance.now();

    // 3. Individual strings using AsciiToStr
    let res3 = 0;
    for (let off1 = 0; off1 < arr1.length;) {
      const len = arr1[off1++];
      if (len === 0)
        break;
      const str = AsciiToStr(arr1, off1, off1 + len);
      off1 += len;
      res3 += str.length;
    }

    const t4 = performance.now();

    // 4. One large string
    let res4 = 0;
    const strings3 = decoder.decode(arr2).split('\0');
    for (const str of strings3)
      res4 += str.length;

    const t5 = performance.now();

    // console.log(res1, res2, res3, res4);
    console.assert(res1 == res2 &&  res2 == res3 && res4 == res3);
    const tJson = Math.round((t2 - t1) * 100) / 100;
    const tTextDec = Math.round((t3 - t2) * 100) / 100;
    const tCharCode = Math.round((t4 - t3) * 100) / 100;
    const tSplit = Math.round((t5 - t4) * 100) / 100;
    csvAppend(`${BROWSER},${tJson},${tTextDec},${tCharCode},${tSplit}`);
  }

}