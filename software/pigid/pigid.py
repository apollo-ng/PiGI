#!/usr/bin/env python
import logging

from configurator import cfg

logging.basicConfig(level=cfg.get('logging','level'), format='%(asctime)s %(levelname)s %(name)s: %(message)s')
log = logging.getLogger("pigid")
log.info("Starting pigid")

import geigercounter
import geigerserver
import geigerlog

if __name__ == "__main__":
    last_total = geigerlog.get_last_totalcount()
    geiger = geigercounter.Geigercounter(total=last_total)
    geigerlog = geigerlog.GeigerLog(geiger)
    geigerserver.start(geiger,geigerlog)
