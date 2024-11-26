const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files (for CSS, JS, etc.)
app.use(express.static('public'));

// Set up view engine
app.set('view engine', 'ejs');

// Serve the dashboard page (landing page)
app.get('/', (req, res) => {
    res.render('dashboard');
});

// Serve the meeting room page
app.get('/room/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    const userName = req.query.name;
    res.render('room', { roomId, userName });
});

// WebSocket events for real-time communication
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId);

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });

    socket.on('message', (message) => {
        io.to(message.roomId).emit('message', { user: socket.id, message: message.text });
    });

    socket.on('screen-share', (streamId) => {
        socket.broadcast.emit('screen-share', streamId);
    });
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
