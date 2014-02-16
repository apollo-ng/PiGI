import threading
import json
import time
import datetime
from geventwebsocket import WebSocketError
import logging

log = logging.getLogger(__name__)

LOG_UPDATE_RATE = 5

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
        self.geigerlog = geigerlog
        threading.Thread.__init__(self)
        self.daemon = True
        self.active = True
        self.start()
        
    def send(self,msg_dict):
        msg_json = json.dumps(msg_dict)
        try:
            self.socket.send(msg_json)
        except WebSocketError:
            self.active = False
            log.error("could not write to socket %s"%self.socket)
        except NotImplementedError, e:
            log.error(e)
            log.error("THREAD ERROR!!!!")
    
    def send_log(self,start=None,end=None,age=None,amount=10):
        if age and age<60*60*2: #2hours
            amount = None
        history = self.geigerlog.get_log_entries(start=start,end=end,age=age,amount=amount)
        lj = json.dumps({"type":"history","log":history})
        self.socket.send(lj)
            
        
    def run(self):
        my_last_log = None
        while self.active:
            time.sleep(1)
            log_last_log = self.geigerlog.last_log
            if log_last_log:
                if my_last_log != log_last_log:
                    self.send(log_last_log)
                my_last_log = log_last_log
                    
                
            #key = datetime.datetime.now().strftime("%s")
            #state = self.geiger.get_state()
            #state["timestamp"] = key
            #self.send(state)
            
