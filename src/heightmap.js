import { add, rand } from './map-utils'
import * as d3 from 'd3'


function genHM(mesh) {
  // let mesh = generateGoodMesh(params.npts, params.extent);
  let h = add(
    slope(mesh, [0.5, 0.5], 0.9),
    // cone(mesh, rand(-1.0, -0.5) * 0.0001),
    mountains(mesh, 50, 50, 0.5),
    mountains(mesh, 20, 40, 0.4),
    mountains(mesh, 5, 150, 0.4),
    mountains(mesh, 5, 150, 0.8),
    mountains(mesh, 2, 350, 0.1),
  );
  console.log("h after mountains", h)
  for (let i = 0; i < 0; i++) {
    h = mesh.relax(h);
  }
  // h = peaky(h);
  // h = fillSinks(mesh, h)
  h = normalize(h);
  h = doErosion(mesh, h, rand(0.02, 0.1), 1);
  // h = setSeaLevel(mesh, h, rand(0.1, 0.2));
  h = setSeaLevel(mesh, h, 0.35);
  // console.log("after sea: ", h)
  h = normalize(h, 0.01)
  // console.log("after norm: ", h)
  // console.log("min, max", d3.min(h), d3.max(h))

  h = fillSinks(mesh, h);
  h = cleanCoast(mesh, h, 3);
  return h;

}

function mountains(mesh, n, r, h) {
  r = r || 100;
  h = h || 1;
  let mounts = [];
  const { centroids } = mesh
  const W = mesh.xmax - mesh.xmin,
    H = mesh.ymax - mesh.ymin
  for (let i = 0; i < n; i++) {
    mounts.push([rand(W * 0.1, W * 0.9), rand(H * 0.1, H * 0.9)]);
  }

  // const rsqrt = Math.sqrt(r) /1.5 ;
  // const rsqrt = (r * h) / 8.5;
  // mounts.forEach(v => ctx.fillRect(v[0] - 2, v[1] - 2, rsqrt, rsqrt))

  // console.log(mounts)
  let newvals = mesh.zero().map((_,i) => {
    let p = centroids[i]
    let sum = 0
    for (let j = 0; j < n; j++) {
      let m = mounts[j];
      const dist = ((p[0] - m[0]) * (p[0] - m[0]) + (p[1] - m[1]) * (p[1] - m[1]))
      const exp = Math.exp(-dist / (2 * r * r))
      sum += Math.pow(exp * h, 2)
    }
    return sum
  })
  // console.log("newvals in mountains",newvals)
  return newvals;
}

function slope(mesh, dir, steepness) {
  // unit vector
  let len = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1])
  dir = [dir[0] / len, dir[1] / len]
  let h = mesh.map((pt, i) => {
    // dir is unit vec now
    // console.log("in slope (not getslope)", pt, dir)
    return pt[0] * dir[0] + pt[1] * dir[1]
  })
  return normalize(h)
}

function quantile(h, q) {
  let sortedh = h.slice()
  sortedh.sort(d3.ascending);
  return d3.quantile(sortedh, q);
}

function cone(mesh, slope) {
  let [Cx, Cy] = mesh.extent.slice()
  Cx /= 2;
  Cy /= 2;
  return mesh.map(v => {
    const x = (v[0] - Cx)
    const y = (v[1] - Cy)
    const dist = x * x + y * y
    return Math.pow(dist, 0.5) * slope;
  });
}

function normalize(h, lo, hi) {
  lo = lo || d3.min(h);
  hi = hi || d3.max(h);
  return h.map(x => (x - lo) / (hi - lo))
}

function peaky(h) {
  return normalize(h)
    .map(Math.sqrt);
}


function downhill(mesh, h) {
  // if (h.downhill) return h.downhill;
  console.log("h in downHill", h)

  function downFrom(i) {
    if (mesh.isEdge(i)) return -2
    let best = -1
    let besth = h[i]
    let nbs = mesh.adj[i]
    for (let j = 0; j < nbs.length; j++) {
      let n = nbs[j]

      if (h[n] < besth) {
        besth = h[n]
        best = n
      }
    }
    return best
  }

  let downs = h.map((v, i) => downFrom(i))
  h.downhill = downs
  return downs
}

function getFlux(mesh, h) {
  console.log("h in getflux", h)
  const dh = downhill(mesh, h);
  let idxs = mesh.triIDs.map((v, i) => i)
  let flux = h.map((_, i) => 1 / h.length)
  // console.log('flux', flux)
  idxs.sort((a, b) => h[b] - h[a])

  idxs.forEach((j, i) => {
    if (dh[j] >= 0) {
      flux[dh[j]] += flux[j]
    }
  })
  return flux
}

