pigid - The Rasbperry Pi Geiger Interface Daemion
==========

Python Requirements:

Gentoo:

  - dev-python/bottle
  - dev-python/gevent
  - dev-python/gevent-websocket
  - dev-libs/leveldb
  - dev-python/pip

  pip install ez-setup leveldb

Raspbian:

sudo apt-get install python-dev libevent-dev
sudo pip install ez-setup leveldb greenlet bottle gevent gevent-websocket
