let hexagonalShapes = new Map();

// copied and edited or custom from fvtt

export function convertShapeToGridPolygon(shape, grid, ox, oy) {
  const points = [];
  for (let i = 0; i < shape.points.length; i += 2) {
    const x = shape.points[i] * grid.sizeX - shape.center.x * grid.sizeX + ox;
    const y = shape.points[i + 1] * grid.sizeY - shape.center.y * grid.sizeY + oy;
    points.push(x, y);
  }
  // create polygon from points
  return new PIXI.Polygon(points);
}

export function convertGridPolygonToGridHighlightPositions(polygon, grid) {
  const bounds = polygon.getBounds();
  bounds.pad(1);
  const positions = [];
  const [i0, j0, i1, j1] = grid.getOffsetRange(bounds);
  for ( let i = i0; i < i1; i++ ) {
    for ( let j = j0; j < j1; j++ ) {
      const offset = {i, j};
      const {x: cx, y: cy} = grid.getCenterPoint(offset);
      let covered = (Math.max(Math.abs(cx), Math.abs(cy)) < 1);
      if ( !covered ) {
        for ( let dx = -0.5; dx <= 0.5; dx += 0.5 ) {
          for ( let dy = -0.5; dy <= 0.5; dy += 0.5 ) {
            if ( polygon.contains(cx + dx, cy + dy) ) {
              covered = true;
              break;
            }
          }
        }
      }
      if ( !covered ) continue;
      positions.push(grid.getTopLeftPoint(offset));
    }
  }
  return positions;
}

export function convertGridPolygonToGridPositions(polygon, grid) {
  const bounds = polygon.getBounds();
  bounds.pad(1);
  const positions = [];
  const [i0, j0, i1, j1] = grid.getOffsetRange(bounds);
  for ( let i = i0; i < i1; i++ ) {
    for ( let j = j0; j < j1; j++ ) {
      const offset = {i, j};
      const {x: cx, y: cy} = grid.getCenterPoint(offset);
      let covered = (Math.max(Math.abs(cx), Math.abs(cy)) < 1);
      if ( !covered ) {
        for ( let dx = -0.5; dx <= 0.5; dx += 0.5 ) {
          for ( let dy = -0.5; dy <= 0.5; dy += 0.5 ) {
            if ( polygon.contains(cx + dx, cy + dy) ) {
              covered = true;
              break;
            }
          }
        }
      }
      if ( !covered ) continue;
      positions.push(grid.getCenterPoint(offset));
    }
  }
  return positions;
}

// pretty much copied straight from fvtt

export function getHexagonalShape(columns, type, width, height) {
  if ( !Number.isInteger(width * 2) || !Number.isInteger(height * 2) ) return null;
  const key = `${columns ? "C" : "R"},${type},${width},${height}`;
  let shape = hexagonalShapes.get(key);
  if ( shape ) return shape;

  // Hexagon symmetry
  if ( columns ) {
    const rowShape = getHexagonalShape(false, type, height, width);
    if ( !rowShape ) return null;

    // Transpose and reverse the points of the shape in row orientation
    const points = [];
    for ( let i = rowShape.points.length; i > 0; i -= 2 ) {
      points.push(rowShape.points[i - 1], rowShape.points[i - 2]);
    }
    shape = {
      points,
      center: {x: rowShape.center.y, y: rowShape.center.x},
      snapping: {
        behavior: rowShape.snapping.behavior,
        anchor: {x: rowShape.snapping.anchor.y, y: rowShape.snapping.anchor.x}
      }
    };
  }

  // Small hexagon
  else if ( (width === 0.5) && (height === 0.5) ) {
    shape = {
      points: [0.25, 0.0, 0.5, 0.125, 0.5, 0.375, 0.25, 0.5, 0.0, 0.375, 0.0, 0.125],
      center: {x: 0.25, y: 0.25},
      snapping: {behavior: {mode: CONST.GRID_SNAPPING_MODES.CENTER, resolution: 1}, anchor: {x: 0.25, y: 0.25}}
    };
  }

  // Normal hexagon
  else if ( (width === 1) && (height === 1) ) {
    shape = {
      points: [0.5, 0.0, 1.0, 0.25, 1, 0.75, 0.5, 1.0, 0.0, 0.75, 0.0, 0.25],
      center: {x: 0.5, y: 0.5},
      snapping: {behavior: {mode: CONST.GRID_SNAPPING_MODES.TOP_LEFT_CORNER, resolution: 1}, anchor: {x: 0.0, y: 0.0}}
    };
  }

  // Hexagonal ellipse or trapezoid
  else if ( type <= CONST.TOKEN_HEXAGONAL_SHAPES.TRAPEZOID_2 ) {
    shape = createHexagonalEllipseOrTrapezoid(type, width, height);
  }

  // Hexagonal rectangle
  else if ( type <= CONST.TOKEN_HEXAGONAL_SHAPES.RECTANGLE_2 ) {
    shape = createHexagonalRectangle(type, width, height);
  }

  // Cache the shape
  if ( shape ) {
    Object.freeze(shape);
    Object.freeze(shape.points);
    Object.freeze(shape.center);
    Object.freeze(shape.snapping);
    Object.freeze(shape.snapping.behavior);
    Object.freeze(shape.snapping.anchor);
    hexagonalShapes.set(key, shape);
  }
  return shape;
}