// redefining slope to use with tri-vertices not triangles
function getSlope(mesh, h) {
  let dh = downhill(mesh, h);
  return mesh.zero()
    .map((v, i) => {
      let s = mesh.trislope(h, i);
      // console.log(s)
      let slope= Math.sqrt(s[0] * s[0] + s[1] * s[1]);

      if (slope > 3) {
        if (mesh.isNearEdge(i)) {
          return 1.0
        }
        return 3.0
      }
      return slope;
      if (dh[i] < 0) {
        return 0;
      } else {
        // console.log(h[i] - h[dh[i]], i, dh[i], mesh.distance(i, dh[i]))
        return (h[i] - h[dh[i]]) / mesh.distance(i, dh[i]);
      }
    });
}

function erosionRate(mesh, h) {
  let flux = getFlux(mesh, h);
  let slope = getSlope(mesh, h);
  let newh = mesh.zero()
  for (let i = 0; i < newh.length; i++) {
    let river = Math.sqrt(flux[i]) * slope[i];
    let creep = slope[i] * slope[i];
    let total = 1000 * river + creep;
    total = total > 120 ? 120 : total;
    newh[i] = total;
  }
  return newh;
}

function erode(mesh, h, amount) {
  let er = erosionRate(mesh, h);
  let maxr = d3.max(er);

  return mesh.zero()
    .map((v, i) => h[i] - amount * (er[i] / maxr));
}

function doErosion(mesh, h, amount, n) {
  n = n || 1;
  h = fillSinks(mesh, h);
  for (let i = 0; i < n; i++) {
    h = erode(mesh, h, amount);
    h = fillSinks(mesh, h);
  }
  return h;
}

function findSinks(mesh, h) {
  let dh = downhill(h);
  let sinks = mesh.triIDs.map((v,i) => {
    let node = i;
    while (true) {
      if (mesh.isEdge(node)) {
        sinks[i] = -2;
        break;
      }
      if (dh[node] === -1) {
        sinks[i] = node;
        break;
      }
      node = dh[node];
    }
  });
  return sinks
}

function fillSinks(mesh, h, epsilon) {
  epsilon = epsilon || 1e-5;
  let infinity = 999999;
  let newh = mesh.zero().map((v,i) => {
    if (mesh.isNearEdge(i)) {
      return h[i];
    } else {
      return infinity;
    }
  })
  console.log("fillSinks, init newh", newh)
  let c = 0
  while (c < 200) {
    c +=1
    let changed = false;
    for (let i = 0; i < newh.length; i++) {
      if (newh[i] === h[i]) continue;
      let nbs = mesh.adj[i]
      for (let j = 0; j < nbs.length; j++) {
        if (h[i] >= newh[nbs[j]] + epsilon) {
          newh[i] = h[i];
          changed = true;
          break;
        }
        let oh = newh[nbs[j]] + epsilon;
        if ((newh[i] > oh) && (oh > h[i])) {
          newh[i] = oh;
          changed = true;
        }
      }
    }
    if (!changed) return newh;
  }
}

function setSeaLevel(mesh, h, q) {
  let newh = mesh.zero()
  let delta = quantile(h, q);
  console.log('delta', delta)
  console.log('min, max', d3.min(h), d3.max(h))
  for (let i = 0; i < newh.length; i++) {
    newh[i] = h[i] - delta;
  }
  console.log('min, max', d3.min(newh), d3.max(newh))
  return newh;
}

function cleanCoast(mesh, h, iters) {
  for (let iter = 0; iter < iters; iter++) {
    let changed = 0;
    let newh = mesh.zero();
    for (let i = 0; i < h.length; i++) {
      newh[i] = h[i];
      let nbs = mesh.adj[i]
      if (h[i] <= 0 || nbs.length !== 3) continue;
      let count = 0;
      let best = -999999;
      for (let j = 0; j < nbs.length; j++) {
        if (h[nbs[j]] > 0) {
          count++;
        } else if (h[nbs[j]] > best) {
          best = h[nbs[j]];
        }
      }
      if (count > 1) continue;
      newh[i] = best / 2;
      changed++;
    }
    h = newh;
    newh = mesh.zero()
    for (let i = 0; i < h.length; i++) {
      newh[i] = h[i];
      let nbs = mesh.adj[i]
      if (h[i] > 0 || nbs.length !== 3) continue;
      let count = 0;
      let best = 999999;
      for (let j = 0; j < nbs.length; j++) {
        if (h[nbs[j]] <= 0) {
          count++;
        } else if (h[nbs[j]] < best) {
          best = h[nbs[j]];
        }
      }
      if (count > 1) continue;
      newh[i] = best / 2;
      changed++;
    }
    h = newh;
  }
  return h;
}

export {
  genHM,
  fillSinks,
  doErosion,
  erode,
  erosionRate,
  getFlux,
  normalize,
  peaky,
  getSlope,
  cone,
  downhill,
  mountains,
  quantile,
  setSeaLevel,
  cleanCoast,
}
