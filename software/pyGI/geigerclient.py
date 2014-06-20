import threading
import json
import time
import datetime
import uuid

from geventwebsocket import WebSocketError
import logging

log = logging.getLogger(__name__)

LOG_UPDATE_RATE = 5

class WebsocketClientConnector():
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
            except WebSocketError:
                break
        log.info("websocket closed %s (client %s)"%(self.ws.path,self.session_id))

class ClientsHandler():
    def __init__(self,geiger):
        self.clients = []
        self.geiger = geiger

        self.status_thread = threading.Thread(target=self.loop_status)

        for thread in [self.status_thread]:
            thread.daemon = True
            thread.start()

    def send_all(self,msg):
        log.debug("broadcasting %s"%msg)
        for client in self.clients:
            client.send(msg)

    def loop_status(self):
        log.info("Starting status update loop.")
        while True:
            self.send_all(self.geiger.get_state())
            time.sleep(1)
