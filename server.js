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
let roomAdmin = {};
let pushRoomAdmin = []
  io.on("connection", (socket) => {

  let iid = socket.id

  socket.on("online", async (data) => {
      socket.join(data.roomNumber);
      const msgModel = await MessageModels.find()
      io.sockets.emit("mongoMsg", msgModel);
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








  let disconnectRoom;
  let allId = []





  socket.on('startVideoConfrence', async(id) => {
    socket.emit('startVideoConfrence', pushRoomAdmin);
  })



  socket.on('reject', (socketId) => {
    socket.join(socket.id);

    io.sockets.to(socketId).emit('reject');
  })



  socket.on('permission', (room, adminId) => {

     const clientsInRoom = io.sockets.adapter.rooms.get(room);
    if (!clientsInRoom) {
      console.log(clientsInRoom);
      console.log('create')
      roomAdmin[room] = socket.id
      socket.emit('permission', room, socket.id, { type: 'create' });
      pushRoomAdmin.push({ id: roomAdmin[room], room })
      io.sockets.emit('startVideoConfrence', pushRoomAdmin);
      socket.join(room);
    }
    else if (roomAdmin[room] === socket.id) {
      io.sockets.emit('startVideoConfrence', pushRoomAdmin);
      socket.emit('permission', room, socket.id, { type: 'joinAdmin' });
      socket.join(room);
    }
    else {
      console.log('join')
      io.sockets.to(adminId ? adminId : roomAdmin[room]).emit('permission', room, socket.id, { type: 'join' });
    }
   disconnectRoom = room
  })



  socket.on('offer1', (socketId, room) => {
    disconnectRoom = room
    io.sockets.sockets.get(socketId).join(room)
    room && io.sockets.adapter.rooms.get(room).forEach((all) => (allId.push(all)))
    io.sockets.to(room).emit('offer1', socketId, room, allId);
    disconnectRoom = room
  })


  socket.on('offer2', (offer, socketId) => {
    io.to(socketId).emit('offer2', offer, socket.id);
  });

  socket.on('answer', (answer, socketId) => {
    io.to(socketId).emit('answer', answer, socket.id);
  });

  socket.on('candidate', (call, room) => {
    socket.broadcast.to(room).emit('candidate', call, socket.id);
  });




  socket.on('leave', (room, socketId) => {
    if (!socketId) {
      socket.emit('leave', socket.id, { type: 'leftMe' });
      socket.broadcast.to(room).emit('leave', socket.id, null);
      const clientsInRoom = io.sockets.adapter.rooms.get(room);
      // if (clientsInRoom === undefined) io.sockets.emit('startVideoConfrence', socket.id, null);
      // delete roomAdmin[disconnectRoom]
      pushRoomAdmin = pushRoomAdmin.filter((room) => room.id !== socket.id)
      io.sockets.emit('startVideoConfrence', pushRoomAdmin);
      socket.leave(room);
    }
    else if (roomAdmin[room] === socket.id && socketId) {
      io.in(room).emit('leave', socketId, null);
      io.to(socketId).emit('leave', socket.id, { type: 'leftMe' });
      io.sockets.sockets.get(socketId).leave(room);
    }
  });




  socket.on('leaveChat', (room) => {
    pushRoomAdmin = pushRoomAdmin.filter((room) => room.id !== socket.id)
    io.sockets.emit('startVideoConfrence', pushRoomAdmin);

    socket.leave(room);
    disconnectRoom && socket.leave(disconnectRoom);
  });





  socket.on('disconnect', function () {
    console.log('disconnect')
    if (disconnectRoom) {
      delete roomAdmin[disconnectRoom]
      pushRoomAdmin = pushRoomAdmin.filter((room) => room.id !== socket.id)
      io.sockets.emit('startVideoConfrence', pushRoomAdmin);
      socket.broadcast.to(disconnectRoom).emit('leave', socket.id, null);
    }
  })




});
