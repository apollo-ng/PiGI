import threading
import os
import time
import random
import datetime
import logging
import json
import leveldb
from collections import deque
from geventwebsocket import WebSocketError

import config
import geigerlog

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


class LogWebSocketManager(threading.Thread):
    def __init__(self,geiger,geigerlog,socket):
        self.geiger = geiger
        self.socket = socket
        print socket
        print "############"
        self.geigerlog = geigerlog
        threading.Thread.__init__(self)
        self.daemon = True
        self.active = True
        
    def send(self,msg_dict):
        msg_json = json.dumps(msg_dict)
        try:
            self.socket.send(msg_json)
        except WebSocketError:
            self.active = False
            log.error("could not write to socket %s"%self.socket)
        except NotImplementedError, e:
            log.error(e)
    
    def send_log(self,time_from,time_to=None,amount=500):
        history = self.geigerlog.get_log_entries(time_from,amount=amount)
        hdict = [h[1] for h in history]
        self.socket.send(json.dumps({"type":"history","log":hdict}))
        print history
        if not time_to:
            self.start()
        
    def run(self):
        while self.active:
            time.sleep(10)
            key = datetime.datetime.now().strftime("%s")
            state = self.geiger.get_state()
            state["timestamp"] = key
            print "LOGGG"
            self.send(state)


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
    def __init__(self):
        threading.Thread.__init__(self)
        self.daemon = True
        self.socket = None
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
                "doserate": self.eqd
            }
        return msg
