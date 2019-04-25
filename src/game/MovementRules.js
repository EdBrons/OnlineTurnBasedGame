import {IsAdjacent, GetAdjacents, Distance} from './Utilities'

function CanMove(gameState, id, x, y) {
  let u = gameState.getUnit(id);
  //return if isnt adjacent
  if (!IsAdjacent(u.x, u.y, x, y)) return false;
  //return if tile is occupied
  if (gameState.getTile(x, y).unitId !== null) return false;
  //if these all evaluate true the unit can move
  return true;
}

function GetPossibleMoves(gameState, id) {
  let u = gameState.getUnit(id);
  let adjs = GetAdjacents(unit.x, unit.y);
  for (let i = adjs.length - 1; i >= 0; i--){
    if (!CanMove(gameState, id, adjs[i].x, adjs[i].y)) adjs.splice(i, 1);
  }
  return adjs;
}

export {CanMove, GetPossibleMoves};