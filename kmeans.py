from DataCollector import DataCollector
import InitMachine
from KMeansMachine import KMeansClusteringMachine as kmeans
from argparse import ArgumentParser

parser = ArgumentParser(description='k-Means clustering.')
parser.add_argument('-n', '--iteration', type=int, help='Iterations count.', default=100)
parser.add_argument('--stations', help='Locate clusters to roadmap network.', action='store_true')
parser.add_argument('-c', '--clusters', nargs='+', help='Load clusters from file with name as first argument.\n'
                          'If clusters should be load from specific points\' types, pass them to arguments after filename')
parser.add_argument('-p', '--points', help='Load points from file with name as first argument.\n'
                          'If points shouldn\'t be load from specific points\' types, pass them to arguments after filename',
                          nargs='+', required=True)
parser.add_argument('-r', '--random', type=int, help='Number of clusters if "init" is set to "random"', default=40)
parser.add_argument('-g', '--grid', type=int, nargs=2, help='Size of grid if "init" is set to "grid"', default=[7, 7])

args = parser.parse_args()

iterationsCount = args.iteration
stations = args.stations

try:
    datafile = args.points[0]
    pointsParams = args.points[1:]
except:
    pass

# create DataCollector object
dc = DataCollector()
# upload data from datafile
dc.uploadFromTextFile(datafile, params=pointsParams)
# get data from dc object
X = dc.getData()

if args.random:
    bounds = InitMachine.getBounds(X)
    clusters = InitMachine.random(count=args.random, bounds=bounds)
elif args.grid:
    bounds = InitMachine.getBounds(X)
    clusters = InitMachine.grid(grid=args.grid, bounds=bounds)
elif args.clusters:
    try:
        filename = args.clusters[0]
        clusterParams = args.clusters[1:]
    except:
        pass

    clusters = InitMachine.file(filename=filename, params=clusterParams)
else:
    print('Unrecognized init type: {}'.format(init))
# export init centers to 'init.txt'
# initM.exportCentersToTextFile('init.txt')

# create KMeansClusteringMachine object with specified parameters
km = kmeans(X, clusters, maxIter=iterationsCount, stations=stations)

# perform clustering
km.fit()
# print info
if not args.quiet:
    print('Fit time: {}, clusters: {}'.format(km.fitTime, km.numCluster))

# export centers to 'centers.js'
km.exportCentersToTextFile('{}_cls.js'.format('log'))
# export points to 'points.js'
km.exportPointsToTextFile('{}_pts.js'.format('log'))
