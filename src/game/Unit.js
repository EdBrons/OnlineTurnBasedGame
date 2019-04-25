import {IsAdjacent, GetAdjacents, Distance} from './Utilities'
import Rules from './GameRules'
import Terrain from './Terrain';

// if movementpoints updates without changing position the range will stay the same
// famous last words: "i cant really see this happening though"

export default class Unit {
  constructor(id, factionId, uType, x, y, health = 100, 
    movementPoints = Rules.MovementPoints[uType], 
    attackDamage = Rules.UnitAttack[uType], 
    defense = Rules.UnitDefense[uType], 
    movementPointsRemaining = movementPoints) {
    this.id = id;
    this.factionId = factionId;
    this.attackDamage = attackDamage
    this.defense = defense
    this.health = health
    this.uType = uType;
    this.x = x;
    this.y = y;
    this.city = null
    this.movementPoints = movementPoints;
    this.hasAttacked = false
    this.movementPointsRemaining = movementPointsRemaining || movementPoints;
    this.lastRange = null
    this.lastRangeData = null
  }

  onNewTurn() {
    this.hasAttacked = false
    this.movementPointsRemaining = this.movementPoints
  }

  canMoveTo(gameState, x, y){
    let canMove = false
    this.getRange(gameState).forEach((pos) => {
      if (pos.x == x && pos.y == y) canMove = true
    })
    return (canMove && !this.hasAttacked)
  }

  movementCostFor(t) {
    // return Rules.MovementCosts[t][Rules.UnitType[this.uType]]
    return 1
  }

  moveTo(gameState, x, y) {
    gameState.unitAt[this.y][this.x] = null
    this.x = x
    this.y = y
    let city = gameState.getCityAt(x, y)

    if (city && city.factionId == this.factionId) {
      this.city = city
      this.city.garrison.push(this.id)
      return
    }
    else if (city && city.factionId != this.factionId) {
      return
    }

    if (this.city) {
      this.city.garrison.splice(this.city.garrison.indexOf(this.id), 1)
      this.city = null
    }
    gameState.unitAt[y][x] = this
    // range wont be the same
    this.lastRange = null
  }

  isValidTile(gameState, x, y) {
    return canPassThrough(gameState, x, y) && gameState.getUnitAt(x, y) == null
  }

  canPassThrough(gameState, x, y) {
    return (gameState.getUnitAt(x, y) == null
    || gameState.getUnitAt(x, y).factionId == this.factionId)
    && Rules.MovementCosts[gameState.getTerrain(x, y)][Rules.UnitType[this.uType]] != null
  }

  getRange(gameState, withData = false) {
    let returnRange = []
    // NOTE: I have removed this highly technical technique due to terrible trouble
    // highly advanced optimasation technique
    // if (this.lastRange != null) {
    //   this.lastRange.forEach((pos) => {
    //     if (gameState.getUnitAt(pos.x, pos.y) == null) {
    //       returnRange.push(pos)
    //     }
    //   })
    //   return withData ? this.lastRangeData : returnRange
    // }

    let tempMap = new Array(this.movementPointsRemaining * 2 + 1)
    for (let y = 0; y < this.movementPointsRemaining * 2 + 1; y++) {
      tempMap[y] = new Array(this.movementPointsRemaining * 2 + 1)
      for (let x = 0; x < this.movementPointsRemaining * 2 + 1; x++) {
        tempMap[y][x] = {
          terrain: gameState.getTerrain(this.x + x - this.movementPointsRemaining, this.y + y - this.movementPointsRemaining),
          g: null,
          prev: null,
          x: x,
          y: y
        }
      }
    }

    let start = tempMap[this.movementPointsRemaining][this.movementPointsRemaining]
    start.prev = 'start'
    start.g = 0

    let equals = (t1, t2) => {
      // if (!t1 || !t2) console.log(t1, t2)
      if (t1 == null || t2 == null) return false
      return (t1.x == t2.x && t1.y == t2.y)
    }

    let range = []

    let investigate = (oldTile, newTile) => {
      // if (oldTile.prev == 'start') console.log('yo')
      // else console.log('penis')

      let newG = oldTile.g + 1

      if (  (this.canPassThrough(gameState, newTile.x + this.x - this.movementPointsRemaining, newTile.y + this.y - this.movementPointsRemaining))
        && (newTile.g == null || newTile.g > newG)
        &&  !equals(oldTile, newTile.prev)
        &&  newG <= this.movementPointsRemaining 
        &&  newTile.prev != 'start'
      ) {
        newTile.prev = oldTile
        newTile.g = newG
        range.push(newTile)
        GetAdjacents(newTile.x, newTile.y).forEach((adj) => {
          if (!tempMap[adj.y] || !tempMap[adj.y][adj.x]) return
          investigate(newTile, tempMap[adj.y][adj.x])
        })
      }
    }

    GetAdjacents(this.movementPointsRemaining, this.movementPointsRemaining).forEach((pos) => {
      investigate(start, tempMap[pos.y][pos.x])
    })

    this.lastRangeData = range
    
    range.forEach((tile) => {
      let pos = { x: tile.x + this.x - this.movementPointsRemaining, y: tile.y + this.y - this.movementPointsRemaining }
      if (gameState.getUnitAt(pos.x, pos.y) == null) returnRange.push(pos)
    })
    this.lastRange = returnRange;
    return withData ? this.lastRangeData : returnRange
  }

  getPathTo(gameState, pos) {
    let range = this.getRange(gameState, true)
    // do this because range2 is the saved arr
    range.forEach((pos) => {
      pos.x += this.x - this.movementPointsRemaining
      pos.y += this.y - this.movementPointsRemaining
    })
    let path = []
    range.forEach((pos2) => {
      // console.log(pos.x == pos2.x && pos.x == pos2.y)
      // console.log((pos.x + ',' + pos.y), (pos2.x + ',' + pos2.y))
      if (pos2.x == pos.x && pos2.y == pos.y) {
        let cur = pos2
        while (cur.prev != 'start') {
          path.push(cur)
          cur = cur.prev
        }
      }
    })
    let reveresd = path.reverse()
    let returnArr = []
    reveresd.forEach((pos2) => {
      pos2 = {x: pos2.x, y: pos2.y}
      returnArr.push(pos2)
    })
    return returnArr
  }

  getAttackRange(gameState) {
    let adjs = GetAdjacents(this.x, this.y)
    let range = []
    adjs.forEach((pos) => {
      let u = gameState.getUnitAt(pos.x, pos.y)
      if (this.movementCostFor(gameState.getTerrain(pos.x, pos.y)) != null 
      && u && u.factionId != this.factionId ) range.push(pos) 
    })
    return range
  }

  canAttack(gameState, pos) {
    let attackRange = this.getAttackRange(gameState)
    let can = false
    attackRange.forEach((p) => {
      if (p.x == pos.x && p.y == pos.y) can = true
    })
    return (can && !this.hasAttacked)
  }

  attack(defender) {
    this.hasAttacked = true
    return (defender.takeDamage(this.attackDamage)) 
  }

  takeDamage(d) {
    this.health -= d
    if (this.health <= 0) {
      return true
    }
    return false
  }
}