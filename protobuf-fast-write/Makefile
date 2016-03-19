CXX=clang++
PROTODIR=protobuf/src
PROTOC=$(PROTODIR)/protoc
CFLAGS=-fno-rtti -fno-exceptions -Wall -Wno-unused-parameter -std=c++11 -O2
CFLAGS+=-DNDEBUG -DGOOGLE_PROTOBUF_NO_RTTI -DHAVE_PTHREAD

out/libproto.o: Makefile
	$(CXX) $(CFLAGS) -I$(PROTODIR)/.. -I$(PROTODIR) -shared -o $@ \
		$(PROTODIR)/google/protobuf/stubs/common.cc \
		$(PROTODIR)/google/protobuf/stubs/once.cc \
		$(PROTODIR)/google/protobuf/generated_message_util.cc \
		$(PROTODIR)/google/protobuf/message_lite.cc \
		$(PROTODIR)/google/protobuf/repeated_field.cc \
		$(PROTODIR)/google/protobuf/wire_format_lite.cc \
		$(PROTODIR)/google/protobuf/io/coded_stream.cc \
		$(PROTODIR)/google/protobuf/io/zero_copy_stream.cc \
		$(PROTODIR)/google/protobuf/io/zero_copy_stream_impl_lite.cc

out/main_proto: main.cc out/libproto.o gen/event.pb.cc Makefile
	$(CXX) $(CFLAGS) -DUSE_PROTO -o $@ $< out/libproto.o -I. -I$(PROTODIR)

out/main_me: main.cc Makefile
	$(CXX) $(CFLAGS) -o $@ $<

gen/event.pb.cc: event.proto $(PROTOC)
	$(PROTOC) --cpp_out=gen $<

N=2000000
benchmark: out/main_me out/main_proto
	@echo "\n\nTesting protobuf-based implementation"
	out/main_proto $(N)
	@echo "\n\nTesting home-brewed implementation"
	out/main_me $(N)

all: out/main_proto out/main_me
