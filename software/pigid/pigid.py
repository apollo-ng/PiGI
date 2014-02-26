#!/usr/bin/env python

import os
import logging
import json

import bottle
from gevent.pywsgi import WSGIServer
from geventwebsocket import WebSocketHandler, WebSocketError

import geigercounter
import geigersocket
import geigerlog

try:
    import config
except:
    print "Could not import config file."
    print "Copy config.py.EXAMPLE to config.py and adapt it for your setup."
    exit(1)

logging.basicConfig(level=config.log_level, format=config.log_format)
log = logging.getLogger("pigid")
log.info("Starting pigid")

last_total = geigerlog.get_last_totalcount()
geiger = geigercounter.Geigercounter(total = last_total)
wsock_mgr_status = geigersocket.StatusWebSocketsManager(geiger)
wsock_mgr_ticks = geigersocket.TicksWebSocketsManager(geiger)
geigerlog = geigerlog.GeigerLog(geiger)
#wsock_mgr_log = geigercounter.LogWebSocketsManager(geiger)

app = bottle.Bottle()
script_dir = os.path.dirname(os.path.realpath(__file__))
public_dir = os.path.join(script_dir,"public")

@app.route('/')
def index():
    return bottle.redirect('/pigi/index.html')

@app.route('/favicon.ico')
def favicon():
    return bottle.static_file("favicon.ico", root=public_dir)

@app.route('/pigi/:filename#.*#')
def send_static(filename):
    log.debug("serving %s" % filename)
    return bottle.static_file(filename, root=public_dir)

def get_websocket_from_request():
    env = bottle.request.environ
    wsock = env.get('wsgi.websocket')
    if not wsock:
        abort(400, 'Expected WebSocket request.')
    return wsock

def keep_socket_open(wsock):
    while True:
        try:
            message = wsock.receive()
            if message is None:
                raise WebSocketError
            log.info("Received : %s" % message)            
        except WebSocketError:
            break
    log.info("websocket closed")
    
@app.route('/ws_status')
def handle_ws_status():
    wsock = get_websocket_from_request()
    log.info("websocket opened")
    wsock_mgr_status.add_socket(wsock)
    keep_socket_open(wsock)

@app.route('/ws_ticks')
def handle_ws_ticks():
    wsock = get_websocket_from_request()
    log.info("websocket opened")
    wsock_mgr_ticks.add_socket(wsock)
    keep_socket_open(wsock)

@app.route('/ws_log')
def handle_ws_log():
    wsock = get_websocket_from_request()
    log.info("websocket opened")
    
    log_mgr = geigersocket.LogWebSocketManager(geiger,geigerlog,wsock)
    #wsock_mgr_log.add_socket(wsock)
    while True:
        try:
            message = wsock.receive()
            if message is None:
                raise WebSocketError
            log.info("Received : %s" % message)
            msg = json.loads(message)
            if msg.get("cmd") == "read":
                age_seconds = int(msg.get("age",60*60));
                if age_seconds <= 15*6:
                    amount = 15*6#this is irrelevant anyways...
                else:
                    amount = 24 * 30
                log_mgr.send_log(age=age_seconds,amount=amount)
            elif msg.get("cmd") == "history":
                age_from = msg.get("from")
                age_to = msg.get("to")
                log.info("From %s to %s"%(str(age_from),str(age_to)))
                log_mgr.send_log(start=age_from,end=age_to,amount=1000,static=True)
        except WebSocketError:
            break
    log.info("websocket closed")

def main():
    ip = config.listening_ip
    port = config.listening_port
    log.info("listening on %s:%d" % (ip, port))

    server = WSGIServer((ip, port), app,
                        handler_class=WebSocketHandler)
    server.serve_forever()

if __name__ == "__main__":
    main()
