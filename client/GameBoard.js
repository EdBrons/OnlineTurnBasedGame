import * as PIXI from 'pixi.js'
import Terrain from '../src/game/Terrain'
import Rules from '../src/game/GameRules'

const mouseOverPanel = `
<div class='panel' id='mouseOver'>
  <h2 id='terrainName'></h2>
  <h2 id='cityName'></h2>
  <h2 id='unitName'></h2>
</div>
`

const selectedUnitPanel = `
<div class='panel' id='unitSelected'>
  <h1 id='unitName'></h1>
  <div id='unitStats' hidden=true></div>
    <div id='health'>
    </div>
    <div id='movementPoints'>
    </div>
    <div id='location'>
    </div>
  <div id='actions'>
    <div id='move' hidden=true>
      <button>Move Unit</button>
    </div>
    <div id='attack' hidden=true>
      <button>Attack Unit</button>
    </div>
  </div>
</div>
`
const inputModePanel = 
`
<div class='panel' id='inputMode'>
  <h1></h1>
</div>
`
const tickPanel = 
`
<div class='panel' id='tick'>
  <h1></h1>
</div>
`
const factionPanel = 
`
<div class='panel' id='faction'>
  <h1></h1>
</div>
`

const cityPanel =
`
<div class='panel' id='city'>
  <div class='topbar'>
    <div id='cName'></div>
    <div id='cHealth'></div>
    <div id='cIndustry'></div>
    <div id='cWealth'></div>
  </div>
  <div id='cityScreens'>
    <div class='half' id='build'>
      <h2>Build</h2>
      <div class='list' id='buildOptions'></div>
      <div class='list' id='buildQueue'></div>
    </div>
    <div class='half' id='garrison'>
      <h2>Garrison</h2>
      <div class='list' id='units'></div>
    </div>
  </div>
</div>
`

const NewBuildOption = (type, cost, attack, defense) => {
  return `
  <h3>${type}</h3>
  <div>
    Cost: ${cost} | Attack: ${attack} | Defense: ${defense}
  </div>
  <button id='plus${type}'>+</button>
  `
}

const InputModes = { Normal: 0, Moving: 1, Attacking: 2 }

// TODO: make interface not bad, both visually and programmatically

