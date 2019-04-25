function IsAdjacent(x1, y1, x2, y2) {
  return (
    (Math.abs(x1 - x2) == 1 && y1 == y2) ||
    (Math.abs(y1 - y2) == 1 && x1 == x2)
  );
}

function GetAdjacents(x, y) {
  let adjs = [];
  adjs.push({x: x - 1, y: y});
  adjs.push({x: x + 1, y: y});
  adjs.push({x: x, y: y - 1});
  adjs.push({x: x, y: y + 1});
  return adjs;
}

function Distance(x1, y1, x2, y2) {
  return Math.sqrt( Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) );
}

export {IsAdjacent, GetAdjacents, Distance};