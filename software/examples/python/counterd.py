#!/usr/bin/env python

import RPi.GPIO as GPIO
    
import time
import json

GPIO_PIGI = 4

tick_counter = 0

def counter_start():
    #GPIO setup
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(GPIO_PIGI,GPIO.IN)
    GPIO.add_event_detect(GPIO_PIGI,GPIO.FALLING)
    GPIO.add_event_callback(GPIO_PIGI,countEventHandler)

def count_event_handler (pin):
    global tick_counter 
    tick_counter += 1
    print "Ticks: %d"%tick_counter

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