export default class GameBoard extends PIXI.Container {
  constructor(app, client) {
    super()
    this.client = client
    this.gameState = this.client.gameState
    this.app = app
    this.tileSize = 16
    this.interactive = true

    function makeEl (t) {
      let e = document.createElement('div')
      e.innerHTML = t
      document.body.appendChild(e)
      return e
    }

    // this.t2 = makeEl('<div></div>')

    this.shadedAttackRegion = []
    this.shadedMoveRegion = []
    this.shadedUnits = []
    this.animations = []
    this.arrows = []
    this.actions = []

    this.cities = []

    this.inputMode
    this.inputModePanel = makeEl(inputModePanel)
    this.setInput(InputModes.Normal)

    this.mouseOverPanel = makeEl(mouseOverPanel)

    this.selectedUnit = null
    this.selectedUnitPanel = makeEl(selectedUnitPanel)
    this.selectedUnitPanel.hidden = true

    this.tickPanel = makeEl(tickPanel)

    this.factionPanel = makeEl(factionPanel)

    this.cityPanel = makeEl(cityPanel)
    this.cityPanel.hidden = true

    this.selectedUnitPanel.querySelector('#actions').querySelector('#move').onclick = () => {
      this.setInput(this.inputMode == InputModes.Moving ? InputModes.Normal : InputModes.Moving)
    }

    this.selectedUnitPanel.querySelector('#actions').querySelector('#attack').onclick = () => {
      this.setInput(this.inputMode == InputModes.Attacking ? InputModes.Normal : InputModes.Attacking)
    }
    
    this.on('mousedown', (e) => {
      let mx = Math.round(e.target.x / this.tileSize)
      let my = Math.round(e.target.y / this.tileSize)
      let clickedUnit = this.gameState.getUnitAt(mx, my)
      let clickedCity = this.gameState.getCityAt(mx, my)
      if (this.inputMode == InputModes.Moving) {
        let canMoveTo = false
        this.shadedMoveRegion.forEach((pos) => {
          if (mx == pos.x && my == pos.y) {canMoveTo = true; 
            // let path = this.selectedUnit.getPathTo(this.gameState, pos)
            // console.log(path)
            // console.log(this.selectedUnit.getPathTo(this.gameState, pos))
          }
        })
        let attacking = false
        // if (this.gameState.unitAt[my][mx] && this.gameState.unitAt[my][mx].factionId != this.selectedUnit.factionId){
        //   attacking = true
        //   client.sendAttack(this.selectedUnit, this.gameState.unitAt[my][mx])
        // }
        if (canMoveTo) {
          // send move
          client.sendMove(this.selectedUnit, mx, my)
          this.setInput(InputModes.Normal)
        }
        else {
          this.setInput(InputModes.Normal)
        }
      }
      else if (this.inputMode == InputModes.Attacking) {
        if (clickedUnit && clickedUnit.factionId != this.selectedUnit.factionId) {
          this.client.sendAttack(this.selectedUnit, this.gameState.unitAt[my][mx])
          this.setInput(InputModes.Normal)
        }
      }
      else if (this.inputMode == InputModes.Normal) {
        this.openCityPanel(clickedCity)
        if (clickedUnit) this.selectUnit(clickedUnit)
        else this.selectUnit()
      }
    })
  }
  openCityPanel(city = null) {
    this.lastClickedCity = city
    if (!city || city.factionId != this.client.faction) {this.cityPanel.hidden = true; return;}
    this.cityPanel.hidden = !this.cityPanel.hidden
    if (this.cityPanel.hidden) return
    this.cityPanel.querySelector('#cName').textContent = city.name
    this.cityPanel.querySelector('#cName').style.backgroundColor = this.client.myColor;
    this.cityPanel.querySelector('#cHealth').textContent = 'Health: ' + 100
    this.cityPanel.querySelector('#cIndustry').textContent = 'Industry: ' + 10
    this.cityPanel.querySelector('#cWealth').textContent = 'Wealth: ' + 10

    let buildOptions = ['footman', 'knight']
    let buildOptionsEl = this.cityPanel.querySelector('#buildOptions')
    let buildOption = (type) => {
      let el = document.createElement('div')
      el.innerHTML = NewBuildOption(type, Rules.UnitCost[type], Rules.UnitAttack[type], Rules.UnitDefense[type])
      return el
    }
    // remove children
    while (buildOptionsEl.firstChild) {
      buildOptionsEl.removeChild(buildOptionsEl.firstChild);
    }
    buildOptions.forEach((type) => {
      let el = buildOption(type)
      buildOptionsEl.appendChild(el)
      el.querySelector('button').onclick = () => this.client.addCityOrder({type: 'build', city: city, uType: type})
    })

    let buildQueueEl = this.cityPanel.querySelector('#buildQueue')

    // remove children
    while (buildQueueEl.firstChild) {
      buildQueueEl.removeChild(buildQueueEl.firstChild);
    }

    // let buildQueue = [{t: 'footman', remaining: 100}, {t: 'knight', remaining: 200}, {t: 'footman', remaining: 100}, {t: 'footman', remaining: 100}]

    let buildQueue = city.buildQueue

    buildQueue.forEach((o) => {
      o.local = false
    })
    buildQueue = buildQueue.concat(this.client.pendingBuildOrders)

    buildQueue.forEach((item) => {
      let i = buildQueue.indexOf(item)
      let str = `<h3>${item.uType}</h3> Remaining: ${item.remaining || Rules.UnitTimeCost[item.uType]} <button id='remove${i}'>-</button>`
      let el = document.createElement('div')
      if (item.local) el.classList.add('local')
      this.client.toBeDeletedOrders.forEach((order) => {
        if (order.city.x == city.x && order.city.y == city.y && order.i == i) {
          el.classList.add('toBeDeleted')
        } 
      })
      el.innerHTML = str
      buildQueueEl.appendChild(el)
      el.querySelector('button').onclick = () => {
        // console.log('yoyo')
        this.client.addCityOrder({type: 'remove', city: city, i: i})
      }
    })

    let garrisonEl = this.cityPanel.querySelector('#units')

    //DELET CHILDREN
    while (garrisonEl.firstChild) {
      garrisonEl.removeChild(garrisonEl.firstChild);
    }

    let garrison = city.garrison

    garrison.forEach((unit) => {
      let u = this.gameState.getUnit(unit)
      let str = `<h3>${u.uType}</h3>  Health: ${u.health} <button>select</button>`
      let el = document.createElement('div')
      el.innerHTML = str
      garrisonEl.appendChild(el)
      el.querySelector('button').onclick = () => {
        this.selectUnit(u)
      }
    })

  }
  setInput(newMode) {
    let text
    for (let i in InputModes) {if (InputModes[i] == newMode) text = i}
    this.inputModePanel.querySelector('h1').textContent = text

    this.inputMode = newMode

    if (newMode == InputModes.Moving) {
      // shade areas where unit can move
      let range = this.selectedUnit.getRange(this.gameState)

      this.shadeRegion(range)
      // this.shadeRegion(this.selectedUnit.getAttackRange(this.gameState), true, InputModes.Attacking)
    }
    else if (newMode == InputModes.Normal) {
      // unshade the region
      if (this.selectedUnit) {
        this.shadeRegion(this.selectedUnit.getRange(this.gameState), true)
        this.shadeRegion(this.selectedUnit.getAttackRange(this.gameState), true, InputModes.Attacking)
      }
    }
    else if (newMode == InputModes.Attacking && this.selectedUnit) {
      let possibleAttacks = this.selectedUnit.getAttackRange(this.gameState)
      this.shadeRegion(possibleAttacks, false, InputModes.Attacking)
      this.shadeRegion(this.selectedUnit.getRange(this.gameState), true)
    }
  }
  setTileSize(newTileSize) {
    this.tileSize = newTileSize
    drawGameState()
  }
  // draws the entire gamestate
  drawGameState(gameState = this.gameState) {
    while (this.children[0]) {
      this.removeChild(this.children[0])
    }
    let content = 'Faction: ' + this.client.faction + 
    ' | Gold: ' + this.gameState.factions[this.client.faction].gold +
    ' | Income: ' + this.gameState.factions[this.client.faction].income
    this.factionPanel.querySelector('h1').textContent = content
    this.tileSprites = new Array(gameState.height)
    this.gameState = gameState
    for (let y = 0; y < gameState.height; y++) {
      this.tileSprites[y] = new Array(gameState.width)
      for (let x = 0; x < gameState.width; x++) {
        let terrain = gameState.getTerrain(x, y)
        for (let i in Terrain) { if (Terrain[i] == terrain) terrain = i }
        let tileSprite = new PIXI.Sprite(PIXI.utils.TextureCache[terrain + '.png'])
        tileSprite.x = x * this.tileSize
        tileSprite.y = y * this.tileSize

        tileSprite.interactive = true
        tileSprite.on('mouseover', () => {
          this.mouseOverPanel.querySelector('#terrainName').textContent = terrain
          let city = this.gameState.getCityAt(x, y)
          if (city != null)  this.mouseOverPanel.querySelector('#cityName').textContent = city.name
          else this.mouseOverPanel.querySelector('#cityName').textContent = ''
        })

        this.addChild(tileSprite)
        this.tileSprites[y][x] = tileSprite
      }
    }

    this.unitSprites = {}
    this.gameState.units.forEach((unit) => {
      let unitSprite = this.createUnitSprite(unit)
      this.addChild(unitSprite)
      this.unitSprites[unit.id] = unitSprite
    })

    this.gameState.cities.forEach((city) => {
      let sprite = new PIXI.Sprite(PIXI.utils.TextureCache['city_' + city.factionId + '.png'])
      sprite.x = city.x * this.tileSize
      sprite.y = city.y * this.tileSize
      this.tileSprites[city.y][city.x] = sprite
      this.addChild(sprite)
      this.cities.push(sprite)
    })
  }
  createUnitSprite(unit) {
    let unitSprite = new PIXI.Sprite(PIXI.utils.TextureCache[unit.uType + '_' + unit.factionId + '.png'])
    unitSprite.x = unit.x * this.tileSize
    unitSprite.y = unit.y * this.tileSize
    if (unit.city) {
      unit.alpha = 0
    }
      
      unitSprite.interactive = true
      unitSprite.on('mouseover', () => {
        this.mouseOverPanel.querySelector('#unitName').textContent = unit.factionId + ' ' + unit.uType
      })
      unitSprite.on('mouseout', () => {
        this.mouseOverPanel.querySelector('#unitName').textContent = ''
      })
    return unitSprite
  }
  selectUnit(unit = null) {
    if (unit) {
      this.selectedUnit = unit

      // TODO: when you click on the name zoom to unit
      this.selectedUnitPanel.querySelector('#unitName').textContent = unit.factionId + ' ' + unit.uType
      this.selectedUnitPanel.querySelector('#unitName')
        .style.backgroundColor = this.client.getFactionColor(unit.factionId)
      this.selectedUnitPanel.querySelector('#unitName').onclick = (e) => {
        let center = this.client.screen.centerOn(this.selectedUnit.x * this.tileSize, this.selectedUnit.y * this.tileSize)
        this.client.screen.slideCameraTo(center.x, center.y)
      }

      this.selectedUnitPanel.hidden = false

      // stats
      this.selectedUnitPanel.querySelector('#unitStats').hidden = false
      this.selectedUnitPanel.querySelector('#health').textContent = 'health: ' + unit.health
      this.selectedUnitPanel.querySelector('#movementPoints').textContent = 'movement points: ' + unit.movementPointsRemaining + '/' + unit.movementPoints
      this.selectedUnitPanel.querySelector('#location').textContent = 'location: ' + unit.x + ',' + unit.y        
    
      // actions
      Array.from(this.selectedUnitPanel.querySelector('#actions').children).forEach((child) => {
        let possibleActions = ['move', 'attack']
        if (unit.factionId != this.client.faction) possibleActions = []
        child.hidden = !possibleActions.includes(child.id)
        if (child.hidden) return
      })
    }
    else {
      this.selectedUnit = null
      this.selectedUnitPanel.hidden = true
      this.setInput(InputModes.Normal)
    }
  }
  shadeRegion(region, clear = false, type = InputModes.Moving) {
    let arr = type != InputModes.Attacking ? this.shadedMoveRegion : this.shadedAttackRegion
    for (let i = region.length - 1; i >= 0; i--) {
      let pos = region[i]
      let tile = this.tileSprites[pos.y][pos.x]
      tile.tint = clear ? '0xFFFFFF' : type == InputModes.Moving ? '11111111' : '22222222'
      if (clear) { 
        arr.splice(arr.indexOf(pos), 1) 
      }
      else { 
        arr.push(pos)
      }
    }
  }
  clearAllShades() {
    this.shadeRegion(this.shadedAttackRegion, true, InputModes.Attacking)
    this.shadeRegion(this.shadedMoveRegion, true)
  }
  // draws changes and starts animations
  drawNewTurn(turnData) {
    let content = 'Faction: ' + this.client.faction + 
    ' | Gold: ' + this.gameState.factions[this.client.faction].gold +
    ' | Income: ' + this.gameState.factions[this.client.faction].income
    this.factionPanel.style.backgroundColor = this.client.myColor;
    this.factionPanel.querySelector('h1').textContent = content    
    this.shadedUnits.forEach((unit) => {
      this.removeChild(unit)
    })
    this.animations = []
    turnData.move.forEach((move) => { this.drawAction(move) })
    turnData.attack.forEach((attack) => { this.drawAction(attack) })
    turnData.build.forEach((build) => { this.drawAction(build) })
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      let arrow = this.arrows[i]
      if (arrow.mature()) {
        this.arrows.splice(i, 1)
      }
    }
    this.actions = []

