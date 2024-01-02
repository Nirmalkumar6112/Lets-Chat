# Lets Chat!
A Full Stack Chat Web Application, MERN Stack.

### Tools and Frameworks Used:
- MongoDb, Express.js, React, Node.js, Vite, Tailwind CSS.
- Authentication based on JWT Tokens and WebSockets

### Features:
- Online or Offline status indication
- File Upload and Attachmenst

# 🛠 Getting Started

1: Clone this repo:

```
$ git clone https://github.com/Nirmalkumar6112/Lets-Chat.git
```

2: Config `.env` file:
   - In api folder, Create a .env file and load the following data:

```
  MONGODB_URL="YOUR_MONGODB_URL_CONNECTION"
  JWT_SECRET="YOUR_JWT_TOKEN"
  CLIENT_URL="http://localhost:5173"
```
> [!TIP]
> For JWT Token, you can use some random AlphaNumeric characters.

3: Start the Server and Client:

```
$ cd api && nodemon index.js
```

4: Run the Client:

```
$ cd client && yarn dev
```

## 🚀 This Application is Deployed in Vercel.
- The `vercel.json` has the vercel deploy config.
 
> [!IMPORTANT]
> Currently the deployed app is not fully functional, there is a major issue in deployment in the server side, will be solved ASAP.
> But Local dev will be working fine without any issues.
 
## The Issue:
  - In Client side, in `chat.jsx` there is a function to connect WebSocket through ws://localhost:4000, in local dev we can connect and works well but in vercel deployment, i am figuring out a way to use the WS link from env variable. Thats the only issue in deployment, if you have any idea to solve, let me know...
