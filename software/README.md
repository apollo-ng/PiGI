# Basic software prove of concept

## Compile

gcc -o counterd counterd3.c

## Setup

Export the GPIO

echo 4 > /sys/class/gpio/export
 
Set falling edge interrupt detection

echo falling > /sys/class/gpio/gpio4/edge

./counterd
