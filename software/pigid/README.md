# pigid - Raspberry Pi Geiger Interface Daemon

Python/HTML5/websocket software suite for analyzing, collecting,
distributing and monitoring radiation data registered by the PiGI-Module.

## Screenshot in Action



## Installation

### Dependencies

#### Ubuntu/Raspbian

    $ sudo apt-get install python-dev libevent-dev
    $ sudo pip install ez-setup leveldb greenlet bottle gevent gevent-websocket

#### Gentoo

    $ emerge -av dev-python/bottle dev-python/gevent dev-python/gevent-websocket dev-libs/leveldb dev-python/pip
    $ pip install ez-setup
    $ pip install leveldb

### Clone repo

    $ git clone https://github.com/apollo-ng/PiGI.git

### Configuration

Copy the example configuration file

    $ cd PiGI
    $ cp config.py.EXAMPLE config.py
    $ python pigid.py

### Usage

Open Browser to http://127.0.0.1:8080


