from DataCollector import DataCollector
from InitMachine import InitMachine
from KMeansMachine import KMeansClusteringMachine as kmeans
from KMeansMachineTriangle import KMeansClusteringMachine as kmeans_triangle
from argparse import ArgumentParser

parser = ArgumentParser(description='k-Means clustering.')
parser.add_argument('-m', '--metric', help='Used metric', choices=['route', 'euclid', 'surface'], default='route')
parser.add_argument('-n', '--iteration', type=int, help='Iterations count.', default=100)
parser.add_argument('-i', '--init', help='Type of init.', choices=['file', 'random', 'grid'], default='file')
parser.add_argument('-t', '--threads', type=int, help='Number of threads', default=4)
parser.add_argument('-q', '--nolog', help='Do not log iteration result', action='store_true')
parser.add_argument('--use_triangle', help='Use triangle inequality to reduce calculations.', action='store_true')
parser.add_argument('--stations', help='Locate clusters to roadmap network.', action='store_true')
parser.add_argument('-c', '--clusters', help='Load clusters from file with name as first argument.\n'
                          'If clusters should be load from specific points\' types, pass them to arguments after filename',
                          nargs='+', required=True)
parser.add_argument('-p', '--points', help='Load points from file with name as first argument.\n'
                          'If points shouldn\'t be load from specific points\' types, pass them to arguments after filename',
                          nargs='+', required=True)
parser.add_argument('-r', '--count', type=int, help='Number of clusters if "init" is set to "random"', default=40)
parser.add_argument('-g', '--grid', type=int, nargs=2, help='Size of grid if "init" is set to "grid"', default=[7, 7])
parser.add_argument('--start', help="Result of previous work, points file. Continue calculations from this step.")
parser.add_argument('-q!', '--quiet', help='Be quiet', action='store_true')

args = parser.parse_args()

USE_TRIANGLE_INEQUALITY = args.use_triangle
metric = args.metric.lower() # route, surface, euclid
iterations_count = args.iteration
thread_count = args.threads
_continue = args.start
stations = args.stations

try:
    filename = args.clusters[0]
    cluster_params = args.clusters[1:]
    datafile = args.points[0]
    points_params = args.points[1:]
except:
    pass

init = args.init
log = args.clusters[0].split('.')[0] + '_log'
if '/' in log:
    log = log.split('/')[-1]
export = log
if args.nolog:
    log = False

random_count = args.count
grid_size = args.grid

# create DataCollector object
dc = DataCollector()
# upload data from datafile
dc.uploadFromTextFile(datafile, params=points_params)
# get data from dc object
X = dc.getData()

initM = InitMachine()
if init == 'random':
    bounds = initM.getBounds(X)
    initM.random(count=count, bounds=bounds)
elif init == 'grid':
    bounds = initM.getBounds(X)
    initM.grid(gridSize=grid_size, bounds=bounds)
elif init == 'file':
    initM.file(filename=filename, params=cluster_params)
else:
    print('Unrecognized init type: {}'.format(init))
clusters = initM.getCenters()

# create KMeansClusteringMachine object with specified parameters
if USE_TRIANGLE_INEQUALITY:
    print('This part is not completed, sorry.')
    exit()
    # km = kmeans_triangle(X, init=init, filename=filename, max_iter=iterations_count,
    #                      log=log, count=random_count, gridSize=grid_size)
else:
    km = kmeans(X, clusters, max_iter=iterations_count, log=log,
                thread_cound=thread_count, start=_continue, stations=stations,
                quiet=args.quiet)

# perform clustering
km.fit(metric)
# print info
if not args.quiet:
    print('Fit time: {}, clusters: {}'.format(km.fit_time, km.n_cluster))

# export init centers to 'k_init.txt'
# km.initM.exportCentersToTextFile('init.txt')
if not log:
    # export centers to 'centers.js'
    km.exportCentersToTextFile('{}_cls.js'.format(export))
    # export points to 'points.js'
    km.exportPointsToTextFile('{}_pts.js'.format(export))
