import bottle
from gevent.pywsgi import WSGIServer
from geventwebsocket import WebSocketError
from geventwebsocket.handler import WebSocketHandler

import json
import logging
import os
import sys

from configurator import cfg

import geigersocket

log=logging.getLogger(__name__)

app = bottle.Bottle()
script_dir = sys.path[0]
public_dir = os.path.join(script_dir,"public")

wsock_mgr_status = None
wsock_mgr_ticks = None
geiger = None
geigerlog = None

@app.route('/')
def index():
    return bottle.redirect('/webGI/index.html')

@app.route('/favicon.ico')
def favicon():
    return bottle.static_file("favicon.ico", root=public_dir)

@app.route('/webGI/:filename#.*#')
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
    log.info("websocket closed (%s)"%wsock.path)

@app.route('/ws_status')
def handle_ws_status():
    wsock = get_websocket_from_request()
    log.info("websocket opened (%s)"%wsock.path)
    wsock_mgr_status.add_socket(wsock)
    keep_socket_open(wsock)

@app.route('/ws_ticks')
def handle_ws_ticks():
    wsock = get_websocket_from_request()
    log.info("websocket opened (%s)"%wsock.path)
    wsock_mgr_ticks.add_socket(wsock)
    keep_socket_open(wsock)

@app.route('/ws_log')
def handle_ws_log():
    wsock = get_websocket_from_request()
    log.info("websocket opened (%s)"%wsock.path)

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
                if msg.get("hd"):
                    log_mgr.send_log(age=age_seconds,amount=None)
                else:
                    log_mgr.send_log(age=age_seconds,amount=1000)
            elif msg.get("cmd") == "history":
                age_from = msg.get("from")
                age_to = msg.get("to")
                #log.info("From %s to %s"%(str(age_from),str(age_to)))
                log_mgr.send_log(start=age_from,end=age_to,amount=1000,static=True)
        except WebSocketError:
            break
    log.info("websocket closed (%s)"%wsock.path)


def start(g,gl):
    global geiger, geigerlog, wsock_mgr_status, wsock_mgr_ticks
    geiger = g
    geigerlog = gl
    wsock_mgr_status = geigersocket.StatusWebSocketsManager(geiger)
    wsock_mgr_ticks = geigersocket.TicksWebSocketsManager(geiger)

    ip = cfg.get('server','ip')
    port = cfg.getint('server','port')
    log.info("listening on %s:%d" % (ip, port))

    server = WSGIServer((ip, port), app,
                        handler_class=WebSocketHandler)
    server.serve_forever()
