from DataCollector import DataCollector
from KMeansMachine import KMeansClusteringMachine as kmeans
from KMeansMachineTriangle import KMeansClusteringMachine as kmeans_triangle

USE_TRIANGLE_INEQUALITY = False
test = 'few' # full, few, common, river, railway
metric = 'route' # route, surface, euclid

datafile = 'data/data_{}_pts.txt'.format(test)
init = 'file'
filename = 'data/data_{}_cls.txt'.format(test)
log = test
max_iter = 50

# create DataCollector object
dc = DataCollector()
# upload data from 'data.txt' file
dc.uploadFromTextFile(datafile, delimiter=',')
# get data from dc object
X = dc.getData()

# create KMeansClusteringMachine object with specified parameters
if USE_TRIANGLE_INEQUALITY:
    km = kmeans_triangle(X, init=init, filename=filename, max_iter=max_iter, log=log)
else:
    km = kmeans(X, init=init, filename=filename, max_iter=max_iter, log=log)
# perform clustering
km.fit(metric)
# print info
print('Fit time: {}, clusters: {}'.format(km.fit_time, km.n_cluster))
# export init centers to 'k_init.txt'
# km.initM.exportCentersToTextFile('init.txt')
# export centers to 'centers.js'
#km.exportCentersToTextFile('small_cls.js')
# export points to 'points.js'
#km.exportPointsToTextFile('small_pts.js')
