import threading
import time
import random
import datetime
import logging
import json
from collections import deque
from geventwebsocket import WebSocketError

import config

log = logging.getLogger(__name__)

try:
    import RPi.GPIO as GPIO
    gpio_available = True
except ImportError:
    msg = "Could not initialize GPIOs, geigercounter operation will only be simulated!"
    log.warning(msg)
    gpio_available = False

class WebSocketsManager():
    def __init__(self):
        self.sockets = []
        
    def add_socket(self,socket):
        self.sockets.append(socket)
        log.info("added socket %s"%socket)
        
    def send(self,msg_dict):
        msg_json = json.dumps(msg_dict)
        for socket in self.sockets:
            try:
                socket.send(msg_json)
            except WebSocketError:
                self.sockets.remove(socket)
                log.error("could not write to socket %s"%socket)
            except NotImplementedError:
                pass

class TickSimulator (threading.Thread):
    def __init__(self, geiger):
        threading.Thread.__init__(self)
        self.daemon = True
        self.geiger = geiger
    
    def run(self):
        while True:
            time.sleep(random.random()/1)
            self.geiger.tick()
                
class Geigercounter (threading.Thread):
    def __init__(self, ws_mgr, simulate=False):
        threading.Thread.__init__(self)
        self.daemon = True
        self.socket = None
        
        self.ws_mgr = ws_mgr
        self.simulate = simulate

        
        self.last_tick = None
        self.reset()
        self.start()

    def reset(self):
        self.count=0
        self.totalcount=0
    
    def tick(self, pin=None):
        self.count += 1
        self.totalcount += 1
        self.ws_mgr.send({"type":"tick"})
    
    def run(self):
        if gpio_available:
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(config.gpio_pigi,GPIO.IN)
            GPIO.add_event_detect(GPIO_PIGI,GPIO.FALLING)
            GPIO.add_event_callback(GPIO_PIGI,self.tick)
        else:
            TickSimulator(self).start()
        
        rate_length = 5
        rate_step = 1
        
        cpm_fifo = deque([],60*rate_step)
        rate_fifo = deque([],rate_length)
        r2_fifo = deque([],rate_length)
        while True:
            time.sleep(rate_step)
            cpm_fifo.appendleft(self.count)
            #rate_fifo.appendleft(self.count)
            print "cps: %d"%(self.count)
            
            #rate = float(sum(rate_fifo))/float(len(rate_fifo))/float(rate_step)
            
            #r2_fifo.appendleft(rate)
            #r = sum(r2_fifo)/float(len(rate_fifo))
            #print "cpm: %.2f"%(r*60)
            print "cpm: %d"%sum(cpm_fifo)
            print
            cpm = sum(cpm_fifo)
            
            msg = {
                "type": "status",
                "cps": self.count,
                "cpm": cpm,
                "total": self.totalcount,
                "doserate": round(cpm * config.tube_rate_factor,2)
            }
            self.count = 0
            self.ws_mgr.send(msg)

    def get_state(self):
        state = {
            'count': self.counts,
        }
        return state
