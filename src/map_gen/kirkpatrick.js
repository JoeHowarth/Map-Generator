import {Delaunay} from 'd3-delaunay'
import {alternate} from "./map-utils";
import {calcAdjVerts, edge2tri} from "./mesh";

function independentSet(adj, res) {
  let num_verts = adj.length
  if (!res) {
    res = new Uint32Array(num_verts);
  } else {
    console.assert(num_verts >= res.length)
    for (let i = 0; i < num_verts; i++) {
      res[i] = 0
    }
  }

  for (let i = 0; i < num_verts; ++i) {
    let nbs = adj[i]
    let noNeighbor = true

    for (let j = 0; j < nbs.length; ++j) {
      if (res[nbs[j]]) {
        noNeighbor = false
        break
      }
    }
    if (noNeighbor) {
      res[i] = 1
    }
  }

  return res

}


export function refinement(mesh) {

  let adj = calcAdjVerts(mesh)
  console.log('vert adj', adj)
  // let indSet = maximalIndependentSet(adj)
  let indSet = independentSet(adj)

  console.log("independent set", indSet)

  let points = []
  for (let i = 0; i < indSet.length; i++) {
    if (indSet[i]) continue

    points.push(mesh.point_km(i))
  }

  let points_orig = []
  for (let i = 0; i < mesh.points.length / 2; i++) {
    points_orig.push(mesh.point_km(i))
  }

  console.log(points)
  console.log(points_orig)


  let centroids_refine = mesh.centroids.filter((_, i) => indSet[i])
  console.log(Delaunay)
  let refinedTri = Delaunay.from(points)
  console.log(refinedTri)

  renderDel(refinedTri, mesh, {color: 'red'})
  plotVerts(mesh, points);
  plotAdj(adj, points_orig, mesh)

  // alternate([
  //   () => plotVerts(mesh, mesh.centroids),
  // ], 3000)

}

function link_levels(del_upper, del_lower, indSet, adj) {
  for (let i = 0; i < indSet.length; ++i) {
    if (indSet[i]) {
      // triangles to remove
      let lower_tris = edgesAroundPoint(del_lower, del_lower.incoming[i]).map(edge2tri);

    }
  }

}

function edgesAroundPoint(delaunay, start) {
  const result = [];
  let incoming = start;
  do {
    result.push(incoming);
    const outgoing = nextHalfedge(incoming);
    incoming = delaunay.halfedges[outgoing];
  } while (incoming !== -1 && incoming !== start);
  return result;
}

function tri_intersects(t1, t2) {
  let ps1 = tri2edge(t1).map(i => mesh.point_km(mesh.triangles[i]))
  let ps2 = tri2edge(t1).map(i => mesh.point_km(mesh.triangles[i]))

  let res = false
  for (let i = 0; i < ps1.length; i++) {
    for (let j = 0; j < ps2.length; j++) {
      if (segment_intersect(ps1[i], ps2[j])) {
        res = true
        break
      }

      if (res) break
    }
  }
  return res

}

// return true if segments intersect
function segment_intersect([[x11, y11], [x12, y12]], [[x21, y21], [x22, y22]]) {

  let A1 = y12 - y11
  let A2 = y22 - y21
  let B1 = x11 - x12
  let B2 = x21 - x22

  return A1 * B2 - A2 * B1 === 0
}


function plotVerts(mesh, centroids) {
  const ctx = mesh.ctx
  ctx.beginPath()
  ctx.save()
  ctx.scale(mesh.km2px, mesh.km2px)
  // ctx.fillStyle = 'white'
  // ctx.fillRect(0, 0, mesh.Dkm[0], mesh.Dkm[1])
  ctx.fillStyle = 'red'

  for (let i = 0; i < centroids.length; i++) {
    ctx.fillRect(centroids[i][0] - 1.5, centroids[i][1] - 1.5, 3, 3)
  }

  ctx.fill()
  ctx.restore()
}

function plotAdj(adj, points, mesh) {
  const ctx = mesh.ctx
  ctx.save()
  ctx.scale(mesh.km2px, mesh.km2px)

  ctx.strokeStyle = 'black'
  ctx.lineWidth = 0.5
  for (let i = 0; i < adj.length; ++i) {
    let nbs = adj[i]
    for (let j = 0; j < nbs.length; ++j) {
      ctx.beginPath()
      // console.log(points[i][0], points[i][1])
      ctx.moveTo(points[i][0], points[i][1])
      ctx.lineTo(points[nbs[j]][0], points[nbs[j]][1])
      ctx.stroke()
    }

    // ctx.fillRect(points[i][0] - 1.5, points[i][1] - 1.5, 3, 3)
  }

  ctx.restore()
}

function renderDel(del, mesh, {color, alpha} = {}) {
  const ctx = mesh.ctx
  ctx.save()
  ctx.stroke()
  ctx.strokeStyle = color ? color : 'rgb(0,0,0)'
  ctx.globalAlpha = alpha ? alpha : 1
  ctx.scale(mesh.km2px, mesh.km2px)
  del.render(ctx)
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.restore()
}

