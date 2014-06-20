import bottle
from gevent.pywsgi import WSGIServer
from geventwebsocket import WebSocketError
from geventwebsocket.handler import WebSocketHandler

import json
import logging
import os
import sys

from configurator import cfg

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


@app.route('/ws')
def handle_ws():
    env = bottle.request.environ
    wsock = env.get('wsgi.websocket')
    if not wsock:
        abort(400, 'Expected WebSocket request.')
    log.info("websocket opened (%s)"%wsock.path)
    client = geigerclient.WebSocketClientConnector(wsock)
    clients_handler.add(client)
    client.receive_commands(clients_handler)


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