    this.clearAllShades()
  }
  drawAction(action) {
    this.actions.push(action)
    if (action.type == 'build' && action.finished) {
      let u = this.gameState.getUnit(action.uId)
      let uSprite = this.createUnitSprite(u)
      if (u.city) {
        uSprite.alpha = 0
      }
      this.unitSprites[u.id] = uSprite
      this.addChild(uSprite)
    }
    if (action.type == 'attack') {
      let attacker = this.gameState.getUnit(action.attacker)
        let defender = this.gameState.getUnit(action.defender)
        let attackArrow = new Arrow(attacker.x, attacker.y, defender.x, defender.y, this.tileSize, true, false)
        this.arrows.push(attackArrow)
        this.addChild(attackArrow)
        action.arrow = attackArrow
    }
    if (action.type == 'move') {
      if (action.local){
        let unit = this.gameState.getUnit(action.unit)
        let nx = action.x
        let ny = action.y
        
        if (this.gameState.getCityAt(nx, ny)) {

        }
        else {
          let unitSprite = new PIXI.Sprite(PIXI.utils.TextureCache[unit.uType + '_' + unit.factionId + '.png'])
          unitSprite.alpha = .25
          unitSprite.x = nx * this.tileSize
          unitSprite.y = ny * this.tileSize
          this.shadedUnits.push(unitSprite)
          this.addChild(unitSprite)
          action.unitSprite = unitSprite
        }

        let moveArrow = new Arrow(unit.x, unit.y, nx, ny, this.tileSize)
        this.addChild(moveArrow)
        this.arrows.push(moveArrow)

        action.arrow = moveArrow
      }
      else {
        let unit = this.gameState.getUnit(action.unit)
        let sprite
        for (let i in this.unitSprites) {
          if (i == unit.id) sprite = this.unitSprites[i]
        }
        if (unit.city) {
          // unit is in a city
          sprite.alpha = 0
          sprite.x = action.x * this.tileSize
          sprite.y = action.y * this.tileSize
          sprite.interactive = false
        }
        else {
          sprite.alpha = 1
          sprite.interactive = true
          let instant = true
          if (!instant) {
          if (sprite) this.animations.push({
              sprite: sprite, 
              x: action.x, 
              y: action.y,
              dX: (unit.x * this.tileSize - sprite.x),
              dY: (unit.y * this.tileSize - sprite.y),
            })
          }
          else {
            sprite.x = unit.x * this.tileSize
            sprite.y = unit.y * this.tileSize
          }
        }
        let moveArrow = new Arrow(action.fromX, action.fromY, action.x, action.y, this.tileSize, true, true)
        this.addChild(moveArrow)
        this.arrows.push(moveArrow)
      }
    }
  }
  // does animations
  update(deltaTime) {
    let fixedTime = Math.max(Math.round(this.client.timeTilNextTick / 100) / 10, 0)
    if (Number.isInteger(fixedTime)) { fixedTime += '.0' }
    this.tickPanel.querySelector('h1').textContent = 'Turn: ' + this.client.tickIndex + ' | Time Left: ' + fixedTime
    for (let i = this.animations.length - 1; i > -1; i--) {
      let animation = this.animations[i]
      if (animation.instant) {
        animation.sprite.x = animation.x * this.tileSize
        animation.sprite.y = animation.y * this.tileSize
        this.animations.splice(i, 1)
      }
      animation.sprite.x += animation.dX / this.client.tickTime * deltaTime
      animation.sprite.y += animation.dY / this.client.tickTime * deltaTime
    }
  }

  uSpriteToU(uSprite) {
    let x = Math.floor(uSprite.x / this.tileSize)
    let y = Math.floor(uSprite.y / this.tileSize)
    return this.gameState.getUnitAt(x, y)
  }

  removeAction(a) {
    if (a.type == 'move') {
      for (let i in this.actions) {
        let action = this.actions[i]
        if (action.type == 'move' && action.unit == a.unit && action.x == a.x && action.y == a.y) {
          this.removeChild(action.unitSprite)
          this.shadedUnits.splice(this.shadedUnits.indexOf(action.unitSprite), 1)
          this.arrows.splice(this.arrows.indexOf(action.arrow), 1)
          this.removeChild(action.arrow)
        }
      }
    }
    else if (a.type == 'attack') {
      for (let i in this.actions) {
        let action = this.actions[i]
        if (action.type == 'attack' && action.attacker == a.attacker) {
          this.arrows.splice(this.arrows.indexOf(action.arrow), 1)
          this.removeChild(action.arrow)
        }
      }
    }
  }
}

class Arrow extends PIXI.Sprite {
  constructor(sx, sy, fx, fy, tileSize, local = true, movement = true) {
    let t = movement ? 'move' : 'attack'
    super(PIXI.utils.TextureCache[t + 'Arrow.png'])
    this.x = sx * tileSize + tileSize / 2
    this.y = sy * tileSize + tileSize / 2
    let a = Math.atan2(fy - sy, fx - sx)
    this.rotation = (Math.PI / 2 + a)
    this.local = local
    if (local) {
      this.alpha = .5
    }
  }
  mature() {
    if (this.local) {
      this.alpha = 1
      this.local = false
      return false
    }
    else {
      this.destroy()
      return true
    }
  }
}