function createHexagonalEllipseOrTrapezoid(type, width, height) {
  if ( !Number.isInteger(width) || !Number.isInteger(height) ) return null;
  const points = [];
  let top;
  let bottom;
  switch ( type ) {
    case CONST.TOKEN_HEXAGONAL_SHAPES.ELLIPSE_1:
      if ( height >= 2 * width ) return null;
      top = Math.floor(height / 2);
      bottom = Math.floor((height - 1) / 2);
      break;
    case CONST.TOKEN_HEXAGONAL_SHAPES.ELLIPSE_2:
      if ( height >= 2 * width ) return null;
      top = Math.floor((height - 1) / 2);
      bottom = Math.floor(height / 2);
      break;
    case CONST.TOKEN_HEXAGONAL_SHAPES.TRAPEZOID_1:
      if ( height > width ) return null;
      top = height - 1;
      bottom = 0;
      break;
    case CONST.TOKEN_HEXAGONAL_SHAPES.TRAPEZOID_2:
      if ( height > width ) return null;
      top = 0;
      bottom = height - 1;
      break;
  }
  let x = 0.5 * bottom;
  let y = 0.25;
  for ( let k = width - bottom; k--; ) {
    points.push(x, y);
    x += 0.5;
    y -= 0.25;
    points.push(x, y);
    x += 0.5;
    y += 0.25;
  }
  points.push(x, y);
  for ( let k = bottom; k--; ) {
    y += 0.5;
    points.push(x, y);
    x += 0.5;
    y += 0.25;
    points.push(x, y);
  }
  y += 0.5;
  for ( let k = top; k--; ) {
    points.push(x, y);
    x -= 0.5;
    y += 0.25;
    points.push(x, y);
    y += 0.5;
  }
  for ( let k = width - top; k--; ) {
    points.push(x, y);
    x -= 0.5;
    y += 0.25;
    points.push(x, y);
    x -= 0.5;
    y -= 0.25;
  }
  points.push(x, y);
  for ( let k = top; k--; ) {
    y -= 0.5;
    points.push(x, y);
    x -= 0.5;
    y -= 0.25;
    points.push(x, y);
  }
  y -= 0.5;
  for ( let k = bottom; k--; ) {
    points.push(x, y);
    x += 0.5;
    y -= 0.25;
    points.push(x, y);
    y -= 0.5;
  }
  return {
    points,
    center: foundry.utils.polygonCentroid(points),
    snapping: {
      behavior: {mode: bottom % 2 ? CONST.GRID_SNAPPING_MODES.BOTTOM_RIGHT_VERTEX : CONST.GRID_SNAPPING_MODES.TOP_LEFT_CORNER, resolution: 1},
      anchor: {x: 0.0, y: 0.0}
    }
  };
}

function createHexagonalRectangle(type, width, height) {
  if ( (width < 1) || !Number.isInteger(height) ) return null;
  if ( (width === 1) && (height > 1) ) return null;
  if ( !Number.isInteger(width) && (height === 1) ) return null;
  const even = (type === CONST.TOKEN_HEXAGONAL_SHAPES.RECTANGLE_1) || (height === 1);
  let x = even ? 0.0 : 0.5;
  let y = 0.25;
  const points = [x, y];
  while ( x + 1 <= width ) {
    x += 0.5;
    y -= 0.25;
    points.push(x, y);
    x += 0.5;
    y += 0.25;
    points.push(x, y);
  }
  if ( x !== width ) {
    y += 0.5;
    points.push(x, y);
    x += 0.5;
    y += 0.25;
    points.push(x, y);
  }
  while ( y + 1.5 <= 0.75 * height ) {
    y += 0.5;
    points.push(x, y);
    x -= 0.5;
    y += 0.25;
    points.push(x, y);
    y += 0.5;
    points.push(x, y);
    x += 0.5;
    y += 0.25;
    points.push(x, y);
  }
  if ( y + 0.75 < 0.75 * height ) {
    y += 0.5;
    points.push(x, y);
    x -= 0.5;
    y += 0.25;
    points.push(x, y);
  }
  y += 0.5;
  points.push(x, y);
  while ( x - 1 >= 0 ) {
    x -= 0.5;
    y += 0.25;
    points.push(x, y);
    x -= 0.5;
    y -= 0.25;
    points.push(x, y);
  }
  if ( x !== 0 ) {
    y -= 0.5;
    points.push(x, y);
    x -= 0.5;
    y -= 0.25;
    points.push(x, y);
  }
  while ( y - 1.5 > 0 ) {
    y -= 0.5;
    points.push(x, y);
    x += 0.5;
    y -= 0.25;
    points.push(x, y);
    y -= 0.5;
    points.push(x, y);
    x -= 0.5;
    y -= 0.25;
    points.push(x, y);
  }
  if ( y - 0.75 > 0 ) {
    y -= 0.5;
    points.push(x, y);
    x += 0.5;
    y -= 0.25;
    points.push(x, y);
  }
  return {
    points,
    center: {
      x: width / 2,
      y: ((0.75 * Math.floor(height)) + (0.5 * (height % 1)) + 0.25) / 2
    },
    snapping: {
      behavior: {mode: even ? CONST.GRID_SNAPPING_MODES.TOP_LEFT_CORNER : CONST.GRID_SNAPPING_MODES.BOTTOM_RIGHT_VERTEX, resolution: 1},
      anchor: {x: 0.0, y: 0.0}
    }
  };
}