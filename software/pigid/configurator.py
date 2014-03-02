import ConfigParser
import logging

log = logging.getLogger(__name__)

class Configurator():
    def __init__(self):
        self.static_conf = ConfigParser.SafeConfigParser()
        self.static_conf.readfp(open('default.cfg'))
        log.info('reading configuration default.cfg')
        additionals = self.static_conf.read('local.cfg')
        for f in additionals:
            log.info('reading configuration %s'%f)
        self.dynamic_conf = ConfigParser.SafeConfigParser()
        self.read_dynamic()
        
    def read_dynamic(self):
        dyn = self.dynamic_conf.read('dynamic.cfg')
        for f in dyn:
            log.info('reading configuration %s'%f)
        
    def write_dynamic(self):
        with open('dynamic.cfg','wb') as f:
            self.dynamic_conf.write(f)
            
    
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
