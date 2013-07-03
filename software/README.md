# Software

![Image](software-overview.png)

This is how it should look like :)

## Basic software prove of concept

This is what is there for now.

### Compile

    gcc -o counterd counterd3.c

### Setup

Export the GPIO

    echo 4 > /sys/class/gpio/export
 
Set falling edge interrupt detection

    echo falling > /sys/class/gpio/gpio4/edge

Start the counter

    ./counterd
