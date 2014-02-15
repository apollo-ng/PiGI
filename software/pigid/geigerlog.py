import leveldb
from datetime import datetime, timedelta
import threading
import os
import time
import json
import logging

log = logging.getLogger(__name__)

def dt2unix(dt):
    return int(dt.strftime("%s"))

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
            key = datetime.now().strftime("%s")
            state = self.geiger.get_state()
            state["timestamp"] = key
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
        return result
    
    
if __name__ == "__main__":
    log = GeigerLog()
    start = dt2unix(datetime.now() - timedelta(days=100))
    print log.get_log_entries(start)
