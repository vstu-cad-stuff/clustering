from DataCollector import DataCollector
from KMeansMachine import KMeansClusteringMachine

# create DataCollector object
dc = DataCollector()
# upload data from 'data.txt' file
dc.uploadFromTextFile('few.txt', delimiter=',')
# get data from dc object
X = dc.getData()

# create KMeansClusteringMachine object with specified parameters
km = KMeansClusteringMachine(X, init='file', filename='small.txt', max_iter=1000, log=True)
# perform clustering
km.fit('route')
# print info
print('Fit time: {}, clusters: {}'.format(km.fit_time, km.n_cluster))
# export init centers to 'k_init.txt'
# km.initM.exportCentersToTextFile('init.txt')
# export centers to 'centers.js'
km.exportCentersToTextFile('r_centers.js')
# export points to 'points.js'
km.exportPointsToTextFile('r_points.js')
