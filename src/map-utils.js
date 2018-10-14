import * as d3 from 'd3';
import { Delauney } from 'd3-delaunay';

function drawPoly(ctx, poly, color) {
  if (!poly || !poly[0]) {
    return
  }
  color = color || "#A2B499"

  ctx.beginPath()
  ctx.moveTo(poly[0][0],poly[0][1])
  for (let i = 1; i < poly.length; i++) {
    ctx.lineTo(poly[i][0], poly[i][1])
  }
  ctx.fillStyle=color
  ctx.fill();
}

function add() {
  let n = arguments[0].length;
  let newvals = new Array(arguments[0].length)
  newvals.fill(0)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < arguments.length; j++) {
      newvals[i] += arguments[j][i];
    }
  }
  return newvals;
}

var rnorm = (function () {
  var z2 = null;
  function rnorm() {
    if (z2 != null) {
      var tmp = z2;
      z2 = null;
      return tmp;
    }
    var x1 = 0;
    var x2 = 0;
    var w = 2.0;
    while (w >= 1) {
      x1 = rand(-1, 1);
      x2 = rand(-1, 1);
      w = x1 * x1 + x2 * x2;
    }
    w = Math.sqrt(-2 * Math.log(w) / w);
    z2 = x2 * w;
    return x1 * w;
  }
  return rnorm;
})();

function randomVector(scale) {
  return [scale * rnorm(), scale * rnorm()];
}

function alternate(fs, t) {
  let i = 0;
  setInterval(() => {
    fs[i]()
    i++
    i = i % (fs.length)
  }, t)
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
};
function randi(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
};

export { drawPoly, rand, randi, add, alternate, rnorm, randomVector};
