import express from 'express'
import http from 'http'
import socketIo from 'socket.io'
import GameServer from './GameServer'
import path from 'path'

const PORT = process.env.PORT || 8080;
const app = express();
app.use(express.static('dist'));
app.use(express.static('static'));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
})
const server = http.createServer(app).listen(PORT);
console.log('Server running on Port ' + PORT);
const io = socketIo.listen(server);
const gameServer = new GameServer(io);
