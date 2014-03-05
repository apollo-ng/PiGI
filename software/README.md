# pyGI/webGI - A software suite for the PiGI

Python/HTML5/CSS/JS/Websocket software suite for collecting, distributing,
monitoring, mapping and analyzing ionizing radiation counts detected by the PiGI-Module.

## Sneak-Preview: Development screenshots in action

### Main instrument panel
![Image](https://apollo.open-resource.org/_media/lab:webgi-mainpanel.jpg)
### History instrument panel
![Image](https://apollo.open-resource.org/_media/lab:webgi-historypanel.jpg)
### Ion trace visualizer
![Image](https://apollo.open-resource.org/_media/lab:webgi-tracevisualizer.jpg)

## Installation

### Dependencies

We've tried to keep external dependencies to a minimum to make it easily
deployable on any flavor of open-source operating system. If you deploy it
successfully on any other OS, please update this:

#### Currently tested versions

    * greenlet-0.4.2
    * bottle-0.12.4
    * gevent-1.0
    * gevent-websocket-0.9.3

#### Ubuntu/Raspbian

    $ sudo apt-get install python-pip python-dev libevent-dev
    $ sudo pip install ez-setup
    $ sudo pip install leveldb greenlet bottle gevent gevent-websocket

#### Gentoo

    $ emerge -av dev-libs/libevent dev-python/pip
    $ pip install ez-setup
    $ pip install leveldb greenlet bottle gevent gevent-websocket

#### Raspberry PI deployment

If you want to deploy the code on a PI for production in order to count
values from a real GM tube connected to the PiGI-Module, you have to make
sure to satisfy the RPi.GPIO dependency:

    * pip install RPi.GPIO

This only applies to non-Raspbian installations, since Raspbian ships
RPi.GPIO with the default installation.

### Clone repo

    $ git clone https://github.com/apollo-ng/PiGI.git

## Configuration

PyGI checks 3 configuration files, if existent in conf/, updating the
values defined in the file before or using new ones, in the following order:

    * default.cfg (automatically comes shipped per default with examples)
    * local.cfg (create this file to override local server settings - gitignored)
    * dynamic.cfg (this file will be created automatically,
      if the webGI client wants to change server settings - also gitignored)

When you are deploying on the Pi to count real values and/or want to
change the Web Server/Socket port to 80 rather than 8080 __you have to
run the software as root__. Otherwise the interrupt handling on the Pi
won't work and port 80 will not be accessible due to security (<1024).

## Usage

### Server Startup

    $ cd PiGI/software/
    $ python pyGIserver.py

### Client Access

Open Browser and goto http://127.0.0.1:8080

### License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.


