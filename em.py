from DataCollector import DataCollector
import InitMachine
from EMMachine import EMClusteringMachine as EM
from argparse import ArgumentParser

parser = ArgumentParser(description='EM clustering.')
parser.add_argument('-i', '--iteration', type=int, help='Iterations count.', default=100)
parser.add_argument('-c', '--clusters', nargs='+', help='Load clusters from file which name is the first argument.\n'
                          'If clusters should be load from specific points\' types, pass them to arguments after filename')
parser.add_argument('-p', '--points', nargs='+', help='Load points from file which name is the first argument.\n'
                          'If points shouldn\'t be load from specific points\' types, pass them to arguments after filename',
                          required=True)
parser.add_argument('-r', '--random', type=int, help='Initialize clusters by uniform distribution of points. Argument is the number of clusters.')
parser.add_argument('-g', '--grid', type=int, nargs=2, help='Initialize clusters by grid. Arguments are width and height of grid.')
parser.add_argument('-t', '--table', help='Load metric table from file which name is the argument.')
parser.add_argument('-l', '--locate', help='Locate metric table elements to roads _before_ finding unnecessary elements.', action="store_true")

args = parser.parse_args()

iterationsCount = args.iteration

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

# create EMClusteringMachine object with specified parameters
em = EM(X, clusters, maxIter=iterationsCount, table=args.table)

# perform clustering
em.fit(locate='before' if args.locate else 'after')
# print info
print('Fit time: {}, clusters: {}'.format(em.fitTime, em.numCluster))

# export centers to 'centers.js'
em.exportCentersToTextFile('{}_cls.js'.format('log'))
# export points to 'points.js'
em.exportPointsToTextFile('{}_pts.js'.format('log'))