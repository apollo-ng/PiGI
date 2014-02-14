#!/usr/bin/env python
#minimal geigercounter

import time
import threading
import random

try:
    import RPi.GPIO as GPIO
    geiger_simulate = False
except ImportError:
    print "Simulating"
    geiger_simulate = True
    
GPIO_PIGI = 4
SIM_PER_SEC = 100

class GeigerCounter():
    def __init__(self):
        self.tick_counter = 0
        
        if geiger_simulate:
            self.simulator = threading.Thread(target=self.simulate_ticking)
            self.simulator.daemon = True
            self.simulator.start()
        else:
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(GPIO_PIGI,GPIO.IN)
            GPIO.add_event_detect(GPIO_PIGI,GPIO.FALLING)
            GPIO.add_event_callback(GPIO_PIGI,self.tick)
    
    def simulate_ticking(self):
        while True:
            time.sleep(random.random()/(2*SIM_PER_SEC))
            self.tick()
    
    def tick (self,pin=0):
        self.tick_counter += 1
        print "Ticks: %d"%self.tick_counter


if __name__ == "__main__":
    gc = GeigerCounter()
    while True:
        time.sleep(1)
