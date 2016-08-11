from DataCollector import DataCollector
from InitMachine import InitMachine
from KMeansMachine import KMeansClusteringMachine as kmeans
from argparse import ArgumentParser

parser = ArgumentParser(description='k-Means clustering.')
parser.add_argument('-m', '--metric', help='Used metric', choices=['route', 'euclid', 'surface'], default='route')
parser.add_argument('-n', '--iteration', type=int, help='Iterations count.', default=100)
parser.add_argument('-i', '--init', help='Type of init.', choices=['file', 'random', 'grid'], default='file')
parser.add_argument('-t', '--threads', type=int, help='Number of threads', default=4)
parser.add_argument('-q', '--nolog', help='Do not log iteration result', action='store_true')
parser.add_argument('--stations', help='Locate clusters to roadmap network.', action='store_true')
parser.add_argument('-c', '--clusters', nargs='+', help='Load clusters from file with name as first argument.\n'
                          'If clusters should be load from specific points\' types, pass them to arguments after filename')
parser.add_argument('-p', '--points', help='Load points from file with name as first argument.\n'
                          'If points shouldn\'t be load from specific points\' types, pass them to arguments after filename',
                          nargs='+', required=True)
parser.add_argument('-r', '--count', type=int, help='Number of clusters if "init" is set to "random"', default=40)
parser.add_argument('-g', '--grid', type=int, nargs=2, help='Size of grid if "init" is set to "grid"', default=[7, 7])
parser.add_argument('--start', help="Result of previous work, points file. Continue calculations from this step.")
parser.add_argument('-q!', '--quiet', help='Be quiet', action='store_true')
parser.add_argument('--map', help='OSRM map to load by osrm-routed process')
parser.add_argument('--loud', help='Print osrm responces', action='store_true')

args = parser.parse_args()

metric = args.metric.lower() # route, surface, euclid
iterationsCount = args.iteration
threadCount = args.threads
continue_ = args.start
stations = args.stations
mapParameters = (args.loud, args.map)

try:
    filename = args.clusters[0]
    clusterParams = args.clusters[1:]
except:
    pass

try:
    datafile = args.points[0]
    pointsParams = args.points[1:]
except:
    pass

init = args.init
if args.clusters is not None:
    log = args.clusters[0].split('.')[0] + '_log'
    if '/' in log:
        log = log.split('/')[-1]
else:
    log = args.points[0].split('.')[0] + '_log'
    if '/' in log:
        log = log.split('/')[-1]
export = log
if args.nolog:
    log = False

randomCount = args.count
gridSize = args.grid

# create DataCollector object
dc = DataCollector()
# upload data from datafile
dc.uploadFromTextFile(datafile, params=pointsParams)
# get data from dc object
X = dc.getData()

initM = InitMachine()
if init == 'random':
    bounds = initM.getBounds(X)
    initM.random(count=randomCount, bounds=bounds)
elif init == 'grid':
    bounds = initM.getBounds(X)
    initM.grid(grid=gridSize, bounds=bounds)
elif init == 'file':
    initM.file(filename=filename, params=clusterParams)
else:
    print('Unrecognized init type: {}'.format(init))
clusters = initM.getCenters()
# export init centers to 'init.txt'
# initM.exportCentersToTextFile('init.txt')

# create KMeansClusteringMachine object with specified parameters
km = kmeans(X, clusters, maxIter=iterationsCount, log=log,
            threadCound=threadCount, start=continue_, stations=stations,
            quiet=args.quiet, map_=mapParameters)

# perform clustering
km.fit(metric)
# print info
if not args.quiet:
    print('Fit time: {}, clusters: {}'.format(km.fitTime, km.numCluster))

if not log:
    # export centers to 'centers.js'
    km.exportCentersToTextFile('{}_cls.js'.format(export))
    # export points to 'points.js'
    km.exportPointsToTextFile('{}_pts.js'.format(export))
