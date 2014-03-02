import threading
import os
import time
import random
import datetime
import logging

from collections import deque
from configurator import cfg

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
        log.info("Starting tick simulator")
        
    def run(self):
        while True:
            ratefactor = cfg.getfloat('geigercounter','tube_rate_factor')
            simrate = cfg.getfloat('geigercounter','sim_dose_rate')
            rate = simrate/ratefactor
            time.sleep(random.random()/rate*120)
            self.geiger.tick()


class Geigercounter (threading.Thread):
    def __init__(self,total=0):
        log.info("Starting geigercounter")
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
            gpio_port = cfg.getint('geigercounter','gpio_port') 
            GPIO.setup(gpio_port,GPIO.IN)
            GPIO.add_event_detect(gpio_port,GPIO.FALLING)
            GPIO.add_event_callback(gpio_port,self.tick)
        else:
            TickSimulator(self).start()

        cpm_fifo = deque([],60)
        while True:
            time.sleep(1)

            # Statistical correction of tube dead-time
            if gpio_available:
                deadtime = cfg.getfloat('geigercounter','tube_dead_time')
                self.count = int(self.count/(1-(self.count*deadtime)))

            cpm_fifo.appendleft(self.count)

            self.cpm = int(sum(cpm_fifo)*60.0/len(cpm_fifo))
            self.cps = self.count
            ratefactor = cfg.getfloat('geigercounter','tube_rate_factor')
            self.eqd = round(self.cpm * ratefactor,2)

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
