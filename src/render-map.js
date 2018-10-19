import * as d3 from 'd3'

const land = d3.interpolateRgbBasis([
  '#A4D475', //
  '#ACCA89',
  '#FFF1C0',
  '#FCA666',
  '#c54902', // dark red
])
const land2 = d3.interpolateRgbBasis([
  '#94BC71',
  '#A1C37F',
  '#BFCF9D',
  '#E0DFBB',
  // '#EFC297',
  '#DF9666',
])
const water = d3.interpolateRgb('#0084b8','#0003b8')
function heightToColor(h) {
  if (h >= 0) {
    return land2(h)
  }
  return water(-h * 2)
}


export {heightToColor}
