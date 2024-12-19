const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const cors = require('cors');
const path = require('path');

// Enable CORS for all origins
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store connected users
const connectedUsers = new Map();

// Rest of your code with characters and AI logic remains the same...

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    let lastRespondingCharacter = null;

    // Handle user join
    socket.on('join', (userData) => {
        console.log('User joined:', userData);
        connectedUsers.set(socket.id, userData);
        
        if (userData.mode === 'irc') {
            broadcastIRCUsers();
            io.emit('message', {
                user: 'System',
                text: `${userData.name} has joined the chat`
            });
        }
    });

    // Handle chat message
    socket.on('chatMessage', (message) => {
        const user = connectedUsers.get(socket.id);
        console.log('Chat message received:', user?.mode, message);
        
        if (!user) {
            console.log('No user found for socket:', socket.id);
            return;
        }

        if (user.mode === 'ai') {
            // Send user's message
            io.to(socket.id).emit('message', {
                user: user.name,
                text: message
            });

            // Generate AI response
            setTimeout(() => {
                const respondingCharacter = chooseRespondingCharacter(message, lastRespondingCharacter);
                const response = getAIResponse(respondingCharacter, message);
                lastRespondingCharacter = respondingCharacter;
                
                io.to(socket.id).emit('message', {
                    user: respondingCharacter,
                    text: response
                });

                // Chance for additional character to join conversation
                if (Math.random() < 0.3) {
                    setTimeout(() => {
                        const secondCharacter = chooseRespondingCharacter(message, respondingCharacter);
                        const secondResponse = getAIResponse(secondCharacter, message);
                        
                        io.to(socket.id).emit('message', {
                            user: secondCharacter,
                            text: secondResponse
                        });
                    }, 1000 + Math.random() * 2000);
                }
            }, 1000 + Math.random() * 2000);
        } else {
            // IRC mode: broadcast to all IRC users
            io.emit('message', {
                user: user.name,
                text: message
            });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        const user = connectedUsers.get(socket.id);
        if (user && user.mode === 'irc') {
            io.emit('message', {
                user: 'System',
                text: `${user.name} has left the chat`
            });
        }
        connectedUsers.delete(socket.id);
        broadcastIRCUsers();
        console.log('User disconnected:', socket.id);
    });
});

// Function to broadcast IRC user list
function broadcastIRCUsers() {
    const ircUsers = Array.from(connectedUsers.values())
        .filter(user => user.mode === 'irc')
        .map(user => ({ name: user.name }));
    
    io.emit('userList', ircUsers);
}

// Update port configuration for Railway
const PORT = process.env.PORT || 8080;

http.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
}); 