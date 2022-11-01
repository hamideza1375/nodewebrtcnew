const { createServer } = require("http");
const { Server } = require("socket.io");
const express = require('express');
const app = express();
const port = 80;
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "http://192.168.42.42" } });


var fs = require('fs');
const appRoot = require("app-root-path");
const mongoose = require('mongoose');
const fileUpload = require("express-fileupload");
const winston = require('winston');
const { setHeaders } = require("./middleware/headers");
const User = require("./router/UserRouter");
const { MessageModels } = require('./model/MessageModels');
const ErrorMiddleware = require('./middleware/Error');



winston.add(new winston.transports.File({ filename: 'error-log.log' }));

process.on('uncaughtException', (err) => {console.log(err); winston.error(err.message);});
process.on('unhandledRejection', (err) => {console.log(err); winston.error(err.message);});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(setHeaders);
app.use(express.static("public"));
app.use(express.static("node_modules"));
 
app.use(fileUpload());
app.use(ErrorMiddleware);

app.use(User)

app.use((req, res) => {res.send("<h1 style='text-align:center;color:red; font-size:55px'> 404 </h1>");});


mongoose.connect(
  "mongodb://localhost:27017/chat",
      {
          useNewUrlParser: true, useUnifiedTopology: true
      })
      .then(() => console.log('db connected'))
      .catch((err) => console.error('db not connected', err));
  
    httpServer.listen(port, () => { console.log('conected'); });






  let users = []
  io.on("connection", (socket) => {

  let iid = socket.id

  socket.on("online", async (data) => {
    try {
     if(data?.roomNumber){
      socket.join(data.roomNumber);
      users.push({ id: socket.id, nickname: data.nickname, gender: data.gender, roomNumber: data.roomNumber });
      const msgModel = await MessageModels.find()
      io.sockets.emit("mongoMsg", msgModel);
      io.sockets.emit("online", users);
}    } 
    catch (err) {
      console.log(err);
    }
  });

  socket.on("chat message", async (message) => {
    try {
          await new MessageModels({ ...message }).save()
          io.to(message.roomNumber).emit("chat message", { ...message });
    } catch (err) { console.log(err); }
  });


  socket.on("deleteOne", async (id, data) => {
    try {
      let message = await MessageModels.findOne({ id: id })
      console.log(message);
      message.msgNm = data.name
      message.save()
      socket.emit("deleteOne", id);
    } catch (err) { console.log(err); }

  });


  socket.on("deleteMsg", async (id) => {
    try {
      let message = await MessageModels.findOne({ id: id })
      console.log(message);
      if(fs.existsSync(`${appRoot}/public/upload/${message.uri}`))
      fs.unlinkSync(`${appRoot}/public/upload/${message.uri}`)
      await MessageModels.deleteOne({ id: id })
      io.sockets.emit("deleteMsg", id);
    } catch (err) { console.log(err); }

  });

  socket.on("pvChat", (data) => {
    try {
      io.sockets.emit("pvChat", data, iid, users);
    } catch (err) { console.log(err); }

  });



  socket.on("typing", (data) => {
    try {
      socket.broadcast.in(data.roomNumber).emit("typing", data);
    } catch (err) { console.log(err); }

  });



  socket.on("disconnect", (idid) => {
    try {
      const users1 = users.filter((user) => user.id !== socket.id)
      io.sockets.emit("online", users = users1);
    } catch (err) { console.log(err); }
  })



  socket.on("delRemove", (idid) => {
    try {
      console.log(idid);
      const users1 = users.filter((user) => user.id !== socket.id)
      io.sockets.emit("online", users = users1);
      // ioo.sockets.emit("delRemove", users = users1 );
    } catch (err) { console.log(err); }

  })

});
