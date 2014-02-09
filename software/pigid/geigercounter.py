import threading
import time
import random
import datetime
import logging
import json
from collections import deque

import config

log = logging.getLogger(__name__)

try:
    import RPi.GPIO as GPIO
    gpio_available = True
except ImportError:
    msg = "Could not initialize GPIOs, geigercounter operation will only be simulated!"
    log.warning(msg)
    gpio_available = False


class TickSimulator (threading.Thread):
    def __init__(self, geiger):
        threading.Thread.__init__(self)
        self.daemon = True
        self.geiger = geiger
    
    def run(self):
        while True:
            time.sleep(random.random()*1)
            self.geiger.tick()
                
class Geigercounter (threading.Thread):
    def __init__(self, simulate=False):
        threading.Thread.__init__(self)
        self.daemon = True
        self.socket = None
        self.last_tick = None
        self.simulate = simulate
        self.reset()
        self.start()

    def reset(self):
        self.count=0
    
    def tick(self, pin=None):
        self.count += 1
        now = datetime.datetime.now()
        
        if self.last_tick is not None:
            time_delta = (now - self.last_tick ).total_seconds()
            cpm = 60.0/time_delta
            #print "cpm: %.2f"%cpm
        #print "Ticks: %d"%self.count
        if self.socket:
            try:
                self.socket.send(json.dumps({"type":"TICK"}))
            except:
                print "SOCKET ERROR"
        self.last_tick = now
    
    def run(self):
        if gpio_available:
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(GPIO_PIGI,GPIO.IN)
            GPIO.add_event_detect(GPIO_PIGI,GPIO.FALLING)
            GPIO.add_event_callback(GPIO_PIGI,self.tick)
        else:
            TickSimulator(self).start()
        
        rate_length = 5
        rate_step = 1
        
        rate_fifo = deque([],rate_length)
        r2_fifo = deque([],rate_length)
        while True:
            time.sleep(rate_step)
            rate_fifo.appendleft(self.count)
            self.count = 0
            rate = float(sum(rate_fifo))/float(len(rate_fifo))/float(rate_step)
            print "cps: %.2f"%(rate)
            r2_fifo.appendleft(rate)
            r = sum(r2_fifo)/float(len(rate_fifo))
            print "cpm: %.2f"%(r*60)
            print
        

    def get_state(self):
        state = {
            'count': self.counts,
        }
        return state
