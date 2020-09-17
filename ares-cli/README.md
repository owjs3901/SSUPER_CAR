ares-webos-sdk
==============

Summary
-------

A module that provides:

* command line to generate, package, install, run and debug Open webOS applications.
* an Ares plugin generate, package, install, run and debug Open webOS applications from Ares IDE.

Install
-------

* In order to hack on `ares-webos-sdk`:

		$ git clone --recursive https://github.com/enyojs/ares-webos-sdk
		$ cd ares-webos-sdk
		$ npm install

* In order to use a development tree of `ares-webos-sdk` from within your own project (eg. from the Ares IDE), manually add this modules under the source-code Ares using NPM:

		$ cd /path/to/ares-webos-sdk
		$ npm install
		$ cd /path/to/ares-ide
		$ npm install ../relative/path/to/ares-webos-sdk

* In order to use a specific version of `ares-webos-sdk` in your own modules (eg. from the Ares IDE), without actually working on it, then run `npm install git@github.com:enyojs/ares-webos-sdk#0.0.1` where `0.0.1` is the version you want to use (_not yet working_).
* On Mac OS X, you need to install Xcode and Xcode Command Line Tools (Xcode -> Preferences -> Downloads -> Components)

Setup
-----

### Ssh settings

Please refer to [SSH-KEY-SETUP.md](SSH-KEY-SETUP.md) for intructions.

### SSH plumbing to use ares-install from VirtualBox enviromment

In case your webOS SDK (and/or Ares IDE) are both running in VirtualBox guests, you need to tunnel the port 5522 from the IDE guest to the emulator guest (replace `<username>` )

	$ ssh -L5522:localhost:5522 <username>@10.0.2.2

### Path setting (needed only for command line)

The commands ares-* can be invoked from anywhere in the file system provided the PATH
has been set correctly.

On Linux and Mac OS X:

	$ export PATH=$PATH:<webos-sdk-commands-full-path>/bin
	For exanple: export PATH=$PATH:/Users/ares/GIT/ares-webos-sdk/bin

On windows (cmd.exe):

	> SET PATH=%PATH%;<webos-sdk-commands-full-path>/bin
	For example: > SET PATH=%PATH%;C:\Users\ares\GIT\ares-webos-sdk/bin

NOTE: On Windows, you can also use a bash enviromment.
For example: [Git for Windows](http://code.google.com/p/msysgit/downloads/list?q=full+installer+official+git) which provides a bash shell as on Linux.

Command line usage
------------------

Warning: http proxy is not yet supported.

### ares-generate (.sh|.bat)

	$ ares-generate -l
	$ ares-generate -t bootplate-2.1.1-owo -p id=com.myapp -p version=1.2.3 -p title=MyApp MyApp

### ares-package (.sh|.bat)

	$ ares-package MyApp

	NB: ares-package will minify the application if possible.
	ares-package will also copy appinfo.json and framework_config.json after the minification

### ares-install (.sh|.bat)

	$ ares-install --list
	$ ares-install --install com.myapp_1.0.0_all.ipk
	$ ares-install --remove com.myapp

`--install` is the default:

	$ ares-install com.myapp_1.0.0_all.ipk

### ares-launch (.sh|.bat)

	$ ares-launch com.myapp


Project template configuration
------------------------------

There are two diferent project template configuration.

* for the command line ares-generate
* for the Ares IDE

### Project template configuration for ares-generate

The project templates used by the command line `ares-generate` are defined in the file `templates/project-templates.json`.

Additional templates could:

* be added directly into the file 'templates/project-templates.json'
* be added thru command line option '--repo <filename>'
* be added directly in the code of ares-generate.
For that, go in 'lib/ares-generate.js' in the property 'this.repositories'.
The entries of 'this.repositories' can either be local files under the 'templates' directory or files accessible thru http.

### Project template configuration for Ares IDE

This module "ares-webos-sdk" brings some additional project templates for `webOS` and override some project template definition brought by the Ares IDE.

This is done by the "genZip" entry of the file "ide.json" stored in the main directory of this module.

See [Project template configuration](../../hermes/README.md#project-template-config) in ares-project for more information.

Source code organization
------------------------

The source code of this module is organized as follow:

* `ares/client`: This is a browser side code of the webOS Ares plugin loaded in the Ares IDE. This part is written in enyo.
* `ares/server`: This is a server side code of the webOS Ares plugin loaded in the Ares IDE. This part is in javascript running into a nodejs server.
* `bin`: This directory contains the .sh and .bat wrappers for the ares-* commands
* `lib`: This directory contains the javascript code used by the server side Ares plugin and the ares-* commands.
* `scripts`: This directory contains script(s) used during 'npm install' to 'npm install' node modules integrated as git submodules.
* `templates`: This directory contains project template definitions
* `spec`: This directory contains various tests for that module.

Test
----

Turn on a device :

* Check ip address
* Install developer mode app & install
* login and enable developer mode
* Enable key server on developer mode app

Install jasmine npms

* npm install jasmine -g
* npm install jasmine-spec-reporter
* npm install jasmine-pretty-html-reporter

Run jasmine or npm test with profile, device, ip information
Should install below modules before testing

* `jasmine`: default profile=ose, device=emulator, ip=127.0.0.1.
* `jasmine --profile=ose --device=rpi3 --ip=192.168.0.12` : Set profile and device options.
* `jasmine -p=ose -d=rpi3 -ip=192.168.0.12`
* `npm test  -- -p=ose -d=rpi3 -ip=192.168.0.12` : Run npm test command.

Reference
---------

### Emulator

Whether there are one or several Emulator images, TCP Ports Redirections remain the same:

| Name | Host Port | Guest Port | Role |
| palm.emulator.debugger | 5858 | 5858 | **TBC** |
| palm.emulator.hostmode | 5880 | 8080 | **TBC** |
| palm.emulator.inspector | 9991 | 9991 | **TBC** |
| palm.emulator.ls2.private | 5512 | 4412 | **TBC** |
| palm.emulator.ls2.public | 5511 | 4411 | **TBC** |
| palm.emulator.ssh | 5522 | 22 | **TBC** |
