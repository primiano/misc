This is a proof-of-concept about a faster (10x-20x), zero-copy, zero-malloc
approach to encode protobufs.
The idea is: instead of copying fields inside the generated stub (and stashing into vectors, which require all sort of heap traffic) and later reading them back and encoding into the buffer, directly encode as the
set_X() methods are called.
The code becomes incredibly simple, and the final implementation very fast.


It comes with a price to pay:
 - The generate stub API can be append-only (no get_X(), has_x() methods, they'd
   be rather complex to implement)
 - Nested messages can be supported, but cannot be filled into an interleaved
   fashion. Example:

 ~~~
 Message Element {
  required string name;
  required int64 id;
 }

 Message Container {
   required int64 id;
   repeated Element elements;
 }
 ~~~

 The following can be supported:
 ~~~~~
 Container* container = ... whatever
 container->set_id(42);
 Element* e1 = container->add_element();
 e1->set_name(...);
 e1->set_id(...);
 Element* e2 = container->add_element();
 e2->set_name(...);
 e2->set_id(...);
 ~~~~~

 The following, instead, cannot be supported:
 ~~~~~
 Container* container = ... whatever
 container->set_id(42);
 Element* e1 = container->add_element();
 Element* e2 = container->add_element();
 e1->set_name(...);
 e2->set_name(...);
 e1->set_id(...);
 e2->set_id(...);
 ~~~~~

 ## Benchmark repro

~~~~~~
$ git clone --recursive https://github.com/primiano/misc.git
$ cd protobuf-fast-write
$ make benchmark

Testing protobuf-based implementation (repeating 2 times)
out/main_libprotobuf 2000000
Wrote 147950464 bytes
Checksum: 8d303004a5fd080
Run-time (us): 1265626
out/main_libprotobuf 2000000
Wrote 147950464 bytes
Checksum: 8d303004a5fd080
Run-time (us): 1220125


Testing home-brewed implementation (repeating 2 times)
out/main_homebrewed 2000000
Wrote 147950464 bytes
Checksum: 8d303004a5fd080
Run-time (us): 53181
out/main_homebrewed 2000000
Wrote 147950464 bytes
Checksum: 8d303004a5fd080
Run-time (us): 49932
~~~~~~
