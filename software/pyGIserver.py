#!/usr/bin/env python
import logging

from pyGI.configurator import cfg

logging.basicConfig(
    level=cfg.get('logging','level'),
    format='%(asctime)s %(levelname)s %(name)s: %(message)s'
)
log = logging.getLogger("pyGIserver")
#log.addHandler(logging.StreamHandler())
#if cfg.getboolean('logging','write_file'):
#    log.addHandler(logging.FileHandler(cfg.get('logging','filename')))

log.info("Starting pyGIserver")

from pyGI import geigercounter,geigerserver,geigerlog

if __name__ == "__main__":
    last_total = geigerlog.get_last_totalcount()
    geiger = geigercounter.Geigercounter(total=last_total)
    geigerlog = geigerlog.GeigerLog(geiger)
    try:
        geigerserver.start(geiger,geigerlog)
    except KeyboardInterrupt:
        log.info("Stopping pyGIserver")
