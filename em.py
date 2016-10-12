from DataCollector import DataCollector
import InitMachine
from EMMachine import EMClusteringMachine as EM
from argparse import ArgumentParser

parser = ArgumentParser(description='EM clustering.')
parser.add_argument('-n', '--iteration', type=int, help='Iterations count.', default=100)
parser.add_argument('-c', '--clusters', nargs='+', help='Load clusters from file with name as first argument.\n'
                          'If clusters should be load from specific points\' types, pass them to arguments after filename')
parser.add_argument('-p', '--points', help='Load points from file with name as first argument.\n'
                          'If points shouldn\'t be load from specific points\' types, pass them to arguments after filename',
                          nargs='+', required=True)
parser.add_argument('-r', '--random', type=int, help='Number of clusters if "init" is set to "random"')
parser.add_argument('-g', '--grid', type=int, nargs=2, help='Size of grid if "init" is set to "grid"')

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
# export init centers to 'init.txt'
# initM.exportCentersToTextFile('init.txt')

# create EMClusteringMachine object with specified parameters
em = EM(X, clusters, maxIter=iterationsCount)

# perform clustering
em.fit()
# print info
print('Fit time: {}, clusters: {}'.format(em.fitTime, em.numCluster))

# export centers to 'centers.js'
em.exportCentersToTextFile('{}_cls.js'.format('log'))
# export points to 'points.js'
em.exportPointsToTextFile('{}_pts.js'.format('log'))
