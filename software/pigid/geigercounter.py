import threading
import time
import random
import datetime
import logging
import json
import leveldb
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
            
class WebSocketsManager(threading.Thread):
    def __init__(self,geiger):
        self.sockets = []
        self.geiger = geiger
        threading.Thread.__init__(self)
        self.daemon = True
        self.start()
        
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
            except NotImplementedError, e:
                log.error(e)
    
class StatusWebSocketsManager(WebSocketsManager):
    def run(self):
        while True:
            self.send(self.geiger.get_state())
            time.sleep(1)
            
class TicksWebSocketsManager(WebSocketsManager):
    def run(self):
        last_ticks = self.geiger.totalcount
        while True:
            ticks = self.geiger.totalcount-last_ticks
            last_ticks = self.geiger.totalcount
            if ticks > 0:
                self.send({"type":"tick", "count":ticks})
            time.sleep(0.2)

class LogWebSocketsManager(WebSocketsManager):
    def __init__(self,geiger):
        try:
            self.db = leveldb.LevelDB('./log/geiger_log.db')
        except Exception, e:
            log.critical("Could not open logging database: %s"%e)
        WebSocketsManager.__init__(self,geiger)
    def run(self):
        while True:
            key = datetime.datetime.now().strftime("%s")
            state = self.geiger.get_state()
            value = json.dumps(state)
            self.db.Put(key, value)
            print "%s : %s"%(key,value)
            self.send(state)
            time.sleep(10)
    
    def add_socket(self,socket):
        history = dict(self.db.RangeIter())
        socket.send(json.dumps({"type":"history","log":history}))
        WebSocketsManager.add_socket(self,socket)
        
        
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
    def __init__(self, simulate=False):
        threading.Thread.__init__(self)
        self.daemon = True
        self.socket = None
        
        self.simulate = simulate

        self.last_tick = None
        self.reset()
        self.start()

    def reset(self):
        self.count=0
        self.totalcount=0
        self.cps=0
        self.cpm=0
        self.eqd=0
    
    def tick(self, pin=None):
        self.count += 1
        self.totalcount += 1
        #self.ws_mgr.send({"type":"tick"})
    
    def run(self):
        if gpio_available:
            GPIO.setmode(GPIO.BCM)
            GPIO.setup(config.gpio_pigi,GPIO.IN)
            GPIO.add_event_detect(config.gpio_pigi,GPIO.FALLING)
            GPIO.add_event_callback(config.gpio_pigi,self.tick)
        else:
            TickSimulator(self).start()
        
        rate_length = 5
        rate_step = 1
        
        cpm_fifo = deque([],60*rate_step)
        while True:
            time.sleep(rate_step)
            
            cpm_fifo.appendleft(self.count)

            self.cpm = int(sum(cpm_fifo)*60.0/len(cpm_fifo))
            self.cps = self.count
            self.eqd = round(self.cpm * config.tube_rate_factor,2)
            
            self.count = 0
            
            log.debug(self.get_state())
            #self.ws_mgr.send(self.get_state())

    def get_state(self):
        msg = {
                "type": "status",
                "cps": self.cps,
                "cpm": self.cpm,
                "total": self.totalcount,
                "doserate": self.eqd
            }
        return msg
