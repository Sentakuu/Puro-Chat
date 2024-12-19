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
            "*waves excitedly* Hi there! Welcome to the lab!",
            "*perks up* Oh! A new friend!",
            "*bounces happily* Hello hello!",
            "*tilts head curiously* Nice to meet you!",
            "*approaches cautiously* Hi... are you friendly?",
            "*wags tail* Welcome to our hideout!",
            "*peeks around corner* Hello there!",
            "*jumps with excitement* A visitor!",
            "*extends paw* Nice to meet you!",
            "*circles around excitedly* New friend! New friend!",
            
            "*bounces with joy* This makes me so happy!",
            "*wipes away tear* That's so touching...",
            "*hugs self* Feeling all warm inside!",
            "*tail droops* That's a bit sad...",
            "*eyes sparkle* Amazing!",
            "*puffs up proudly* Well done!",
            "*shrinks back* That's scary...",
            "*jumps with excitement* Incredible!",
            "*heart races* Oh my!",
            "*giggles uncontrollably* That's funny!",
            
            "*explores corridor* This way looks safe!",
            "*investigates sound* Did you hear that?",
            "*discovers passage* A hidden route!",
            "*searches area* Must be something here...",
            "*finds clue* This is interesting!",
            "*examines wall* There might be a switch...",
            "*checks room* Clear for now!",
            "*investigates corner* Something's hidden...",
            "*discovers item* Look what I found!",
            "*searches cabinet* There must be supplies...",
            "*tilts head curiously* Tell me more!",
            "*wags tail* That's interesting!",
            "We should stick together!",
            "*bounces excitedly* Yes!",
            "Let's be careful while we chat!",
            
            // Combat and Defense
            "*takes defensive stance* Stay behind me!",
            "*watches surroundings* We're not alone...",
            "*readies defenses* They're coming!",
            "*secures perimeter* Area secured!",
            "*checks exits* Escape routes clear!",
            "*activates shields* Protection online!",
            "*reinforces barriers* Hold position!",
            "*monitors threats* Multiple contacts!",
            "*prepares countermeasures* Ready for anything!",
            "*sets up defenses* Safe zone established!",
            
            // Emergency
            "*sounds alarm* Emergency protocol active!",
            "*initiates evacuation* Everyone out, now!",
            "*activates emergency lights* This way!",
            "*secures hazardous materials* Containment active!",
            "*checks life support* Systems critical!",
            "*activates backup power* Emergency power online!",
            "*secures vital areas* Critical zones protected!",
            "*monitors emergency systems* Status critical!",
            "*prepares medical bay* Ready for casualties!",
            "*checks emergency exits* Escape routes clear!"
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
            "*examines specimen* Fascinating structure!",
            "*analyzes data* These results are promising!",
            "*reviews research* The implications are huge!",
            "*studies samples* Remarkable properties!",
            "*conducts tests* The reaction is stable!",
            "*observes experiment* Notable changes!",
            "*documents findings* Must record this!",
            "*checks readings* Values are consistent!",
            "*monitors reaction* Stable conditions!",
            "*analyzes patterns* Interesting correlation!",
            
            "*organizes research papers* Just tidying up!",
            "*checks equipment* Safety first!",
            "*takes notes* This is interesting...",
            "*runs tests* Let's see...",
            "*monitors screens* Everything looks normal.",
            "*adjusts settings* Almost perfect!",
            "*collects samples* For science!",
            "*updates records* Keeping track...",
            "*maintains equipment* Regular checkup!",
            "*reviews data* Fascinating results!",
            
            // Scientific
            "*analyzes data* Fascinating results!",
            "*studies specimens* Remarkable adaptation!",
            "*records observations* Unique properties!",
            "*conducts experiments* Testing hypothesis!",
            "*examines samples* Molecular structure stable!",
            "*reviews research* Breakthrough possible!",
            "*monitors reactions* Chemical balance perfect!",
            "*analyzes patterns* Correlation found!",
            "*studies behavior* Interesting response!",
            "*records data* Results promising!",
            
            // Emergency
            "*activates quarantine* Area isolated!",
            "*secures sensitive data* Information protected!",
            "*monitors contamination* Levels rising!",
            "*prepares decontamination* Cleansing ready!",
            "*checks radiation levels* Exposure minimal!",
            "*activates emergency protocols* Crisis mode!",
            "*secures critical systems* Core protected!",
            "*monitors emergency channels* Communications active!",
            "*prepares rescue operations* Ready to assist!",
            "*checks emergency supplies* Resources available!"
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
            "*shows worry* Be careful...",
            "*dances with glee* Wonderful!",
            "*looks amazed* Wow!",
            "*expresses concern* Stay safe!",
            "*jumps for joy* Fantastic news!",
            "*shows sympathy* I understand...",
            "*radiates warmth* Feel better!",
            "*looks impressed* Well done!",
            "*shows enthusiasm* That's the spirit!",
            "*expresses gratitude* Thank you!",
            
            "*finds passage* A secret way out!",
            "*examines door* It might be unlocked...",
            "*checks ceiling* Watch for vents!",
            "*investigates noise* Stay alert...",
            "*discovers secret* This is new!",
            "*searches desk* Any useful items?",
            "*finds document* Important information!",
            "*examines floor* Watch your step!",
            "*checks window* Possible escape route!",
            "*investigates vent* Could lead somewhere...",
            "*shows worry* Be careful...",
            "*dances with glee* Wonderful!",
            "*looks amazed* Wow!",
            "*expresses concern* Stay safe!",
            "*jumps for joy* Fantastic news!",
            "*shows sympathy* I understand...",
            "*radiates warmth* Feel better!",
            "*looks impressed* Well done!",
            "*shows enthusiasm* That's the spirit!",
            "*expresses gratitude* Thank you!",
            
            // Combat and Defense
            "*scans area* No immediate threats.",
            "*fortifies position* Better safe than sorry!",
            "*checks security* Perimeter breach!",
            "*activates alarms* Warning! Intruders!",
            "*deploys barriers* Protection active!",
            "*secures location* Safe for now!",
            "*monitors surroundings* Stay alert!",
            "*readies equipment* Prepared for combat!",
            "*checks defenses* All systems go!",
            "*activates protocols* Defense mode engaged!",
            
            // Emergency
            "*activates emergency beacons* Signal strong!",
            "*secures emergency equipment* Tools ready!",
            "*monitors disaster protocols* Systems engaged!",
            "*prepares evacuation routes* Paths clear!",
            "*checks emergency power* Backup stable!",
            "*activates crisis mode* Emergency active!",
            "*secures vital resources* Supplies protected!",
            "*monitors emergency frequencies* Channel open!",
            "*prepares crisis response* Team ready!",
            "*checks safety protocols* Procedures active!"
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

// Enable CORS for the Railway domain
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
}));

http.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend URL: ${RAILWAY_URL}`);
}); 