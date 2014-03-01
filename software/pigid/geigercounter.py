import threading
import os
import time
import random
import datetime
import logging

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
        self.rate = (config.sim_dose_rate/config.tube_rate_factor)/120.0

    def run(self):
        while True:
            time.sleep(random.random()/self.rate)
            self.geiger.tick()


class Geigercounter (threading.Thread):
    def __init__(self,total=0):
        threading.Thread.__init__(self)
        self.daemon = True
        self.socket = None
        self.totalcount=total
        self.reset()
        self.start()

    def reset(self):
        self.count=0
        self.cps=0
        self.cpm=0
        self.eqd=0

    def tick(self, pin=None):
        self.count += 1
        self.totalcount += 1

    def run(self):
        if gpio_available:
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(config.gpio_pigi,GPIO.IN)
            GPIO.add_event_detect(config.gpio_pigi,GPIO.FALLING)
            GPIO.add_event_callback(config.gpio_pigi,self.tick)
        else:
            TickSimulator(self).start()

        cpm_fifo = deque([],60)
        while True:
            time.sleep(1)

            # Statistical correction of tube dead-time
            if gpio_available:
                self.count = int(self.count/(1-(self.count*config.tube_dead_time)))

            cpm_fifo.appendleft(self.count)

            self.cpm = int(sum(cpm_fifo)*60.0/len(cpm_fifo))
            self.cps = self.count
            self.eqd = round(self.cpm * config.tube_rate_factor,2)

            self.count = 0
            log.debug(self.get_state())

    def get_state(self):
        msg = {
                "type": "status",
                "cps": self.cps,
                "cpm": self.cpm,
                "total": self.totalcount,
                "doserate": self.eqd,
                "timestamp": int(datetime.datetime.now().strftime("%s"))
            }
        return msg
