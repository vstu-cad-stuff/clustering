from DataCollector import DataCollector
from KMeansMachine import KMeansClusteringMachine

datafile = 'data/few.txt'
init = 'file'
filename = 'data/small.txt'
log = 'few_small'
max_iter = 255
metric = 'route'

# create DataCollector object
dc = DataCollector()
# upload data from 'data.txt' file
dc.uploadFromTextFile(datafile, delimiter=',')
# get data from dc object
X = dc.getData()

# create KMeansClusteringMachine object with specified parameters
km = KMeansClusteringMachine(X, init=init, filename=filename, max_iter=max_iter, log=log)
# perform clustering
km.fit(metric)
# print info
print('Fit time: {}, clusters: {}'.format(km.fit_time, km.n_cluster))
# export init centers to 'k_init.txt'
# km.initM.exportCentersToTextFile('init.txt')
# export centers to 'centers.js'
km.exportCentersToTextFile('small_cls.js')
# export points to 'points.js'
km.exportPointsToTextFile('small_pts.js')
