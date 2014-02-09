#!/usr/bin/env python

try:
    import RPi.GPIO as GPIO
    gpio_available = True
except ImportError:
    gpio_available = False
    print "no GPIO available, simulating"
    
import time
import json
GPIO_PIGI = 4

tick_counter = 0
ws = None

def counter_start(socket=None):
    #GPIO setup
    if gpio_available:
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(GPIO_PIGI,GPIO.IN)
        GPIO.add_event_detect(GPIO_PIGI,GPIO.FALLING)
        GPIO.add_event_callback(GPIO_PIGI,countEventHandler)
    global ws
    ws = socket
    
def countEventHandler (pin):
    global tick_counter 
    tick_counter += 1
    print "Ticks: %d"%tick_counter
    global ws
    if ws:
        ws.send(json.dumps({"type":"TICK"}))

# main function
def main():
    counter_start()
    #main loop
    while True:
        print "..."
        time.sleep(5)
    GPIO.cleanup()

if __name__=="__main__":
    try:
        main()
    except KeyboardInterrupt:
        GPIO.cleanup()

