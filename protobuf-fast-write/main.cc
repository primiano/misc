#include <stdio.h>
#include <stdint.h>
#include <string>

#include <time.h>

#ifdef USE_PROTO
#include "google/protobuf/io/zero_copy_stream_impl_lite.h"
#include "gen/event.pb.cc"
#else

struct Event {
  Event(char* start) : start_(start), ptr_(start) {}

  void WriteByte(char b) {
    *ptr_ = b;
    ptr_++;
  }

  void WriteVarInt(uint64_t v) {
    // Didn't bother with signed-zigzag stuff sorry.
    v &= 0x7FFFFFFF;
    do {
      char w = (char) (v & 0x7F);
      v >>= 7;
      if (v)
        w |= 0x80;
      WriteByte(w);
    } while(v);
  }

  void WriteField(int id, uint64_t v) {
    WriteVarInt(id << 3);
    WriteVarInt(v);
  }

  void WriteString(int id, const char* s) {
    WriteVarInt((id << 3) | 2);
    uint64_t size = strlen(s);
    WriteVarInt(size);
    memcpy(ptr_, s, size);
    ptr_ += size;
  }

  void set_id(uint64_t v) {
    WriteField(1, v);
  }

  void set_timestamp(uint64_t v) {
    WriteField(2, v);
  }

  void set_thread_timestamp(uint64_t v) {
    WriteField(3, v);
  }

  void set_category(const char* s) {
    WriteString(4, s);
  }

  void set_name(const char* s) {
    WriteString(5, s);
  }

  char* ptr() { return ptr_; }

  char* start_;
  char* ptr_;
};
#endif  // USE_PROTO

const char* STRINGS[] = {
  "AAAA  1234567890abcdefgh AAAA",
  "BBBB  1234567890abcdefgh BBBB",
  "CCCC  1234567890abcdefgh CCCC",
  "DDDD  1234567890abcdefgh DDDD",
};

int main(int argc, char** argv) {
  if (argc < 2) {
    fprintf(stderr, "Usage: %s N_ITERATIONS\n", argv[0]);
    return 1;
  }
  const int N = atoi(argv[1]);
  const size_t SIZE = N * 256;
  char* buf = (char*) malloc(SIZE);
  memset(buf, 0, SIZE);
  char* cur = buf;
  if (!buf) {
    fprintf(stderr, "Buffer too big, malloc failed.");
    return 1;
  }

#ifdef USE_PROTO
  google::protobuf::io::ArrayOutputStream aos(buf, SIZE);
#endif

  clock_t t_start = clock();

  for (int i = 0; i < N; ++i ){
#ifdef USE_PROTO
    Event x;
#else
    Event x(cur);
#endif
    x.set_id(i);
    x.set_timestamp(i);
    x.set_thread_timestamp(i);
    x.set_category(STRINGS[i & 3]);
    x.set_name(STRINGS[i & 3]);
#ifdef USE_PROTO
    x.SerializeToZeroCopyStream(&aos);
#else
  cur = x.ptr();
#endif
  }

  clock_t t_end = clock();

  // Boring printing stuff below this point;
#ifdef USE_PROTO
  size_t size = aos.ByteCount();
  cur = buf + size;
#else
  size_t size = cur - buf;
#endif
  printf("Wrote %zu bytes\n", size);

  if (N < 128) {
    for (size_t i = 0; i < size; ++i)
      printf("%02X ", buf[i] & 0xFF);
      printf("\n");
  } else {
    uint64_t csum = 0;
    for (size_t i = 0; i < size; i += sizeof(uint64_t))
      csum += (csum << 11) ^ *(uint64_t*)(buf + i);
    printf("Checksum: %llX\n", csum);
  }
  printf("Run-time (us): %lu\n", (t_end - t_start) * 1000000 / CLOCKS_PER_SEC);
  return 0;
}
