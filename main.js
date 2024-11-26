const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
myVideo.muted = true;

let myStream;
let peer;
const roomId = window.location.pathname.split('/')[2];
const userName = new URLSearchParams(window.location.search).get('name');

// Get user's media stream (audio and video)
navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then((stream) => {
    myStream = stream;
    peer = new Peer(undefined, {
        host: '/',
        port: '3001',
    });

    addVideoStream(myVideo, stream);

    peer.on('call', (call) => {
        call.answer(stream);
        const video = document.createElement('video');
        call.on('stream', (userVideoStream) => {
            addVideoStream(video, userVideoStream);
        });
    });

    socket.emit('join-room', roomId, peer.id);

    socket.on('user-connected', (userId) => {
        connectToNewUser(userId, stream);
    });

    socket.on('user-disconnected', (userId) => {
        // Handle user disconnection (e.g., remove their video feed)
        console.log(`User ${userId} disconnected`);
    });

    // Chat functionality
    const sendButton = document.getElementById('send');
    const chatInput = document.getElementById('chat-box');

    sendButton.addEventListener('click', () => {
        const message = chatInput.value.trim();
        if (message) {
            socket.emit('message', { roomId, text: message });
            chatInput.value = '';
        }
    });

    socket.on('message', (data) => {
        appendMessage(data.user, data.message);
    });

    function appendMessage(user, message) {
        const li = document.createElement('li');
        li.textContent = `${user}: ${message}`;
        document.getElementById('messages').appendChild(li);
    }

    function connectToNewUser(userId, stream) {
        const call = peer.call(userId, stream);
        const video = document.createElement('video');
        call.on('stream', (userVideoStream) => {
            addVideoStream(video, userVideoStream);
        });
    }

    function addVideoStream(video, stream) {
        video.srcObject = stream;
        video.addEventListener('loadedmetadata', () => {
            video.play();
        });
        videoGrid.append(video);
    }

    // Mute/Unmute Audio Button
    const muteAudioButton = document.getElementById('mute-audio');
    muteAudioButton.addEventListener('click', () => {
        const audioTrack = myStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            muteAudioButton.textContent = audioTrack.enabled ? 'Mute Audio' : 'Unmute Audio';
        }
    });

    // Mute/Unmute Video Button
    const muteVideoButton = document.getElementById('mute-video');
    muteVideoButton.addEventListener('click', () => {
        const videoTrack = myStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            muteVideoButton.textContent = videoTrack.enabled ? 'Mute Video' : 'Unmute Video';
        }
    });

    // Screen Sharing Button
    const shareScreenButton = document.getElementById('share-screen');
    shareScreenButton.addEventListener('click', () => {
        navigator.mediaDevices.getDisplayMedia({ video: true })
            .then((stream) => {
                screenStream = stream;
                const screenVideo = document.createElement('video');
                addVideoStream(screenVideo, screenStream);

                // Stop screen sharing when the user closes it
                screenStream.getTracks()[0].onended = () => {
                    screenVideo.remove();
                };

                // Notify others about screen sharing (optional)
                socket.emit('screen-share', stream.id);
            })
            .catch((err) => {
                console.error('Error sharing screen:', err);
            });
    });
});
