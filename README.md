# Map Generation Project
### By Joe Howarth

## Purpose
This project seeks to procedurally create plausible geography and display it as a map.
The generator will be used to generate the starting conditions for a historical population dynamics simulation.

## Methodology
Unlike many map and terrain generators, this project does not use noise as the fundamental building block.
Instead, it uses a Delaunay triangulation over semi-random points, then combines elevation
