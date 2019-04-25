import * as PIXI from 'pixi.js'
import GameBoard from './GameBoard'
import GameInput from './GameInput'

// handles resizing, zooming, camera movement

// TODO: Add panning/zooming

// highly regined number gotten from years of experimentation
const SCROLL_CONSTANT = 8.76838

export default class Screen {
  constructor(client) {
    this.client = client
    this.app = new PIXI.Application()
    document.body.appendChild(this.app.view)
    this.gameBoard = new GameBoard(this.app, this.client)
    this.app.stage.addChild(this.gameBoard)
    this.input = new GameInput(this)

    this.cameraX = 0
    this.cameraY = 0
    this.prevDx = null
    this.prevDy = null
    this.desiredX = null
    this.desiredY = null
    this.maxZoomX = null
    this.maxZoomY = null

    this.gameBoard.scale.set(5, 5)
    this.fitToScreen()
    window.addEventListener('resize', () => this.onResize())

    this.input.addCb('KeyM', () => {
      if (this.gameBoard.selectedUnitPanel.hidden == false && 
        this.gameBoard.selectedUnit.factionId == this.client.faction) {
          this.gameBoard.selectedUnitPanel
          .querySelector('#actions')
          .querySelector('#move')
          .querySelector('button').click()
      }
    })
    this.input.addCb('KeyA', () => {
      if (this.gameBoard.selectedUnitPanel.hidden == false && 
        this.gameBoard.selectedUnit.factionId == this.client.faction) {
          this.gameBoard.selectedUnitPanel
          .querySelector('#actions')
          .querySelector('#attack')
          .querySelector('button').click()
      }
    })
    this.input.addCb('KeyC', () => {
      (!this.gameBoard.cityPanel.hidden) ? this.gameBoard.openCityPanel() : this.gameBoard.selectUnit()
    })
    this.input.addCb('KeyX', () => {
      (!this.gameBoard.cityPanel.hidden) ? this.gameBoard.openCityPanel() : this.gameBoard.selectUnit()
    })
    this.input.addCb('Escape', () => {
      (!this.gameBoard.cityPanel.hidden) ? this.gameBoard.openCityPanel() : this.gameBoard.selectUnit()
    })
  }
  // closes and opens city screen so to update it
  updateUI() {
    let r = this.gameBoard.lastClickedCity
    if (r == null) return
    this.gameBoard.openCityPanel(null)
    this.gameBoard.openCityPanel(r) 
  }
  update(deltaTime) {
    deltaTime /= 1000
    // drag movement
    if (this.input.mouseDown && this.input.mousePos) {
      let dx = this.input.worldStartPos.x - (this.input.mousePos.x + this.cameraX)
      let dy = this.input.worldStartPos.y - (this.input.mousePos.y + this.cameraY)
      this.moveCamera(dx * deltaTime * this.gameBoard.scale.x, dy * deltaTime * this.gameBoard.scale.y)
    }

    // keyboard movement
    let movementValue = 30
    let dx = 0
    let dy = 0
    if (this.input.keysDown['ArrowRight']) dx += movementValue
    if (this.input.keysDown['ArrowLeft']) dx -= movementValue
    if (this.input.keysDown['ArrowUp']) dy -= movementValue
    if (this.input.keysDown['ArrowDown']) dy += movementValue
    this.moveCamera(dx * deltaTime * this.gameBoard.scale.x, dy * deltaTime * this.gameBoard.scale.y)

    if (this.desiredX || this.desiredY && this.gameBoard.cityPanel.hidden) {
      dx = this.desiredX - this.cameraX || 0
      dy = this.desiredY - this.cameraY || 0
      if (Math.abs(this.prevDx - dx) < 1 && Math.abs(this.prevDy - dy) < 1) { this.desiredX = null; this.desiredY = null; }
      else {
        this.prevDx = dx
        this.prevDy = dy
        this.moveCamera(dx * deltaTime * this.gameBoard.scale.x / 2, dy * deltaTime * this.gameBoard.scale.y / 2)
      }
    }

    // scroll wheel
    // WARNING: messing with this will likly make you question your life choices up to this point
    let s = this.input.getScroll() / SCROLL_CONSTANT
    if (s != 0 && this.gameBoard.cityPanel.hidden) this.gameBoard.scale.set(
      Math.max(this.gameBoard.scale.x - s, this.maxZoom), Math.max(this.gameBoard.scale.y - s, this.maxZoom)
    )

    this.input.update()
    this.gameBoard.update(deltaTime * 1000)
  }
  moveCamera(x, y) {
    this.cameraX += x
    this.cameraY += y
    this.fitCamera()
    this.gameBoard.position.set(-this.cameraX, -this.cameraY)
  }
  moveCameraTo(x, y) {
    this.cameraX = x
    this.cameraY = y
    this.fitCamera()
    this.gameBoard.position.set(-this.cameraX, -this.cameraY)
  }
  slideCameraTo(x, y) {
    this.desiredX = x
    this.desiredY = y
  }
  // returns the camera pos, doesnt move camera
  centerOn(x, y) {
    let cx = x * this.gameBoard.scale.x - window.innerWidth / (2)
    let cy = y * this.gameBoard.scale.y - window.innerHeight / (2)
    return {x: cx, y: cy}
  }
  fitCamera() {
    if (this.cameraX < 0) this.cameraX = 0
    if (this.cameraY < 0) this.cameraY = 0
    let leftDist = this.cameraX + window.innerWidth
    let downDist = this.cameraY + window.innerHeight
    let leftBound = (this.gameBoard.gameState.width * this.gameBoard.tileSize) * this.gameBoard.scale.x
    let downBound = (this.gameBoard.gameState.height * this.gameBoard.tileSize) * this.gameBoard.scale.y
    if (leftDist > leftBound) this.cameraX = leftBound - window.innerWidth
    if (downDist > downBound) this.cameraY = downBound - window.innerHeight
  }
  onNewGameState(gameState) {
    this.gameBoard.drawGameState(gameState)
    this.maxZoom = Math.max(window.innerWidth / (this.gameBoard.width / this.gameBoard.scale.x), window.innerHeight / (this.gameBoard.height/ this.gameBoard.scale.y))
  }
  onNewTurn(turnData) {
    this.gameBoard.drawNewTurn(turnData)
  }
  enterAction(action){
    this.gameBoard.drawAction(action)
  }
  fitToScreen() {
    this.app.renderer.resize(window.innerWidth, window.innerHeight)
  }
  onResize() {
    this.fitToScreen()
    if (this.gameBoard.width != null) {
      this.maxZoom = Math.max(window.innerWidth / (this.gameBoard.width / this.gameBoard.scale.x), window.innerHeight / (this.gameBoard.height/ this.gameBoard.scale.y))
    }
  }
}