import GameState from './game/GameState'
import {basicMap} from './game/DefaultMaps'

const TICKTIME = 10000
const TICKSPERBUILDTICK = 1

export default class GameServer {
  constructor(io){
    this.gameState = new GameState();
    this.gameState.loadSave(basicMap);
    this.tickStart
    this.tickIndex = 0
    this.setIo(io);
  }

  setIo(io){
    this.io = io;
    this.clients = {};
    this.io.on('connection', (client) => this.onConnection(client));

    this.loopHelper()
  }

  loopHelper() {
    this.tickStart = (new Date()).getTime()
    this.tick()
    this.loopToken = setTimeout(() => this.loopHelper(), TICKTIME)
  }

  getAvailableFaction() {
    let takenFactions = []
    for (let client in this.clients) {
      if (this.clients[client].faction) takenFactions.push(this.clients[client].faction)
    }
    let availableFactions = []
    for (let faction in this.gameState.factions) {
      if (!takenFactions.includes(faction)) availableFactions.push(faction)
    }
    return availableFactions[0] || null
  }

  onConnection(client){
    client.faction = this.getAvailableFaction()
    if (!client.faction) {
      console.log('game full')
      return
    }
    this.clients[client.id] = client;
    console.log('Client_' + client.id + ' has connected.')
    let r = []
    for (let i in this.gameState.factions) {
      r[i] = this.gameState.factions[i].color
    }
    // console.log(r)
    client.emit('faction', client.faction)
    // client.emit('colors', r)
    client.emit('tickTime', TICKTIME)
    client.emit('newGameState', {gs: this.gameState, tickIndex: this.tickIndex, tickStart: this.tickStart});
    
    client.on('disconnect', () => this.onDisconnection(client));
    client.on('sendAction', (action) => { action.local = false;action.faction = client.faction; this.gameState.enterAction(action) })
  }

  onDisconnection(client){
    console.log('Client_' + client.id + ' has disconnected.')
    delete this.clients[client.id];
  }

  tick(){
    this.tickIndex++
    let result = this.tickIndex % TICKSPERBUILDTICK == 0 ? this.gameState.buildTick() : this.gameState.processTurn()
    this.io.emit('newTurn', {
      tickIndex: this.tickIndex,
      tickStart: this.tickStart,
      result: result
    })
  }
}