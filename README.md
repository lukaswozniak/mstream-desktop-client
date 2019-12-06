# mStream desktop client
Desktop client for [mStream](https://github.com/IrosTheBeggar/mStream) written in [Electron](https://github.com/electron/electron).

## Features
The app should work exactly like loading the web app in browser. The main advantage of desktop client is support for global media/function keyboard shortcuts.

## Development

### Install on Linux/MacOS

```
git clone https://github.com/lukaswozniak/mstream-desktop-client
cd mstream-desktop-client
npm install
```

### Install on Windows

#### Requirements
In order to use native Windows WinRT APIs ([NodeRT](https://github.com/NodeRT/NodeRT)), following need to be installed:
* MSVC v140 - VS 2015 C++ build tools
* Windows 10 SDK (10.0.17134)
* Python

#### Install
```
git clone https://github.com/lukaswozniak/mstream-desktop-client
cd mstream-desktop-client
npm install
.\node_modules\.bin\electron-rebuild.cmd
```

### Running
```
cd mstream-desktop-client
npm start
```
