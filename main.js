const electron = require('electron');
const prompt = require('electron-prompt');
const Store = require('electron-store');

let mainWindow;
const store = new Store();

function disposeMainWindow() {
    if (mainWindow) {
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

function registerGlobalHotkeys() {
    electron.globalShortcut.register(
        'MediaPlayPause',
        () => { mainWindow.webContents.executeJavaScript('$("#play-pause-button").click()'); });
    electron.globalShortcut.register(
        'MediaPreviousTrack',
        () => { mainWindow.webContents.executeJavaScript('$("#previous-button").click()'); });
    electron.globalShortcut.register(
        'MediaNextTrack',
        () => { mainWindow.webContents.executeJavaScript('$("#next-button").click()'); });
}

function handleEnteredServerAddress(enteredUrl) {
    if (enteredUrl) {
        store.set('serverAddress', enteredUrl);
        mainWindow.loadURL(enteredUrl)
            .then(() => { mainWindow.show(); registerGlobalHotkeys(); })
            .catch(handleUnexpectedError);
        mainWindow.webContents.once('did-navigate', (event, url, code) => { validateHttpResponseCode(code); });
    } else { // cancelled by user
        disposeMainWindow();
    }
}

function askUserForServerAddress() {
    const value = store.get('serverAddress') || 'https://mstream.example.org';
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
        show: false
    });
    mainWindow.on('closed', () => { mainWindow = null; });

    askUserForServerAddress();
}

electron.Menu.setApplicationMenu(null);
electron.app.on('ready', createWindow);
