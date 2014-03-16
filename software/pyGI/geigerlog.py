import leveldb
from datetime import datetime, timedelta
import threading
import os
import sys
import time
import json
import logging
from collections import deque
from configurator import cfg

log = logging.getLogger(__name__)

LOG_WRITE_RATE = 5
MAX_ENTRY_DIST = 30

script_dir = sys.path[0]

def dt2unix(dt):
    return int(dt.strftime("%s"))

def get_last_totalcount():

    log.info("Getting last totalcount")
    db = leveldb.LevelDB(cfg.get('db','path'))
    now = dt2unix(datetime.now())
    d = 1
    last_entries_keys = []
    i = 0

    # Check for empty leveldb instance
    try:
        db.RangeIter(include_value=False).next()
    except StopIteration:
        log.info("Empty LevelDB")
        return (0,0)

    while not last_entries_keys:

        log.debug("Searching further (%d)..."%d)
        last_entries_keys = list(db.RangeIter(key_from=str(now-d),include_value=False))

        d = d*2
        i = i+1

    last_key = last_entries_keys[-1]
    entry_json = db.Get(last_key)
    entry = json.loads(entry_json)
    return (entry['data']['totalcount'],entry['data']['totalcount_dtc'])

def average_log_entries(entries,tube_rate_factor):
    result = []
    previous_entry = None
    for entry in entries:
        if not previous_entry:
            previous_entry = entry
            result.append(entry)
            continue

        seconds = float(entry.get("timestamp",0)) - int(previous_entry.get("timestamp",0))
        counts = float(entry['data'].get("totalcount_dtc",0)) - int(previous_entry['data'].get("totalcount_dtc",0))

        if counts < 0: counts=0
        if seconds != 0:
            cps = counts/seconds
            cpm = cps * 60
            edr = round(cpm * tube_rate_factor,2)

            #entry["cps"] = int(cps)
            #entry["cpm"] = int(cpm)
            entry["data"]["edr"] = edr

            result.append(entry)
            previous_entry = entry
    return result

class GeigerLog(threading.Thread):
    def __init__(self,geiger):
        self.db = leveldb.LevelDB(cfg.get('db','path'))
        self.db_annotation = leveldb.LevelDB(cfg.get('db','path')+".idx-annotation")
        self.geiger = geiger
        threading.Thread.__init__(self)
        self.daemon = True
        self.start()
        self.last_log = None

    def run(self):
        log.info("Starting geigerlog")
        avg_age = dt2unix(datetime.now() - timedelta(minutes=15))
        avg_list = deque()
        entries_list = list(self.db.RangeIter(key_from=str(avg_age)))
        for e in entries_list: avg_list.append(json.loads(e[1]))
        while True:
            time.sleep(LOG_WRITE_RATE)
            avg_age = dt2unix(datetime.now() - timedelta(minutes=15))
            if avg_list:
                while avg_list[0]["timestamp"] < avg_age:
                    avg_list.popleft()

            state = self.geiger.get_state()
            avg_list.append(state)
            avg = round(sum([e["data"]["edr"] for e in avg_list])/len(avg_list),3)
            state["data"]["edr_avg"] = avg
            key = str(state["timestamp"])
            value = json.dumps(state)
            self.db.Put(key, value)
            self.last_log = state
            log.debug("Logging: %s : %s"%(key,value))
            log.debug(self.db.GetStats())
    
    def get_log_entries_all(self,start,end):
        result = []
        entries_list = list(self.db.RangeIter(key_from=str(start),fill_cache=True))
        last_time = start
        for e in entries_list:
            entry = json.loads(e[1])
            if int(entry["timestamp"])-last_time > MAX_ENTRY_DIST:
                insert_time = last_time + LOG_WRITE_RATE
                record_insert = dummy_entry(insert_time,entry['data']['totalcount'],entry['data']['totalcount_dtc'])
                while insert_time < int(entry["timestamp"]):
                    result.append(record_insert.copy())
                    insert_time += 10
                    record_insert["timestamp"]=insert_time
            last_time = int(entry["timestamp"])
            result.append(entry)

        if result:
            last = result[-1]
            if end - int(last["timestamp"]) > MAX_ENTRY_DIST:
                insert_time = int(last["timestamp"]) + LOG_WRITE_RATE
                record_insert = dummy_entry(insert_time,entry['data']['totalcount'],entry['data']['totalcount_dtc'])
                while insert_time < end:
                    result.append(record_insert.copy())
                    insert_time += 10
                    record_insert["timestamp"]=insert_time
        return result
    
    def get_log_entries_sparse(self,start,end,amount):
        result = []
        delta_total = end - start
        delta_step = delta_total / amount
        step = 0
        while True:
            t = start + delta_step * step
            if t > end: break
            if step >= 1:
                t_prev = start + delta_step * (step - 1)
                annotation_keys = list(self.db_annotation.RangeIter(key_from=str(t_prev),key_to=str(t),include_value=False))
                if annotation_keys:
                    for key in annotation_keys:
                        result.append(json.loads(self.db.Get(key)))

            db_iter = self.db.RangeIter(key_from=str(t),fill_cache=True)
            try:
                (timestamp,entry_json) = db_iter.next()
            except StopIteration:
                break;

            entry = json.loads(entry_json)

            if int(timestamp)-t>MAX_ENTRY_DIST:
                entry=dummy_entry(t,entry['data']['totalcount'],entry['data']['totalcount_dtc'])


            if not result:
                result.append(entry)
            elif result[-1] != entry:
                result.append(entry)

            step += 1
        return average_log_entries(result,cfg.getfloat('geigercounter','tube_rate_factor'))

    
    def get_log_entries(self,start=None,end=None,age=None,amount=500):
        if end is None:
            end = dt2unix(datetime.now())
        if age:
            start = end - age
        elif start is None:
            start = int(self.db.RangeIter(key_from="0",include_value=False).next())

        log.info("Fetching %s log entries from %d to %s"%(str(amount),start,end))
        
        if amount is None:
            return self.get_log_entries_all(start,end)
        else:
            return self.get_log_entries_sparse(start,end,amount)
    
    def set_annotation(self,ts,text):
        try:
            key = str(int(ts))
            entry_json = self.db.Get(key)
        except KeyError:
            try:
                (key,entry_json) = self.db.RangeIter(key_from=str(int(ts))).next()
            except StopIteration:
                log.ERROR("Annotation timestamp out of log range: %s"%key)
                return
        entry = json.loads(entry_json)
        entry['annotation'] = text
        entry_json = json.dumps(entry)
        self.db.Put(key,entry_json)
        if text:
            self.db_annotation.Put(key,text)
        else:
            self.db_annotation.Delete(key)
        
def dummy_entry(timestamp,total,total_dtc):
    msg = {
        "type": "geigerjson",
        "node_uuid": cfg.get('node','uuid'),
        "timestamp": timestamp,
        "data": {
            "source": "off",
            "cps": 0,
            "cps_dtc": 0,
            "cpm": 0,
            "cpm_dtc": 0,
            "totalcount": total,
            "totalcount_dtc": total_dtc,
            "edr": 0
        },
        "annotation": ""
    }
    return msg


if __name__ == "__main__":
    print get_last_totalcount()
