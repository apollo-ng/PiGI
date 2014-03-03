import datetime
import logging
import threading
import time

log = logging.getLogger(__name__)

class EntropyGenerator(threading.Thread):
    def __init__(self,outfile):
        self.outfile = outfile
        
        threading.Thread.__init__(self)
        self.daemon = True
       
        #setup vars for randomness production
        self.tick_counter = 0
        self.toggle = False
        self.t0 = self.t1 = self.t2 = datetime.datetime.now()
        self.bitstring = ""
        
        self.start()
    
    def run(self):
        log.info("Starting entropy generator")
        while True:
            time.sleep(1)
            self.handle_bitstring()
        
    def tick (self):
        # This works like this:
        # time:   |------------|-------------|-----------|-----------|
        # tick 0: t0
        # tick 1: t0           t1
        # tick 2: t2           t1            t0
        #                d0            d1
        # tick 3: t2                         t0          t1
        # tick 4:                            t2          t1          t0
        #                                          dO          d1

        self.tick_counter += 1
        if (self.tick_counter % 2) == 0:
            self.t2 = self.t0
            self.t0 = datetime.datetime.now()
            d0 = self.t1 - self.t2
            d1 = self.t0 - self.t1

            if d0 > d1:
                self.bitstring += "1" if self.toggle else "0"
            elif d0 < d1:
                self.bitstring += "0" if self.toggle else "1"
            else: #d0 = d1
                print "Collision"

            self.toggle = not self.toggle

        else:
            self.t1 = datetime.datetime.now()


    def handle_bitstring(self):
        with open(self.outfile, "ab") as f:
            while len(self.bitstring)>=8:
                byte_bin = self.bitstring[:8]
                self.bitstring = self.bitstring[8:]
                byte_int = int(byte_bin,2)
                byte_hex = hex(byte_int)
                byte_chr = chr(byte_int)
                log.debug("new random byte:%s  %3d %4s %s"%(byte_bin,byte_int,
                                        byte_hex,byte_chr))
                f.write(byte_chr)


if __name__ == "__main__":
    logging.basicConfig(level="DEBUG")
    eg = EntropyGenerator("test.bin")
    while True:
        eg.tick()
        time.sleep(0.1)
