## Clustering

Project for clustering people's transportation preferences which are
represented as sets of origin and destination points on OpenStreetMap.

Requires Python v2.7 / v3.x and installed
[OSRM Server](https://github.com/Project-OSRM/osrm-backend/) for *route*
metric.

### Usage: run `kmeans.py` with `--help` argument:

    python3 kmeans.py --help

### Main links
- [kmeans.py](/kmeans.py): main script for clustering.
- [routelib.py](/routelib.py): distance metric class based on calculating
  distances between points with OSRM.
- [github.io](http://vstu-cad-stuff.github.io/clustering): visualization of
  algorithm's work.

#### Files
- [data/](/data/): 5 samples for tests. Points of *"1"* type are initial
  cluster's centers, points of *"0"* type are points to cluster.
    + File `full.txt` -- sample of 12000 points and 125 clusters, random
    points distributed uniformly.
    + File `few.txt` -- a part of `full` sample, 500 points and 20 clusters.
    + File `common.txt` -- sample of 180 points and 10 clusters, a city block.
    + File `river.txt` -- sample of 6 points and 2 clusters, points are
    separated by natural obstacle - river.
    + File `railway.txt` -- sample of 6 points and 2 clusters, points are
    separated by artificial obstacle - railway.
- [ClusteringMachine.py](/ClusteringMachine.py): pattern class for clustering
  machine.
- [converter.py](/converter.py): converter of iterational algorithm logs to js
  format for visualization.
  [Jarvis march](https://en.wikipedia.org/wiki/Gift_wrapping_algorithm) is
  used to calculate convex hulls of points.
- [DataCollector.py](/DataCollector.py): class for data gathering.
- [InitMachine.py](/InitMachine.py): class for initial cluster's centers
  distribution.
- [kmeans.py](/kmeans.py): main script for clustering.
- [KMeansMachine.py](/KMeansMachine.py):
  [K-Means algorithm](https://en.wikipedia.org/wiki/K-means_clustering)
  clustering machine.
- [routelib.py](/routelib.py) -- distance metric class based on calculating
  distances between points with
  [OSRM](https://github.com/Project-OSRM/osrm-backend/).

#### Examples
Clustering of all data from `full` set by euclid metric with random initial
distribution of cluster's centers. Number of clusters is 100, maximum iteration
number is 50:

    python3 kmeans.py -p data/full.txt -m euclid -i random -r 100 -n 50

Clustering of all data from file `data.txt` by `route` metric (map is loaded
from file `~/map.osrm`) with initial cluster's centers distributed on 3×4 grid
without logging and console output:

    python3 kmeans.py -p data.txt --map ~/map.osrm -i grid -g 3 4 --nolog -q!

Clustering of all data types except type *"1"* from file `data.txt` by
`surface` metric, initial cluster's centers distribution is data with type
*"1"* from file `data.txt`; use paralleling on 8 threads:

    python3 kmeans.py -p data.txt 1 -c data.txt 1 -m surface -t 8

#### Clean local repository

If you wish to clean untracked changes in local repository made since last commit:

1. `git clean -df` this command removes any files untracked by Git.
2. `git checkout -- .` this restores all files tracked by Git to their state since last commit, reverting any changes you may have made.
