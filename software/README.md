# pigid - Raspberry Pi Geiger Interface Daemon

Python/HTML5/websocket software suite for analyzing, collecting,
distributing and monitoring radiation data registered by the PiGI-Module.

## Screenshot in Action

### Main instrument panel
![Image](https://apollo.open-resource.org/_media/lab:webgi-mainpanel.jpg)
### Histroy instrument panel
![Image](https://apollo.open-resource.org/_media/lab:webgi-historypanel.jpg)
### Ion trace visualizer
![Image](https://apollo.open-resource.org/_media/lab:webgi-tracevisualizer.jpg)

## Installation

### Dependencies

#### Ubuntu/Raspbian

    $ sudo apt-get install python-pip python-dev libevent-dev
    $ sudo pip install ez-setup
    $ sudo pip install leveldb greenlet bottle gevent gevent-websocket

#### Gentoo

    $ emerge -av dev-python/bottle dev-python/gevent dev-python/gevent-websocket dev-libs/leveldb dev-python/pip
    $ pip install ez-setup
    $ pip install leveldb

### Clone repo

    $ git clone https://github.com/apollo-ng/PiGI.git

### Server Startup

    $ cd PiGI/software/
    $ python pyGIserver.py


### Usage

Open Browser to http://127.0.0.1:8080


