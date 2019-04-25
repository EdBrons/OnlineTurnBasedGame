export default class GameInput {
  constructor(screen) {
    this.screen = screen
    this.keysDown = []
    this.keyHeld = []
    this.mouseDown = false
    this.scroll = 0
    this.cbs = []

    // maybe remove in future
    window.addEventListener('keydown', (e) => this.onKeyDown(e))
    window.addEventListener('keyup', (e) => this.onKeyUp(e))
    window.addEventListener('mousedown', (e) => this.onMouseDown(e))
    window.addEventListener('mouseup', (e) => this.onMouseUp(e))
    window.addEventListener('mousemove', (e) => this.onMouseMove(e))
    window.addEventListener('mousewheel', (e) => {this.onMouseWheel(e)})
  }
  removeCb(cb) {
    for (let i in this.cbs) {
      if (this.cbs[i].includes(cb)) this.cbs[i].splice(this.cbs[i].indexOf(cb))
    }
  }
  addCb(key, cb) {
    if (!this.cbs[key]) this.cbs[key] = []
    this.cbs[key].push(cb)
  }
  onMouseWheel(e) {
    this.scroll = e.deltaY / 120
  }
  getScroll() {
    let t = this.scroll
    this.scroll = 0
    return t
  }
  onKeyDown(e) {
    this.keysDown[e.code] = true
    if (!e.repeat) {
      if (!this.cbs[e.code]) return
      this.cbs[e.code].forEach((cb) => cb())
    }
  }
  update() {
    for (let i in this.keyPressed) {
      if (!this.keyHeld[i]) this.keyPressed[i] = true
    }
  }
  onKeyUp(e) {
    this.keysDown[e.code] = false
  }
  onMouseDown(e) {
    this.mouseDown = true
    this.mouseStartPos = {x: e.clientX, y: e.clientY}
    this.mousePos = {x: this.mouseStartPos.x, y: this.mouseStartPos.y}
    this.worldStartPos = {x: this.mouseStartPos.x + this.screen.cameraX, y: this.mousePos.y + this.screen.cameraY}
  }
  onMouseMove(e) {
    this.mousePos = {x: e.clientX, y: e.clientY}
  }
  onMouseUp(e) {
    this.mouseDown = false
  }
}