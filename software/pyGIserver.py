#!/usr/bin/env python
import logging
from pyGI.configurator import cfg

#setup logging
log = logging.getLogger()
log.setLevel(cfg.get('logging','level'))
formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s')
if cfg.getboolean('logging','write_file'):
    filehandler = logging.FileHandler(cfg.get('logging','filename'))
    filehandler.setFormatter(formatter)
    log.addHandler(filehandler)
streamhandler = logging.StreamHandler()
streamhandler.setFormatter(formatter)
log.addHandler(streamhandler)

if __name__ == "__main__":
    log.info("Starting pyGIserver")
    from pyGI import geigercounter,geigerserver,geigerlog
    try:
        #get last totalcount from db
        last_total = geigerlog.get_last_totalcount()
        
        #start geigercounter
        geiger = geigercounter.Geigercounter(total=last_total)
        
        #start geigercounter logging
        geigerlog = geigerlog.GeigerLog(geiger)
    
        #start the bottle server stuff
        geigerserver.start(geiger,geigerlog)
        
    except KeyboardInterrupt:
        log.info("Stopping pyGIserver")
