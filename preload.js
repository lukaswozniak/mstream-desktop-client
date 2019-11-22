const electron = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    new MutationObserver(() => {
        electron.ipcRenderer.send('set-is-playing', MSTREAMPLAYER.playerStats.playing);
    }).observe(document.querySelector('#play-pause-image'), { attributes: true });

    $('body').on('DOMSubtreeModified', '#title-text', () => {
        electron.ipcRenderer.send('set-current-song-metadata', MSTREAMPLAYER.playerStats.metadata, MSTREAMAPI.currentServer.token);
    });

    electron.ipcRenderer.on('perform-click', (event, buttonId) => {
        $(buttonId).click();
    })
});
