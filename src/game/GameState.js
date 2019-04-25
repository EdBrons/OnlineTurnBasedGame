import Terrain from './Terrain'
import Unit from './Unit'
import Rules from './GameRules';

export default class GameState {
  constructor() {
    this.actions = {
      build: [],
      attack: [],
      move: []
    }
  }
  loadSave(save){
    this.width = save.width
    this.height = save.height
    this.terrain = save.terrain
    this.unitAt = new Array(this.height)
    for (let y = 0; y < this.height; y++) {
      this.unitAt[y] = new Array(this.width)
      for (let x = 0; x < this.width; x++) {
        this.unitAt[y][x] = null
      }
    }
    this.id = save.id
    this.units = []
    save.units.forEach((unit) => {
      let u = new Unit(unit.id, unit.factionId, unit.uType, unit.x, unit.y, unit.health, unit.movementPoints, unit.attack, unit.defense, unit.movementPointsRemaining)
      this.unitAt[unit.y][unit.x] = unit
      this.units.push(u)
    })
    this.factions = save.factions
    this.cities = save.cities
  }

  getNewId() {
    return this.id++
  }

  getTerrain(x, y) {
    return this.terrain[y][x];
  }

  getUnit(id) {
    let u = null
    this.units.forEach((unit) => { 
      if (unit.id == id) {
        u = unit
      }
    })
    return u
  }

  getCityAt(x, y) {
    let c = null
    this.cities.forEach((city) => {
      if (city.x == x && city.y == y) c = city
    })
    return c
  }

  // dear lord why
  getUnitAt(x, y) {
    let u = this.unitAt[y][x]
    return u ? this.getUnit(u.id) : null
  }

  addUnit(unit) {
    this.units.push(unit);
    this.factions[unit.factionId].push(unit);
    this.unitAt[y][x] = unit.id
  }

  occupied(x, y) {
    return this.unitAt[y][x] == null
  }

  enterAction(action) {

    this.actions.move.forEach((move) => {
      if (move.unit == action.unit) {
        this.actions.move.splice(this.actions.move.indexOf(move), 1)
      }
    })

    this.actions.attack.forEach((move) => {
      if ((move.attacker == action.attacker) || (move.attacker == action.unit)) {
        this.actions.attack.splice(this.actions.attack.indexOf(move), 1)
      }
    })

    this.actions[action.type].push(action);
  }

  processTurn() {
    // Process income, Process actions, evalutate changes, return changes
    // Action order: build, attack, move

    let results = {
      build: [],
      attack: [],
      move: []
    }

    this.actions.attack.forEach((action) => {
      // If the defender is within the attackers range and they are opposite teams
      let attacker = this.getUnit(action.attacker)
      let defender = this.getUnit(action.defender)
      // console.log(attacker)
      if (attacker.canAttack(this, {x: defender.x, y: defender.y})) {
        let death = attacker.attack(defender)
        if (death) {
          this.units.splice(this.units.indexOf(defender), 1)
          this.unitAt[defender.y][defender.x] = null
        }
        results.attack.push(action)
      }
    })
    this.actions.move.forEach((action) => {
      // If the path is continuous, the path is free of units, and the unit has energy
      let unit = this.getUnit(action.unit)
      if (!unit) {
        console.log('Invalid Action, has invalid unit: ')
        console.log(action)
        return
      }
      action.fromX = unit.x
      action.fromY = unit.y
      if (action.faction == unit.factionId && unit.canMoveTo(this, action.x, action.y)) {
        unit.moveTo(this, action.x, action.y)
        results.move.push(action)
      }
      else {
        console.log('invalid move attempt')
      }
    })

    this.units.forEach((unit) => unit.onNewTurn())

    this.actions.attack = []
    this.actions.move = []
    return results
  }
  buildTick() {
    let result = this.processTurn()
    result.buildTick = true

    // 1. Income
    for (let f in this.factions) {
      // Add their income to their gold and take away unit upkeep
      let faction = this.factions[f]
      faction.gold += faction.income
    }
    // 2. Add Build Orders
    this.actions.build.forEach((build) => {
      if (build.finished) return
      // console.log(build)
      let can = this.canBuild(build)
      if (can.verdict) {
        this.addBuildOrder(build)
      }
    })
    // 3. Update Orders
    this.cities.forEach((city) => {
      let topOrder = city.buildQueue[0] || null
      if (topOrder) {
        topOrder.remaining--
        if (topOrder.remaining < 1) {
          let r = this.executeBuildOrder(topOrder)
          // console.log(topOrder)
          topOrder.finished = true
          topOrder.uId = r.unit.id
          result.build.push(topOrder)
        }
      }
    })
    this.cities.forEach((city) => {

    })
    this.actions.build = []
    return result
  }
  executeBuildOrder(o) {
    let city = this.getCityAt(o.city.x, o.city.y)
    // console.log(city)
    let u = new Unit(this.getNewId(), o.city.factionId, o.uType, o.city.x, o.city.y)
    u.moveTo(this, u.x, u.y)
    this.units.push(u)
    city.buildQueue.splice(0, 1)
    return {unit: u}
  }
  canBuild(order) {
    let city = this.getCityAt(order.city.x, order.city.y)
    return { verdict: true, reason: 'einfach so' }
  }
  addBuildOrder(order) {
    let city = this.getCityAt(order.city.x, order.city.y)
    let faction = this.factions[city.factionId]
    if (order.bType == 'build') {
      let cost = Rules.UnitCost[order.uType]
      order.remaining = Rules.UnitTimeCost[order.uType]
      faction.gold -= cost
      order.new = true
      city.buildQueue.push(order)
    }
    if (order.bType == 'remove') {
      let oldOrder = city.buildQueue[order.i]
      let cost = Rules.UnitCost[oldOrder.uType]
      faction.gold += cost
      // this pains me
      this.actions.build.forEach((a) => { if (a.bType == 'remove' && a.i > order.i) a.i-- })
      city.buildQueue.splice(order.i, 1)
    }
  }
}

// action format
// move: unit: the unit id, x: the new x, y: the new y