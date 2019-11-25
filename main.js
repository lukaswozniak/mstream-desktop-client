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
        name: 'mstream',
        identity: 'mStream Music',
        supportedUriSchemes: ['file'],
        supportedMimeTypes: ['audio/mpeg', 'application/ogg'],
        supportedInterfaces: ['player']
    });
    mpris.minimumRate = 0.5;
    mpris.maximumRate = 3.5;
    mpris.playbackStatus = MprisService.PLAYBACK_STATUS_PLAYING;
    mpris.playbackStatus = MprisService.PLAYBACK_STATUS_PAUSED;
    mpris.on('raise', () => { mainWindow.show(); });
    mpris.on('quit', () => { mainWindow.close(); });

    mpris.on('playpause', createClickButtonInWebAppCallback('#play-pause-button'));
    mpris.on('play', createClickButtonInWebAppCallback('#play-pause-button'));
    mpris.on('pause', createClickButtonInWebAppCallback('#play-pause-button'));
    mpris.on('stop', createClickButtonInWebAppCallback('#play-pause-button'));
    mpris.on('previous', createClickButtonInWebAppCallback('#previous-button'));
    mpris.on('next', createClickButtonInWebAppCallback('#next-button'));
    mpris.on('position', ({trackId, position}) => {
        const percentage = position/mpris.metadata['mpris:length'] * 100;
        mainWindow.webContents.send('set-current-song-position-percentage', percentage);
    });
    mpris.on('volume', (volume) => mainWindow.webContents.send('set-volume', volume*100));
    mpris.on('rate', (rate) => mainWindow.webContents.send('set-rate', rate));

    mpris.on('seek', () => console.log('seek'))
    mpris.on('open', () => console.log('open'))
    mpris.on('loopStatus', () => console.log('loopStatus'))
    mpris.on('shuffle', () => console.log('shuffle'))

    electron.ipcMain.on('set-is-playing', (event, isPlaying) => {
        mpris.playbackStatus = isPlaying ? MprisService.PLAYBACK_STATUS_PLAYING : MprisService.PLAYBACK_STATUS_PAUSED;
        mpris.seeked(0);
    });

    electron.ipcMain.on('set-current-song-metadata', (event, metadata, token) => {
        mpris.metadata = {
            'mpris:trackid': mpris.objectPath('track/' + metadata.track),
            'mpris:artUrl': store.get('serverAddress') + '/album-art/' + metadata['album-art'] + '?token=' + token,
            'xesam:title': metadata.title,
            'xesam:album': metadata.album,
            'xesam:artist': [metadata.artist]
        };
    });

    electron.ipcMain.on('set-current-song-play-time', (event, currentTime, duration) => {
        mpris.metadata = {
            ...mpris.metadata,
            'mpris:length': Math.round(duration * 1000 * 1000)
        };
        mpris.getPosition = () => Math.round(currentTime * 1000 * 1000);
    });

    electron.ipcMain.on('set-volume', (event, volume) => {
        mpris.volume = volume/100;
    });

    electron.ipcMain.on('set-rate', (event, rate) => {
        mpris.rate = rate;
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
            .then(() => { mainWindow.show(); })
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
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'icon/mstream-logo-cut.png')
    }, mainWindow)
        .then(handleEnteredServerAddress)
        .catch(handleUnexpectedError);
}

function createWindow() {
    mainWindow = new electron.BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        icon: path.join(__dirname, 'icon/mstream-logo-cut.png'),
        webPreferences: { preload: path.join(__dirname, 'preload.js') }
    });
    mainWindow.hide();
    mainWindow.on('closed', () => { mainWindow = null; });
    integratePlayerWithSystemControls();

    askUserForServerAddress();
}

electron.Menu.setApplicationMenu(null);
electron.app.commandLine.appendSwitch('disable-features', 'MediaSessionService');
electron.app.on('ready', createWindow);
electron.app.on('will-quit', () => { electron.globalShortcut.unregisterAll(); });
