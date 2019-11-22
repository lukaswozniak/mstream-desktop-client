const electron = require('electron');

let mstreamPlayer;
let speedBar;

window.addEventListener('DOMContentLoaded', () => {
    mstreamPlayer = document.querySelector('#mstream-player');
    speedBar = document.querySelector('#speed-bar');

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

    electron.ipcRenderer.send('set-volume', MSTREAMPLAYER.playerStats.volume);
    const volumeSlider = document.querySelector('.volume-slider');
    volumeSlider.oninput = () => {
        electron.ipcRenderer.send('set-volume', MSTREAMPLAYER.playerStats.volume);
    };
    volumeSlider.onchange = () => {
        electron.ipcRenderer.send('set-volume', MSTREAMPLAYER.playerStats.volume);
    };

    electron.ipcRenderer.send('set-rate', MSTREAMPLAYER.playerStats.playbackRate);
    speedBar.children[0].oninput = () => {
        electron.ipcRenderer.send('set-rate', MSTREAMPLAYER.playerStats.playbackRate);
    };
    speedBar.children[0].onchange = () => {
        electron.ipcRenderer.send('set-rate', MSTREAMPLAYER.playerStats.playbackRate);
    };

    electron.ipcRenderer.on('perform-click', (event, buttonId) => {
        $(buttonId).click();
    });

    electron.ipcRenderer.on('set-current-song-position-percentage', (event, percentage) => {
        MSTREAMPLAYER.seekByPercentage(percentage);
    });

    electron.ipcRenderer.on('set-volume', (event, volume) => {
        mstreamPlayer.__vue__.curVol = volume;
        electron.ipcRenderer.send('set-volume', volume);
    });

    electron.ipcRenderer.on('set-rate', (event, rate) => {
        speedBar.__vue__.curSpeed = rate;
        electron.ipcRenderer.send('set-rate', rate);
    });
});
