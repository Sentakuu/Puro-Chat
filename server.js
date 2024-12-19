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
app.use(express.static('public'));

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store connected users
const connectedUsers = new Map();

// AI character personalities and response patterns
const characters = {
    "Puro": {
        personality: "friendly, playful, protective, curious",
        keywords: {
            "hello": ["*wags tail excitedly* Hi there! I'm so happy to meet you!", "Hello! Don't worry, I won't hurt you!"],
            "help": ["I'll protect you! Stay close to me!", "Don't worry, we can find a way out together!"],
            "latex": ["*looks nervous* We need to be careful of the other latex creatures...", "Not all latex creatures are bad, I promise!"],
            "lab": ["This place is dangerous, but I know my way around!", "Dr.K's lab has many secrets..."],
            "friend": ["*bounces happily* Yes! We're friends! I'll keep you safe!", "Friends stick together in this place!"],
            "scared": ["Don't be afraid! I'm here to help you!", "*gently pats you* Everything will be okay!"],
            "explore": ["*excited* Yes! Let's explore together! I know some safe routes!", "I can show you around, but we must be careful!"],
            "colin": ["Colin? Have you seen him? I need to find him!", "*worried* I hope Colin is safe..."],
            "dr.k": ["*nervous* We should avoid Dr.K's experiments...", "Dr.K's research is dangerous..."],
            "game": ["*playful* Want to play a game? Just be quiet so others don't hear us!", "Games are fun, but we should stay alert!"]
        },
        defaultResponses: [
            "*tilts head curiously* Tell me more!",
            "*wags tail* That's interesting!",
            "We should stick together!",
            "*bounces excitedly* Yes!",
            "Let's be careful while we chat!"
        ]
    },
    "Dr.K": {
        personality: "scientific, stern, focused on research",
        keywords: {
            "experiment": ["The experiments must continue. It's all for science.", "Fascinating results..."],
            "latex": ["The latex creatures are perfect specimens.", "My research on latex creatures is groundbreaking."],
            "lab": ["My laboratory is not a playground.", "Stay away from the restricted areas."],
            "research": ["The research cannot be stopped.", "These results are promising..."],
            "specimen": ["*adjusts glasses* Interesting specimen...", "You'd make an excellent test subject."],
            "escape": ["No one leaves until the research is complete.", "The facility is locked down for a reason."],
            "puro": ["That failed experiment is still running around...", "Puro should have been contained."],
            "colin": ["Another potential test subject.", "The human specimen must be found."],
            "protocol": ["Follow the protocols!", "The protocols exist for everyone's safety."],
            "dangerous": ["Everything is under control.", "The situation is being monitored."]
        },
        defaultResponses: [
            "Get back to your designated area.",
            "This area is restricted.",
            "The experiments must continue.",
            "*writes in notebook* Interesting...",
            "Follow the protocols!"
        ]
    },
    "Colin": {
        personality: "cautious, determined to escape, trusts Puro",
        keywords: {
            "escape": ["We need to find a way out!", "There must be an exit somewhere..."],
            "puro": ["Puro? Is that really you?", "Puro has been helping me survive here."],
            "latex": ["*nervous* We need to avoid the latex creatures...", "The latex creatures are everywhere..."],
            "help": ["Please, help me get out of here!", "We need to work together to escape!"],
            "dr.k": ["*whispers* We need to avoid Dr.K...", "Dr.K's experiments are terrifying..."],
            "lab": ["This lab is like a maze...", "We need to be careful in this place."],
            "friend": ["Puro is the only friend I can trust here.", "It's hard to know who to trust..."],
            "scared": ["I'm scared too, but we can't give up!", "We have to stay strong..."],
            "human": ["I need to stay human...", "I don't want to change..."],
            "transform": ["*worried* I can't let them change me!", "We have to prevent the transformation!"]
        },
        defaultResponses: [
            "We need to be quiet...",
            "Is someone there?",
            "I hope we can get out soon...",
            "*looks around nervously*",
            "Let's stick together..."
        ]
    }
};

// Function to get contextual AI response
function getAIResponse(character, message) {
    const characterData = characters[character];
    if (!characterData) return null;

    // Convert message to lowercase for matching
    const lowerMessage = message.toLowerCase();
    
    // Check for keyword matches
    for (const [keyword, responses] of Object.entries(characterData.keywords)) {
        if (lowerMessage.includes(keyword)) {
            return responses[Math.floor(Math.random() * responses.length)];
        }
    }

    // If no keyword matches, return random default response
    return characterData.defaultResponses[Math.floor(Math.random() * characterData.defaultResponses.length)];
}

// Function to choose responding character based on context
function chooseRespondingCharacter(message, lastCharacter) {
    const lowerMessage = message.toLowerCase();
    
    // Direct character mentions
    if (lowerMessage.includes('puro')) return 'Puro';
    if (lowerMessage.includes('dr.k')) return 'Dr.K';
    if (lowerMessage.includes('colin')) return 'Colin';
    
    // Avoid same character responding twice in a row
    const availableCharacters = Object.keys(characters).filter(char => char !== lastCharacter);
    return availableCharacters[Math.floor(Math.random() * availableCharacters.length)];
}

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
const RAILWAY_URL = process.env.RAILWAY_STATIC_URL || `http://localhost:${PORT}`;

http.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend URL: ${RAILWAY_URL}`);
}); 