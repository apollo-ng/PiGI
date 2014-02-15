import leveldb
from datetime import datetime, timedelta
import threading
import os
import time
import json
import logging

log = logging.getLogger(__name__)

import config

def dt2unix(dt):
    return int(dt.strftime("%s"))

def get_last_totalcount():
    script_dir = os.path.dirname(os.path.realpath(__file__))
    log_dir = os.path.join(script_dir,"log","geiger_log.db")
    db = leveldb.LevelDB(log_dir)
    now = dt2unix(datetime.now())
    d = 1
    last_entries_keys = []
    i = 0
    while not last_entries_keys:
        last_entries_keys = list(db.RangeIter(key_from=str(now-d),include_value=False))
        d = d*2
        i = i+1
    last_key = last_entries_keys[-1]
    entry_json = db.Get(last_key)
    entry = json.loads(entry_json)
    return entry['total']

def average_log_entries(entries):
    result = []
    previous_entry = None
    for entry in entries:
        if not previous_entry:
            previous_entry = entry
            result.append(entry)
            continue
        
        seconds = float(entry["timestamp"]) - int(previous_entry["timestamp"])
        counts = float(entry["total"]) - int(previous_entry["total"])
        if counts < 0: counts=0
        cps = counts/seconds
        cpm = cps * 60
        eqd = round(cpm * config.tube_rate_factor,2)
        
        entry["cps"] = int(cps)
        entry["cpm"] = int(cpm)
        entry["doserate"] = eqd
        result.append(entry)
        previous_entry = entry
    return result
    
class GeigerLog(threading.Thread):
    def __init__(self,geiger):
        script_dir = os.path.dirname(os.path.realpath(__file__))
        log_dir = os.path.join(script_dir,"log","geiger_log.db")
        self.db = leveldb.LevelDB(log_dir)
        self.geiger = geiger
        threading.Thread.__init__(self) 
        self.daemon = True
        self.start()
    
    def run(self):
        while True:
            time.sleep(10)
            state = self.geiger.get_state()
            key = str(state["timestamp"])
            value = json.dumps(state)
            self.db.Put(key, value)
            log.info("Logging: %s : %s"%(key,value))

    def get_log_entries(self,start=None,end=None,age=None,amount=500):
        if end is None:
            end = dt2unix(datetime.now())
        if age:
            start = end - age
        delta_total = end - start
        delta_step = delta_total / amount
        result = []
        for step in range(amount):
            t = start + delta_step * step
            db_iter = self.db.RangeIter(key_from=str(t))
            try:
                (timestamp,entry_json) = db_iter.next()
            except StopIteration:
                break;
            
            entry = json.loads(entry_json)
            
            if int(timestamp)-t>25:
                entry["timestamp"] = str(t)
                entry["cps"] = 0
                entry["cpm"] = 0
                entry["doserate"] = 0

            if not result:
                result.append(entry)
            elif result[-1] != entry:
                result.append(entry)
            else:
                continue
        return average_log_entries(result)
    
    
if __name__ == "__main__":
    print get_last_totalcount()
