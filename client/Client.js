import GameState from '../src/game/GameState'
import Screen from './Screen'
import * as PIXI from 'pixi.js'

const TICKS_PER_SEC = 30

export default class Client {
  constructor() {
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST
    this.gameState = null
    this.screen = null
    this.pendingMoves = []
    this.pendingBuildOrders = []
    this.toBeDeletedOrders = []
    this.tickTime = 1000
    this.tickIndex = null
    this.lastTickRecieved = null
    this.timeTilNextTick = null
    this.faction = 'Unknown'
    this.myColor = '#000000'
    PIXI.loader.add('spritesheet.json').load(() => this.setSocket(io))
  }
  setSocket(io) {
    this.socket = io()
    this.socket.on('newGameState', (newGameState) => {this.onNewGameState(newGameState); this.myColor = this.getFactionColor(this.faction)})
    this.socket.on('tickTime', (tickTime) => {this.tickTime = tickTime})
    this.socket.on('newTurn', (newTurn) => this.onNewTurn(newTurn))
    this.socket.on('faction', (faction) => {this.faction = faction})
  }
  onNewGameState(newGameState) {
    this.lastTickRecieved = newGameState.tickStart
    this.tickIndex = newGameState.tickIndex
    this.gameState = new GameState()
    this.gameState.loadSave(newGameState.gs)
    this.screen = new Screen(this)
    this.screen.onNewGameState(this.gameState)
    this.startUpdateLoop()
  }
  onNewTurn(turnData) {
    this.lastTickRecieved = turnData.tickStart
    this.tickIndex = turnData.tickIndex
    turnData.result.move.forEach((r) => {this.gameState.enterAction(r)})
    turnData.result.attack.forEach((r) => {this.gameState.enterAction(r)})
    turnData.result.build.forEach((r) => {this.gameState.enterAction(r)})
    if (turnData.result.buildTick) {
      this.pendingBuildOrders.forEach((order) => { order.local = false; this.gameState.enterAction(order)})
      this.pendingBuildOrders = []
      this.gameState.buildTick()
    }
    else {
      this.gameState.processTurn()
    }
    this.pendingMoves = []
    this.toBeDeletedOrders = []
    this.screen.onNewTurn(turnData.result)
    this.screen.updateUI()
  }
  startUpdateLoop(){
    this.lastUpdate = (new Date()).getTime()
    this.loopToken = setTimeout(() => this.update(), 1000 / TICKS_PER_SEC)
  }
  update() {
    let currentTime = (new Date()).getTime()
    this.timeTilNextTick = this.tickTime - (currentTime - this.lastTickRecieved)
    this.screen.update(currentTime - this.lastUpdate)
    this.lastUpdate = currentTime
    this.loopToken = setTimeout(() => this.update(), 1000 / TICKS_PER_SEC)
  }
  sendMove(unit, nx, ny) {
    let action = {unit: unit.id, x: nx, y: ny, type: 'move' }

    let otherMove = this.isOccupied(unit)
    if (otherMove) {
      this.deleteMove(otherMove)
    }
    this.socket.emit('sendAction', action)
    action.local = true
    this.pendingMoves.push(action)
    this.screen.enterAction(action)
  }
  sendAttack(attacker, defender) { 
    let action = {attacker: attacker.id, defender: defender.id, type: 'attack'}
    let otherMove = this.isOccupied(attacker)
    if (otherMove != null) {
      this.deleteMove(otherMove)
    }
    this.socket.emit('sendAction', action)
    action.local = true
    this.pendingMoves.push(action)
    this.screen.enterAction(action)
  }
  deleteMove(move) {
    this.screen.gameBoard.removeAction(move)
    this.pendingMoves.splice(this.pendingMoves.indexOf(move), 1);
  }
  isOccupied(unit) {
    let prevMove = false
    this.pendingMoves.forEach((move) => {
      if (move.attacker == unit.id || move.unit == unit.id) prevMove = move
    })
    return prevMove
  }
  getFactionColor(f) {
    return this.gameState.factions[f].color || '#000000';
  }
  addCityOrder(order) {
    let t = order.type
    order.type = 'build'
    order.bType = t
    order.local = true
    if (order.bType == 'build') {
      // do something cool
      this.pendingBuildOrders.push(order)
      order.local = true
    }
    else if (order.bType == 'remove') {
      // also do something cool
      let city = this.gameState.getCityAt(order.city.x, order.city.y)
      // console.log(order)
      // console.log(this.pendingBuildOrders)
      // console.log(city.buildQueue)
      this.pendingBuildOrders.forEach((pO) => {
        if ((pO.city.x == order.city.x && pO.city.y == order.city.y) 
        && pO.i == order.i) this.pendingBuildOrders.splice(i, 1)
      })
      for (let i in city.buildQueue) {
        if (i == order.i) {this.toBeDeletedOrders.push(order)}
      }
    }
    this.screen.updateUI()
    order.city = {x: order.city.x, y: order.city.y}
    this.socket.emit('sendAction', order)
  }
}