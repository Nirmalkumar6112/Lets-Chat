const express = require('express')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const User = require('./models/User')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const bcrypt = require('bcryptjs')
const ws = require('ws')
const Message = require('./models/Message')
const fs = require('fs')

dotenv.config();

mongoose.connect(process.env.MONGODB_URL);

const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
}));

app.use('/api/uploads/',express.static(__dirname + '/uploads/'));

async function getUserDataFromReq(req){
    return new Promise((resolve,reject) => {
        const token = req.cookies?.token;
        if(token){
            jwt.verify(token,jwtSecret,{},(err,userData) => {
                if(err)
                    throw err;
                resolve(userData);
            });
        }
    });
}

app.get('/api/test',(req,res) => {
    res.json('Test OK');
})

app.get('/api/messages/:userId', async (req,res) => {
    const {userId} = req.params;
    const userData = await getUserDataFromReq(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
        sender: {$in: [userId,ourUserId]},
        recipient: {$in: [userId,ourUserId]},
    }).sort({createdAt: 1});

    res.json(messages);
});

app.get('/api/people', async (req,res) => {
    const users = await User.find({},{'_id':1, username:1});
    res.json(users);
});

app.get('/api/profile',(req,res) => {
    const token = req.cookies?.token;
    if(token){
        jwt.verify(token,jwtSecret,{},(err,userData) => {
            if(err)
                throw err;
            res.json(userData);
        });
    } 
    else{
        res.status(401).json('No Tokens');
    }
});

app.post('/api/login',async (req,res) => {
    const {username,password} = req.body;
    const foundUser = await User.findOne({username});
    if(foundUser){
        const passOk = bcrypt.compareSync(password,foundUser.password);
        if(passOk){
            jwt.sign({userId:foundUser._id,username},jwtSecret,{},(err,token) => {
                res.cookie('token',token,{sameSite:'none',secure:true}).json({
                    id: foundUser._id,
                })
            });
        }
    }
});

app.post('/api/logout',(req,res) => {
    res.cookie('token','',{sameSite:'none',secure:true}).json('Logout OK');
});

app.post('/api/register',async (req,res) => {
    const {username,password} = req.body;

    try{
        const hashedPwd = bcrypt.hashSync(password,bcryptSalt);
        const createdUser = await User.create({
            username: username,
            password: hashedPwd,
        });
        jwt.sign({userId:createdUser._id,username},jwtSecret,{},(err,token) => {
            if(err)
                throw err;
            res.cookie('token',token,{sameSite:'none',secure:true}).status(201).json({
                id: createdUser._id,
            });
        });
    }
    catch(err){
        if(err)
            throw err;
        res.status(500).json('Error');
    }
});

const server = app.listen(4000);

const wss = new ws.WebSocketServer({server});
wss.on('connection', (connection,req) => {
   
    function notifyAboutOnlinePeople(){
        //Notify everyone about onlinePeople
        [...wss.clients].forEach(client => {
            client.send(JSON.stringify({
            online: [...wss.clients].map(c => ({
                userId: c.userId,
                username: c.username
            })) 
            }));
        });
    }

    connection.isAlive = true;

    connection.timer = setInterval(() => {
        connection.ping();
        connection.deathTimer = setTimeout(() => {
            connection.isAlive = false;
            clearInterval(connection.timer);
            connection.terminate();
            notifyAboutOnlinePeople();
            //console.log('dead');
        }, 1000);
    }, 5000);

    connection.on('pong', () => {
        clearTimeout(connection.deathTimer);
    });

    // Read Username and id from the cookie for this connection
    const cookies = req.headers.cookie;
    if(cookies){
        const tokenCookieStr = cookies.split(';').find(str => str.startsWith('token='));
        if(tokenCookieStr){
            const token = tokenCookieStr.split('=')[1];
            if(token){
                jwt.verify(token,jwtSecret,{},(err,userData) => {
                    if(err)
                        throw err;
                    const {userId,username} = userData;
                    connection.userId = userId;
                    connection.username = username;
                });
            }
        }
    }
    
    connection.on('message',async (message) => {
        const messageData = JSON.parse(message.toString());
        const {recipient,text,file} = messageData;
        let filename = null;

        if(file){
            const parts = file.name.split('.');
            const extension = parts[parts.length - 1]
            filename = Date.now() + '.' + extension;
            const path = __dirname + '/uploads/' + filename;
            const bufferData = new Buffer(file.data.split(',')[1],'base64');

            fs.writeFile(path, bufferData, () => {
                console.log('File Saved: '+ path);
            });
        }

        if(recipient && (text || file)){
            const messageDoc = await Message.create({
                sender: connection.userId,
                recipient,
                text,
                file: file ? filename : null,
            });

            [...wss.clients]
                .filter(c => c.userId === recipient)
                .forEach(c => c.send(JSON.stringify({
                    text,
                    sender: connection.userId,
                    recipient,
                    file: file ? filename : null,
                    _id: messageDoc._id,
                })));
        }
    });

    notifyAboutOnlinePeople();
});
