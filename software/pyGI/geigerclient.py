import threading
import json
import time
import datetime
import uuid

from geventwebsocket import WebSocketError
import logging

log = logging.getLogger(__name__)

LOG_UPDATE_RATE = 5

class WebSocketClientConnector():
    def __init__(self,ws):
        self.ws = ws
        self.session_id = uuid.uuid1()
        self.active = True
        self.send_ticks = False
        self.send_status = True
        self.send_log = False

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

    def receive_commands(self):
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

                if cmd == "send_ticks":
                    if msg.get("state") == "on":
                        self.send_ticks = True
                    elif msg.get("state") == "off":
                        self.send_ticks = False
                    else:
                        log.error("Invalid set_ticks command: %s"%msg)
            except WebSocketError:
                break
        log.info("websocket closed %s (client %s)"%(self.ws.path,self.session_id))

class ClientsHandler():
    def __init__(self,geiger):
        self.clients = []
        self.geiger = geiger

        status_thread = threading.Thread(target=self.loop_status)
        ticks_thread  = threading.Thread(target=self.loop_ticks)

        for thread in [status_thread, ticks_thread]:
            thread.daemon = True
            thread.start()

    def add(self,client):
        if client in self.clients:
            self.clients.remove(client)
        self.clients.append(client)

    def send_if_active(self,client,msg):
        if client.active:
            client.send(msg)
        else:
            self.clients.remove(client)

    def loop_status(self):
        log.info("Starting status update loop.")
        while True:
            msg = self.geiger.get_state()
            log.debug("broadcasting status %s"%msg)
            for client in self.clients:
                if client.send_status:
                    self.send_if_active(client,msg)
            time.sleep(1)

    def loop_ticks(self):
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
