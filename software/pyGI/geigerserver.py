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
import geigercounter
import geigerclient

log=logging.getLogger(__name__)

app = bottle.Bottle()
script_dir = sys.path[0]
public_dir = os.path.join(script_dir,"public")
log_dir = os.path.join(script_dir,"log")

geiger = None
geigerlog = None
clients_handler = None

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


@app.route('/webGI/data/entropy.bin')
def send_entropy():
    log.debug("serving entropy file")
    return bottle.static_file("entropy.bin", root=log_dir, download=True)

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


@app.route('/ws')
def handle_ws():
    wsock = get_websocket_from_request()
    log.info("websocket opened (%s)"%wsock.path)
    client = geigerclient.WebSocketClientConnector(wsock)
    clients_handler.add(client)
    client.receive_commands(clients_handler)

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
            elif msg.get("cmd") == "annotation":
                ts = msg.get("timestamp")
                text = msg.get("text")
                geigerlog.set_annotation(ts,text)
                log_mgr.send_log(start=age_from,end=age_to,amount=1000,static=True)
        except WebSocketError:
            break
    log.info("websocket closed (%s)"%wsock.path)

@app.route('/ws_conf')
def handle_ws_conf():
    wsock = get_websocket_from_request()
    log.info("websocket opened (%s)"%wsock.path)

    while True:
        try:
            message = wsock.receive()
            if message is None:
                raise WebSocketError
            log.info("Received : %s" % message)
            msg = json.loads(message)
            if msg.get("cmd") == "get":
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
                wsock.send(json.dumps(conf))
            elif msg.get("cmd") == "save":
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
            elif msg.get("cmd") == "resetEntropy":
                log.info("Resetting entropy file")
                os.remove(os.path.join(script_dir,cfg.get('entropy','filename')))
            elif msg.get("cmd") == "resetDynamicCfg":
                log.info("Resetting client config")
                cfg.clear_dynamic()

        except WebSocketError:
            break
    log.info("websocket closed (%s)"%wsock.path)


def start(g,gl):
    global geiger, geigerlog, clients_handler
    geiger = g
    geigerlog = gl
    clients_handler = geigerclient.ClientsHandler(geiger,geigerlog)

    ip = cfg.get('server','ip')
    port = cfg.getint('server','port')
    log.info("listening on %s:%d" % (ip, port))

    server = WSGIServer((ip, port), app,
                        handler_class=WebSocketHandler)
    server.serve_forever()
