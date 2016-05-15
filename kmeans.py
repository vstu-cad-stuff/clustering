from DataCollector import DataCollector
from KMeansMachine import KMeansClusteringMachine as kmeans
from KMeansMachineTriangle import KMeansClusteringMachine as kmeans_triangle
from argparse import ArgumentParser

parser = ArgumentParser(description='k-Means clustering.')
parser.add_argument('-m', '--metric', help='Used metric', choices=['route', 'euclid', 'surface'], default='route')
parser.add_argument('-s', '--sample', help='Used sample.\n'
                          '  Points are loaded from "data/SAMPLE_pts.txt" if "--points" in not set.\n'
                          '  If init type is file, clusters are loaded from "data/SAMPLE_cls" if "--clusters" is not set.', default='common')
parser.add_argument('-i', '--iteration', type=int, help='Iterations count.', default=100)
parser.add_argument('-l', '--log', help='Log iteration result', default='True')
parser.add_argument('-t', '--init', help='Type of init.', choices=['file', 'random', 'grid'], default='file')
parser.add_argument('--use_triangle', help='Use triangle inequality to reduce calculations.', action='store_true')
parser.add_argument('--clusters', help='Load clusters from CLUSTERS.')
parser.add_argument('--points', help='Load points from POINTS.')
parser.add_argument('-n', '--count', type=int, help='Number of clusters if "init" is set to "random"', default=40)
parser.add_argument('-g', '--grid', type=int, nargs=2, help='Size of grid if "init" is set to "grid"', default=[7, 7])

args = parser.parse_args()

USE_TRIANGLE_INEQUALITY = args.use_triangle
test = args.sample.lower()
metric = args.metric.lower() # route, surface, euclid
iterations_count = args.iteration

datafile = 'data/{}_pts.txt'.format(test) if args.points is None else args.points
init = args.init
filename = 'data/{}_cls.txt'.format(test) if args.clusters is None else args.clusters
if args.log.lower() not in ('false', 'none', '0', 'not'):
    if args.init is 'file':
        if args.clusters is not None:
            log = args.clusters.split('.')[0] + '_log'
            if '/' in log:
                log = log.split('/')[-1]
        else:
            log = test
    else:
        if args.points is not None:
            log = args.points.split('.')[0] + '_log'
            if '/' in log:
                log = log.split('/')[-1]
        else:
            log = args.init + '_log'
else:
    log = False
random_count = args.count
grid_size = args.grid

# create DataCollector object
dc = DataCollector()
# upload data from 'data.txt' file
dc.uploadFromTextFile(datafile, delimiter=',')
# get data from dc object
X = dc.getData()

# create KMeansClusteringMachine object with specified parameters
if USE_TRIANGLE_INEQUALITY:
    km = kmeans_triangle(X, init=init, filename=filename, max_iter=iterations_count,
                         log=log, count=random_count, gridSize=grid_size)
else:
    km = kmeans(X, init=init, filename=filename, max_iter=iterations_count,
                         log=log, count=random_count, gridSize=grid_size)
# perform clustering
km.fit(metric)
# print info
print('Fit time: {}, clusters: {}'.format(km.fit_time, km.n_cluster))
# export init centers to 'k_init.txt'
# km.initM.exportCentersToTextFile('init.txt')
if not log:
    # export centers to 'centers.js'
    km.exportCentersToTextFile('{}_cls.js'.format(test))
    # export points to 'points.js'
    km.exportPointsToTextFile('{}_pts.js'.format(test))
