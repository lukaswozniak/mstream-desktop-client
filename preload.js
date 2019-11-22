const electron = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    new MutationObserver(() => {
        electron.ipcRenderer.send('set-is-playing', MSTREAMPLAYER.playerStats.playing);
    }).observe(document.querySelector('#play-pause-image'), { attributes: true });

    $('body').on('DOMSubtreeModified', '#title-text', () => {
        electron.ipcRenderer.send(
            'set-current-song-metadata',
            MSTREAMPLAYER.playerStats.metadata,
            MSTREAMAPI.currentServer.token);
    });

    $('body').on('DOMSubtreeModified', '.duration-text', () => {
        electron.ipcRenderer.send(
            'set-current-song-play-time',
            MSTREAMPLAYER.playerStats.currentTime,
            MSTREAMPLAYER.playerStats.duration);
    });

    electron.ipcRenderer.on('perform-click', (event, buttonId) => {
        $(buttonId).click();
    });

    electron.ipcRenderer.on('set-current-song-position-percentage', (event, percentage) => {
        MSTREAMPLAYER.seekByPercentage(percentage);
    });
});
