from DataCollector import DataCollector
from KMeansMachine import KMeansClusteringMachine as kmeans
from KMeansMachineTriangle import KMeansClusteringMachine as kmeans_triangle
from argparse import ArgumentParser

parser = ArgumentParser(description='k-Means clustering.')
parser.add_argument('-m', '--metric', help='Used metric', choices=['route', 'euclid', 'surface'], default='route')
parser.add_argument('--sample', help='Used sample.\n'
                          '  Points are loaded from "data/SAMPLE_pts.txt" if "--points" is not set.\n'
                          '  If init type is file, clusters are loaded from "data/SAMPLE_cls" if "--clusters" is not set.', default='common')
parser.add_argument('-n', '--iteration', type=int, help='Iterations count.', default=100)
parser.add_argument('-i', '--init', help='Type of init.', choices=['file', 'random', 'grid'], default='file')
parser.add_argument('-t', '--threads', type=int, help='Number of threads', default=4)
parser.add_argument('-q', '--nolog', help='Do not log iteration result', action='store_true')
parser.add_argument('--use_triangle', help='Use triangle inequality to reduce calculations.', action='store_true')
parser.add_argument('--stations', help='Locate clusters to roadmap network.', action='store_true')
parser.add_argument('-c', '--clusters', nargs='+', help='Load clusters from file with name as first argument.\n'
                          'If clusters should be load from specific points\' types, pass them to arguments after filename')
parser.add_argument('-p', '--points', nargs='+', help='Load points from file with name as first argument.\n'
                          'If points shouldn\'t be load from specific points\' types, pass them to arguments after filename')
parser.add_argument('-r', '--count', type=int, help='Number of clusters if "init" is set to "random"', default=40)
parser.add_argument('-g', '--grid', type=int, nargs=2, help='Size of grid if "init" is set to "grid"', default=[7, 7])
parser.add_argument('--start', help="Result of previous work, points file. Continue calculations from this step.")
parser.add_argument('-q!', '--quiet', help='Be quiet', action='store_true')

args = parser.parse_args()

USE_TRIANGLE_INEQUALITY = args.use_triangle
test = args.sample.lower()
metric = args.metric.lower() # route, surface, euclid
iterations_count = args.iteration
thread_count = args.threads
_continue = args.start
stations = args.stations
cluster_params = [] if args.clusters is None else args.clusters[1:]
points_params = [] if args.points is None else args.points[1:]

datafile = 'data/{}_pts.txt'.format(test) if args.points is None else args.points[0]
init = args.init
filename = 'data/{}_cls.txt'.format(test) if args.clusters is None else args.clusters[0]
if args.init is 'file':
    if args.clusters is not None:
        log = args.clusters[0].split('.')[0] + '_log'
        if '/' in log:
            log = log.split('/')[-1]
    else:
        log = test
else:
    if args.points is not None:
        log = args.points[0].split('.')[0] + '_log'
        if '/' in log:
            log = log.split('/')[-1]
    else:
        log = args.init + '_log'
test = log
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

# create KMeansClusteringMachine object with specified parameters
if USE_TRIANGLE_INEQUALITY:
    print('This part is not completed.')
    km = kmeans_triangle(X, init=init, filename=filename, max_iter=iterations_count,
                         log=log, count=random_count, gridSize=grid_size)
else:
    km = kmeans(X, init=init, filename=filename, max_iter=iterations_count,
                         log=log, count=random_count, grid_size=grid_size,
                         thread_cound=thread_count, start=_continue,
                         stations=stations, quiet=args.quiet, cenpar=cluster_params)
# perform clustering
km.fit(metric)
# print info
if not args.quiet:
    print('Fit time: {}, clusters: {}'.format(km.fit_time, km.n_cluster))
# export init centers to 'k_init.txt'
# km.initM.exportCentersToTextFile('init.txt')
if not log:
    # export centers to 'centers.js'
    km.exportCentersToTextFile('{}_cls.js'.format(test))
    # export points to 'points.js'
    km.exportPointsToTextFile('{}_pts.js'.format(test))
