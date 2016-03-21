CXX=g++
PROTOBUF_DIR=google_protobuf
CFLAGS=-fno-rtti -fno-exceptions -Wall -Wno-unused-parameter -fPIC -std=c++11 -O2
CFLAGS+=-DNDEBUG -DGOOGLE_PROTOBUF_NO_RTTI -DHAVE_PTHREAD
LIBPROTOBUF=libprotobuf.a

all: out/main_proto out/main_me

out/:
	mkdir -p $@

gen/:
	mkdir -p $@

out/protoc out/$(LIBPROTOBUF): $(PROTOBUF_DIR) | out/
	git -C $(PROTOBUF_DIR) clean -dxf
	(cd $(PROTOBUF_DIR); ./autogen.sh && ./configure && make --quiet -j)
	@cp $(PROTOBUF_DIR)/src/protoc out/protoc
	@cp $(PROTOBUF_DIR)/src/.libs/$(LIBPROTOBUF) out/$(LIBPROTOBUF)

gen/event.pb.cc: event.proto out/protoc | gen/
	out/protoc --cpp_out=gen $<

out/main_libprotobuf: main.cc out/$(LIBPROTOBUF) gen/event.pb.cc Makefile
	$(CXX) $(CFLAGS) -I. -I$(PROTOBUF_DIR)/src -DUSE_PROTO -o $@ $< out/$(LIBPROTOBUF)

out/main_homebrewed: main.cc Makefile
	$(CXX) $(CFLAGS) -o $@ $<

N=2000000
benchmark: out/main_libprotobuf out/main_homebrewed
	@echo "\n\nTesting protobuf-based implementation (repeating 2 times)"
	out/main_libprotobuf $(N)
	out/main_libprotobuf $(N)
	@echo "\n\nTesting home-brewed implementation (repeating 2 times)"
	out/main_homebrewed $(N)
	out/main_homebrewed $(N)

#
# out/libprotobuf-lite.o: out/protoc Makefile
# 	$(CXX) $(CFLAGS) -I$(PROTOBUF_DIR)/src/.. -I$(PROTOBUF_DIR)/src -shared -o $@ \
# 		$(PROTOBUF_DIR)/src/google/protobuf/stubs/atomicops_internals_x86_gcc.cc \
# 		$(PROTOBUF_DIR)/src/google/protobuf/stubs/common.cc \
# 		$(PROTOBUF_DIR)/src/google/protobuf/stubs/once.cc \
# 		$(PROTOBUF_DIR)/src/google/protobuf/generated_message_util.cc \
# 		$(PROTOBUF_DIR)/src/google/protobuf/message_lite.cc \
# 		$(PROTOBUF_DIR)/src/google/protobuf/repeated_field.cc \
# 		$(PROTOBUF_DIR)/src/google/protobuf/wire_format_lite.cc \
# 		$(PROTOBUF_DIR)/src/google/protobuf/io/coded_stream.cc \
# 		$(PROTOBUF_DIR)/src/google/protobuf/io/zero_copy_stream.cc \
# 		$(PROTOBUF_DIR)/src/google/protobuf/io/zero_copy_stream_impl_lite.cc
