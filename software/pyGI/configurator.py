import ConfigParser
import logging
import sys,os,uuid

log = logging.getLogger(__name__)

FILENAME_DEFAULT = 'default.cfg'
FILENAME_LOCAL = 'local.cfg'
FILENAME_DYNAMIC = 'dynamic.cfg'
FILENAME_UUID = 'uuid.cfg'
CONF_DIR = os.path.join(sys.path[0],'conf')

PATH_DEFAULT = os.path.join(CONF_DIR,FILENAME_DEFAULT)
PATH_LOCAL = os.path.join(CONF_DIR,FILENAME_LOCAL)
PATH_DYNAMIC = os.path.join(CONF_DIR,FILENAME_DYNAMIC)
PATH_UUID = os.path.join(CONF_DIR,FILENAME_UUID)

class Configurator():
    def __init__(self):
        self.static_conf = ConfigParser.SafeConfigParser()
        
        #uuid
        
        try:
            self.static_conf.readfp(open(PATH_UUID))
            log.info("node uuid: %s"%self.static_conf.get('node','uuid'))
        except (IOError, ConfigParser.NoOptionError, ConfigParser.NoSectionError) as e:
            log.warn("No uuid set!")
            new_uuid = str(uuid.uuid1())
            log.warn("Setting new uuid: %s"%new_uuid)
            self.static_conf = ConfigParser.SafeConfigParser()
            self.static_conf.add_section('node')
            self.static_conf.set('node','uuid',new_uuid)
            with open(PATH_UUID,'wb') as f:
                self.static_conf.write(f)
        
        self.static_conf.readfp(open(PATH_DEFAULT))
        log.info('reading configuration default.cfg')
        
        
        additionals = self.static_conf.read(PATH_LOCAL)
        for f in additionals:
            log.info('reading configuration %s'%f)
        
        
        self.dynamic_conf = ConfigParser.SafeConfigParser()
        self.read_dynamic()
        
    def read_dynamic(self):
        dyn = self.dynamic_conf.read(PATH_DYNAMIC)
        for f in dyn:
            log.info('reading configuration %s'%f)
        
    def write_dynamic(self):
        with open(PATH_DYNAMIC,'wb') as f:
            self.dynamic_conf.write(f)
    
    def clear_dynamic(self):
        try:
            os.remove(PATH_DYNAMIC)
        except OSError:
            pass
        
        self.dynamic_conf = ConfigParser.SafeConfigParser()
        self.read_dynamic()
    
    def get(self,section,option):
        try:
            return self.dynamic_conf.get(section,option)
        except ConfigParser.NoOptionError:
            pass
        except ConfigParser.NoSectionError:
            pass
            
        return self.static_conf.get(section,option)
    
    def getint(self,section,option):
        return int(self.get(section,option))
    
    def getfloat(self,section,option):
        return float(self.get(section,option))
    
    def getboolean(self,section,option):
        v = self.get(section,option)
        v_low = v.lower()
        if v_low in ["1","yes","true","on"]:
            return True
        elif v_low in ["0","no","false","off"]:
            return False
        else:
            raise ValueError("value '%s' (option '%s' section '%s') could not be parsed as boolean."%(v,option,section))
            
    def set(self,section,option,value):
        if not self.static_conf.has_section(section):
            raise ConfigParser.NoSectionError(section)
        if not self.static_conf.has_option(section,option):
            raise ConfigParser.NoOptionError(option,section)
        if not self.dynamic_conf.has_section(section):
            self.dynamic_conf.add_section(section)
        self.dynamic_conf.set(section,option,value)

cfg = Configurator()

if __name__ == "__main__":
    logging.basicConfig(level=1)
    cfg = Configurator()
    print cfg.get('server','port')
    cfg.set('server','port','80')
    print cfg.get('server','port')
    cfg.write_dynamic()
    cfg.read_dynamic()
    print cfg.get('server','port')
    #print cfg.static_conf.get('server','2p')
