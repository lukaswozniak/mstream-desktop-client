const path = require('path');
const electron = require('electron');
const prompt = require('electron-prompt');
const Store = require('electron-store');
const MprisService = require('mpris-service');

let mainWindow;
let mpris;
const store = new Store();

function clickButtonInWebApp(buttonId) {
    mainWindow.webContents.send('perform-click', buttonId);
}

function createClickButtonInWebAppCallback(buttonId) {
    return () => { clickButtonInWebApp(buttonId); };
}

function disposeMainWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
    }
    mainWindow = null;
}

function handleUnexpectedError(error) {
    mainWindow.hide();
    electron.dialog.showErrorBox('Unexpected error', 'Message: ' + error);
    askUserForServerAddress();
}

function validateHttpResponseCode(httpResponseCode) {
    if (httpResponseCode !== 200) {
        handleUnexpectedError('Server returned status ' + httpResponseCode);
    }
}

function initializeMpris() {
    mpris = MprisService({
        name: 'electron',
        identity: 'mStream Music',
        supportedUriSchemes: ['file'],
        supportedMimeTypes: ['audio/mpeg', 'application/ogg'],
        supportedInterfaces: ['player']
    });
    mpris.on('playpause', createClickButtonInWebAppCallback('#play-pause-button'));
    mpris.on('play', createClickButtonInWebAppCallback('#play-pause-button'));
    mpris.on('pause', createClickButtonInWebAppCallback('#play-pause-button'));
    mpris.on('stop', createClickButtonInWebAppCallback('#play-pause-button'));
    mpris.on('previous', createClickButtonInWebAppCallback('#previous-button'));
    mpris.on('next', createClickButtonInWebAppCallback('#next-button'));
    mpris.on('raise', () => { mainWindow.show(); });

    mpris.on('play', () => console.log('play'))
    mpris.on('seek', () => console.log('seek'))
    mpris.on('position', () => console.log('position'))
    mpris.on('open', () => console.log('open'))
    mpris.on('volume', () => console.log('volume'))
    mpris.on('loopStatus', () => console.log('loopStatus'))
    mpris.on('shuffle', () => console.log('shuffle'))

    electron.ipcMain.on('set-is-playing', (event, isPlaying) => {
        mpris.playbackStatus = isPlaying ? MprisService.PLAYBACK_STATUS_PLAYING : MprisService.PLAYBACK_STATUS_PAUSED;
        mpris.seeked(0);
    })

    electron.ipcMain.on('set-current-song-metadata', (event, metadata, token) => {
        mpris.metadata = {
            'mpris:trackid': mpris.objectPath('track/' + metadata.track),
            //'mpris:length': duration * 1000 * 1000, // In microseconds
            'mpris:artUrl': store.get('serverAddress') + '/album-art/' + metadata['album-art'] + '?token=' + token,
            'xesam:title': metadata.title,
            'xesam:album': metadata.album,
            'xesam:artist': [metadata.artist]
        };
    });
}

function registerGlobalHotkeys() {
    electron.globalShortcut.unregisterAll();
    const playPauseSuccess = electron.globalShortcut.register('MediaPlayPause', createClickButtonInWebAppCallback("#play-pause-button"));
    const previousSuccess = electron.globalShortcut.register('MediaPreviousTrack', createClickButtonInWebAppCallback("#previous-button"));
    const nextSuccess = electron.globalShortcut.register('MediaNextTrack', createClickButtonInWebAppCallback("#next-button"));
    if (! (playPauseSuccess && previousSuccess && nextSuccess)) {
        electron.dialog.showErrorBox('Error', 'Failed to register some of keyboard media controls');
    }
}

function integratePlayerWithSystemControls() {
    if (process.platform == 'linux') {
        initializeMpris();
    } else {
        registerGlobalHotkeys();
    }
}

function handleEnteredServerAddress(enteredUrl) {
    if (enteredUrl) {
        store.set('serverAddress', enteredUrl);
        mainWindow.loadURL(enteredUrl)
            .then(() => { mainWindow.show(); integratePlayerWithSystemControls(); })
            .catch(handleUnexpectedError);
        mainWindow.webContents.once('did-navigate', (event, url, code) => { validateHttpResponseCode(code); });
    } else { // cancelled by user
        disposeMainWindow();
    }
}

function askUserForServerAddress() {
    const value = store.get('serverAddress') || 'https://demo.mstream.io';
    prompt({
        title: 'mStream Music',
        label: 'Enter your mStream server address:',
        value: value,
        inputAttrs: { type: 'url' },
        type: 'input',
        autoHideMenuBar: true
    }, mainWindow)
        .then(handleEnteredServerAddress)
        .catch(handleUnexpectedError);
}

function createWindow() {
    mainWindow = new electron.BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: { preload: path.join(__dirname, 'preload.js') }
    });
    mainWindow.on('closed', () => { mainWindow = null; });

    askUserForServerAddress();
}

electron.Menu.setApplicationMenu(null);
electron.app.on('ready', createWindow);
electron.app.on('will-quit', () => { electron.globalShortcut.unregisterAll(); });
