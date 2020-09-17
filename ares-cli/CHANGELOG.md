# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
## [1.12.0] - 2020-07-03
### Added
- Support set default device in ares-setup-device
- Support sessionId on ares-install for Auto
- Support sessionId on ares-launch for Auto
- Support displayId for web inspector ares-inspect
- Support sessionId for js service in ares-inspect
- Support displayId on ares-shell
- Open --hosted option in ares-launch to OSE

### Changed
- Updated node version to v8.12.0
- Changed com.sdk.ares.host enyo app to web app

### Removed
- Removed enyo in ares-package/generate
- Removed ares-build/ares-gdbserver commands
- Removed git requirements in ares-generate precondition
- Removed unused internal options in ares-inspect/push/pull/shell
- Removed banned word
- Cleaned up profile

### Fixed
- Fixed default param setting in ares-setup-device
- Fixed given an invalid value --display option
- Fixed typo and update help
- Fixed typo in qml app
- Fixed node depreacted API in CLI

## [1.11.1] - 2020-03-26
### Added
- Add displayAffinity in qml template for multi instance
- Add "applications" group to qml app permission

## [1.11.0] - 2020-03-09
### Added
- Support --diplay option for multiple instance

### Changed
- Set OSE to default profile
- Updated help of CLI commands
- Renamed CLI package file including version
- Updated npm and appinfo schema
- Changed app version to optional type
- Modified default app title to "new app"
- Changed web app template for js_service for OSE

### Removed
- Removed text related to largeIcon
- Deleted largeIcon property in template for OSE

### Fixed
- Fixed "$command -v" bug
- Fixed correct machine name on packaging

## [1.10.4] - 2019-12-20
### Changed
- Updated webOSjs-1.1.0 to webOSjs-1.2.0
- Updated API for ares-device-info
- Excluded app signing

### Fixed
- Fixed to pass json launch params as user specified types when launching an app
- Fixed parse error on CLI minification

## [1.10.3] - 2019-11-20
### Added
- Added ares-package --sign, --certificate to help

### Changed
- Create ID ndk release package by cli-pack

### Removed
- Removed ares-package --encrypt from help

## [1.10.2] - 2019-11-14
### Added
- Added a QML app template

### Changed
- Changed template names, basic and webappicon to webapp and icon

## [1.10.1] - 2019-10-21
### Added
- Added the WebOSSerivceBridge web app template
- Added checking each version number is 9 digits or less when packaging an app
- Added the guide on default target device in the CLI help

### Changed
- Changed to show appInstallService's error text when installing an app failed
- Changed the icon images provided by ares-generate --template to new images

### Removed
- Removed the webOS.js library
- ares-inspect --service option cannot be used with --open option
- Changed to provide EULA on the developer site when downloading the CLI package

### Fixed
- Enable ares-inspect --service option
- Fixed an issue where ares-inspect cannot open a browser on Windows
- Fix to create .ssh directory after executing ares-setup-device

## [1.9.5/1.10.0] - 2019-08-14
### Added
- Service only packaging with existing packageinfo.json
- Add packageinfo.json template

### Fixed
- ares-setup-device about .ssh directory error
- ares-inspect -o on Windows error

## [1.9.4] - 2019-06-10
### Changed
- Add ACG permission for OSE templeate
- Disable ares-inspect -s for OSE

## [1.9.3] - 2019-05-24
### Added
- Service only packaging feature
- Add readable permission to packaging source file
- Create Unit test report

### Fixed
- ares-setup-device -R permission error

## [1.9.2] - 2019-04-11
### Added
- Check packaging required field
- Encrypt ipk

### Changed
- Change hosted_webapp type to webapp

### Fixed
- TC failure
- ares-setup-device --reset option bug

## [1.9.1] - 2019-01-08
### Added
- Implement CLI Unit test basic
- Write CHANGELOG.md

### Changed
- Change directory and file structure
- Restruct CLI-PACK
- Update CLI build script
- Change default version 0.0.1 on OSE template

### Removed
- Remove enyo template generation
- Remove unused templates
- Remove watch profile
- Remove "changes" directory

### Fixed
- Print ares-novacom --forward running status

## [1.9.0] - 2018-09-13
### Changed
- Change minify library to support ES6+
- Change UX of overwrite on ares-generate

## [1.8.1] - 2018-07-25
### Added
- Support new OSE
- Add EULA

### Changed
- Update webOSjs-1.0.0 to webOSjs-1.1.0

## [1.7.2] - 2018-08-13

### Changed
- Restruct release package directory structure

## [1.7.1] - 2018-08-02
### Added
- Add ares-device-info command
- Support hosted web app template

### Changed
- Change webOS.js basic template files

### Removed
- Remove enyo related files and configs

## [1.6.3] - 2017-08-30
### Changed
- Do not check icon file for ares-package with 'rom'

## [1.6.2] - 2017-07-20
### Added
- Set port to use for ares-server
- Support SCAP Library 1.4.1
- Support SCAP API 1.5.0

## [1.5.2] - 2016-08-18
### Added
- Set port to use for ares-server
- Support SCAP API v1.3

## [1.5.1] - 2016-03-29
### Added
- Set port to use for ares-server

### Fixed
- Fix a bug for minifying enyo 2.6 app

## [1.5.0] - 2016-01-25
### Added
- Templates are updated for Enyo 2.6 app

## [1.1.0] - 2015-01-26
### Added
- webOS.js file into bootplate-web template (non-enyo app template). webOS.js is a library to call Luna Service API from a web app
- CLI command returns a proper exit code
- Support packaging app with symbolic link files

### Changed
- Update bootplate-moonstone template to Enyo 2.5 version
- Reduce app generation time of ares-generate

### Fixed
- Fix app packaging problem in Mac OS, that was occurred by UID
- Exclude .DS_Store file from app directory when packaging in Mac OS
- Clear connection with the target when the execution of CLI command completes

## [1.0.0] - 2014-06-18
### Added
- Support project creation
- Support web app packaging/installing/launching/closing
- Support target device managing
- Support debugging web apps
