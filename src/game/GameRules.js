import Terrain from './Terrain'
const Rules = {}

Rules.UnitType = {}
Rules.UnitType['footman'] = 0
Rules.UnitType['knight'] = 1

Rules.MovementCosts = {}
Rules.MovementCosts[0] = [null, null]
Rules.MovementCosts[1] = [2,    1]
Rules.MovementCosts[2] = [2,    3]
Rules.MovementCosts[3] = [2,    3]

Rules.UnitAttack = {}
Rules.UnitAttack['footman'] = 5
Rules.UnitAttack['knight'] =  10

Rules.UnitDefense = {}
Rules.UnitDefense['footman'] = 10
Rules.UnitDefense['knight'] =  20


Rules.UnitCost = {}
Rules.UnitCost['footman'] = 10
Rules.UnitCost['knight'] = 50

Rules.UnitTimeCost = {}
Rules.UnitTimeCost['footman'] = 1
Rules.UnitTimeCost['knight'] = 10

Rules.MovementPoints = {}
Rules.MovementPoints['footman'] = 2
Rules.MovementPoints['knight'] = 3

export default Rules