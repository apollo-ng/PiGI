import threading
import json
import time
import datetime
import uuid
import os
import sys

from geventwebsocket import WebSocketError
from configurator import cfg
import geigercounter

import logging

log = logging.getLogger(__name__)
script_dir = sys.path[0]

class WebSocketClientConnector():
    def __init__(self,ws):
        self.ws = ws
        self.session_id = uuid.uuid1()
        self.active = True
        self.send_ticks = False
        self.send_status = True
        self.send_log = True

    def send(self,msg):
        msg_json = json.dumps(msg)
        try:
            self.ws.send(msg_json)
        except WebSocketError:
            self.active = False
            log.error("could not write to socket %s (client %s)"%(self.ws,self.session_id))
        except Exception, e:
            self.active = False
            log.error(e)

    def receive_commands(self,handler):
        #FIXME: some commands need clearer names
        #FIXME: more robust error/edgecase handling
        while True:
            try:
                message = self.ws.receive()
                if message is None:
                    raise WebSocketError
                log.info("Received : %s" % message)
                msg = json.loads(message)
                cmd = msg.get("cmd")

                if not cmd:
                    log.error("Received something, but not a command: %s"%msg)

                #Ticks
                if cmd == "send_ticks":
                    if msg.get("state") == "on":
                        self.send_ticks = True
                    elif msg.get("state") == "off":
                        self.send_ticks = False
                    else:
                        log.error("Invalid set_ticks command: %s"%msg)

                #Log
                elif cmd == "read":
                    age_seconds = int(msg.get("age",60*60));
                    if msg.get("hd"):
                        handler.send_log(self,age=age_seconds,amount=None)
                    else:
                        handler.send_log(self,age=age_seconds,amount=1000)
                elif cmd == "history":
                    age_from = msg.get("from")
                    age_to = msg.get("to")
                    #log.info("From %s to %s"%(str(age_from),str(age_to)))
                    handler.send_log(self,start=age_from,end=age_to,amount=1000,static=True)
                elif cmd == "annotation":
                    ts = msg.get("timestamp")
                    text = msg.get("text")
                    handler.geigerlog.set_annotation(ts,text)
                    handler.send_log(start=age_from,end=age_to,amount=1000,static=True)

                #Config
                elif cmd == "get":
                    try:
                        entropy_pool = os.path.getsize(cfg.get('entropy','filename'))
                    except (IOError, OSError):
                        entropy_pool = 0
                    conf = {
                        "type": "geigerconf",
                        "uuid": cfg.get('node','uuid'),
                        "name": cfg.get('node','name'),
                        "opmode": cfg.get('node','opmode'),
                        "lat": cfg.getfloat('node','lat'),
                        "lon": cfg.getfloat('node','lon'),
                        "alt": cfg.getfloat('node','alt'),
                        "sim_dose_rate": cfg.getfloat('geigercounter','sim_dose_rate'),
                        "window": cfg.get('geigercounter','window'),
                        "source": cfg.get('geigercounter','source') if geigercounter.gpio_available else "sim",
                        "entropy": cfg.getboolean('entropy','enable'),
                        "entropy_pool": entropy_pool
                    }
                    self.send(conf)

                elif cmd == "save":
                    for field in ["lat","lon","alt","opmode"]:
                        val = msg["conf"].get(field)
                        if not val is None:
                            cfg.set('node',field,str(val))

                    for field in ["window","source","sim_dose_rate"]:
                        val = msg["conf"].get(field)
                        if not val is None:
                            cfg.set('geigercounter',field,str(val))

                    entropy_enable = msg["conf"].get("entropy")
                    if not entropy_enable is None:
                        cfg.set('entropy','enable',str(entropy_enable))

                    cfg.write_dynamic()
                    cfg.read_dynamic()
                elif cmd == "resetEntropy":
                    log.info("Resetting entropy file")
                    os.remove(os.path.join(script_dir,cfg.get('entropy','filename')))
                elif cmd == "resetDynamicCfg":
                    log.info("Resetting client config")
                    cfg.clear_dynamic()

            except WebSocketError:
                break
        log.info("websocket closed %s (client %s)"%(self.ws.path,self.session_id))

class ClientsHandler():
    def __init__(self,geiger,geigerlog):
        self.clients = []
        self.geiger = geiger
        self.geigerlog = geigerlog

        status_thread = threading.Thread(target=self._loop_status)
        ticks_thread  = threading.Thread(target=self._loop_ticks)
        log_thread    = threading.Thread(target=self._loop_log)

        for thread in [status_thread, ticks_thread, log_thread]:
            thread.daemon = True
            thread.start()

    def add(self,client):
        if client in self.clients:
            self.clients.remove(client)
        self.clients.append(client)

    def send_log(self,client,start=None,end=None,age=None,amount=10,static=False):
        if age and age<60*60*2: #2hours
            amount = None
        history = self.geigerlog.get_log_entries(start=start,end=end,age=age,amount=amount)
        logtype = "static_history" if static else "history"
        hd = False if amount else True
        msg = {"type":logtype,"log":history,"hd":hd}
        log.info("sending %s"%(logtype))
        self.send_if_active(client,msg)

    def send_if_active(self,client,msg):
        if client.active:
            client.send(msg)
        else:
            self.clients.remove(client)

    def _loop_status(self):
        log.info("Starting status update loop.")
        while True:
            msg = self.geiger.get_state()
            msg["type"]="geigerjson-status"
            log.debug("broadcasting status %s"%msg)
            for client in self.clients:
                if client.send_status:
                    self.send_if_active(client,msg)
            time.sleep(1)

    def _loop_ticks(self):
        last_ticks = self.geiger.totalcount
        log.info("Starting ticks update loop")
        while True:
            ticks = self.geiger.totalcount-last_ticks
            last_ticks = self.geiger.totalcount
            if ticks > 0:
                for client in self.clients:
                    if client.send_ticks:
                        self.send_if_active(client,{"type":"tick", "count":ticks})
            time.sleep(0.2)

    def _loop_log(self):
        my_last_log = None
        log.info("Starting log update loop")
        while True:
            time.sleep(1)
            log_last_log = self.geigerlog.last_log
            if log_last_log:
                if my_last_log != log_last_log:
                    for client in self.clients:
                        if client.send_log:
                            self.send_if_active(client,log_last_log)
                my_last_log = log_last_log
