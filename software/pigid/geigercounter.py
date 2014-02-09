import threading
import time
import random
import datetime
import logging
import json

import config

log = logging.getLogger(__name__)


GPIO_PIGI = 4

try:
    import RPi.GPIO as GPIO
    gpio_available = True
except ImportError:
    msg = "Could not initialize GPIOs, geigercounter operation will only be simulated!"
    log.warning(msg)
    gpio_available = False


class Geigercounter (threading.Thread):
    def __init__(self, simulate=False):
        threading.Thread.__init__(self)
        self.daemon = True
        self.socket = None
        self.simulate = simulate
        self.reset()
        self.start()

    def reset(self):
        self.count=0
    
    def tick(self, pin=None):
        self.count += 1
        print "Ticks: %d"%self.count
        if self.socket:
            try:
                self.socket.send(json.dumps({"type":"TICK"}))
            except:
                print "SOCKET ERROR"
    
    def run(self):
        if gpio_available:
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(GPIO_PIGI,GPIO.IN)
            GPIO.add_event_detect(GPIO_PIGI,GPIO.FALLING)
            GPIO.add_event_callback(GPIO_PIGI,self.tick)
        
        while True:
            time.sleep(random.random())
            if not gpio_available:
                self.tick()


    def get_state(self):
        state = {
            'count': self.counts,
        }
        return state
