from __future__ import division, print_function
import os
import time
import numpy as np
import geojson as json
from math import ceil
from geographiclib.geodesic import Geodesic

from routelib import route
from ClusteringMachine import ClusteringMachine
from InitMachine import getBounds, grid as makeGrid

from multiprocessing.dummy import Pool as ThreadPool
THREADS = 4
POOL = ThreadPool(processes=THREADS)

def asyncWorker(iterator, func, data=None):
    thread_list = []
    result = []
    for item in iterator:
        # create job for function
        thread = POOL.apply_async(func, (item, data))
        # add thread in list
        thread_list.append(thread)
    for thread in thread_list:
        # get result of job
        result.append(thread.get())
    return result

def dump(data, filename):
    try:
        with open(filename, 'w') as file_:
            json.dump(data, file_)
    except IOError as e:
        print('{}'.format(e))

class KMeans():
    maxIter = None
    clusterCenters = None
    labels = None
    population = None
    route = None

    def __init__(self, maxIter, stations):
        self.maxIter = maxIter
        self.stations = stations
        self.route = route()

    def dist(self, a, b):
        r = self.route.route_distance(a, b)
        return r

    def closer(self, a):
        b = a
        return b

    def geodist(self, a, b):
        r = Geodesic.WGS84.Inverse(a[0], a[1], b[0], b[1])['s12']
        return r

    def tab_dist(self, a, b):
        #a = np.where(self.X == a)
        #b = np.where(self.X == b)
        r = self.table[a][b]
        return r

    def stop(self, iter, old, new, lold, lnew):
        if iter >= self.maxIter:
            return True
        return np.array_equal(old, new) or np.array_equal(lold, lnew)

    def cloop(self, i, j):
        return (self.dist(self.X[i], self.C[j]), j)

    def xloop(self, i, _=None):
        # calculate distance between point and all the clusters centers
        D = list(map(lambda j: self.cloop(i, j), range(self.c_len)))
        # D = list(POOL.map(lambda j: self.cloop(i, j), range(self.c_len)))
        # sort distances ascending
        D.sort(key=lambda x: x[0])
        # pick number of cluster, which center has the smallest
        # distance to point
        m = D[0][1]
        # set label of point
        self.L[i] = self.C[m][2]
        self.P[m] += 1
        self.A[m] = np.append(self.A[m], [self.X[i]], axis=0)

    def fit(self, X, C):
        self.route.start()
        # set initial parameters
        iteration = 0
        c_old = None
        l_old = None
        # get length of lists
        self.c_len = len(C)
        self.x_len = len(X)
        bnds = getBounds(X)
        # size = max(self.geodist(leto, rito), self.geodist(ribo, rito))
        size = max(self.geodist(bnds[2:0:-1], bnds[2:5]), self.geodist(bnds[::3], bnds[2:5]))
        size = ceil(size / 50)

        grid = np.delete(makeGrid([size, size], getBounds(X)), 2, 1)
        table = np.append(X, grid, axis=0)
        print('Now {} points will be clustering to {} clusters using grid {g}x{g}'.format(self.x_len, self.c_len, g=size))

        self.L = np.empty([self.x_len])
        self.C = C
        self.X = X
        self.P = None
        self.A = None

        print('calculating metric! please wait...')
        self.table = self.route.make_table(table)
        self.route.stop()
        np.savetxt('table-no-fix.txt', self.table, fmt='%13.5f')
        print('tabulating metric! please wait...')
        fixed = 0
        with open('false.txt', 'w') as tf:
            for x in range(len(X)):
                for z in range(x + 1, len(X)):
                    for y in range(x + 1, len(X)):
                        if y != z:
                            xy = self.tab_dist(x, y)
                            xz = self.tab_dist(x, z)
                            yz = self.tab_dist(y, z)
                            xyz = round(xy + yz, 5)
                            if xyz < xz:
                                tf.write('{}-{}-{}: xy={:.5f}, yz={:.5f}, xz={:.5f}, xyz={:.5f}\n'.format(x, y, z, xy, yz, xz, xyz))
                                fixed += 1
                            self.table[x][z] = xyz
                            self.table[z][x] = self.table[x][z]
        np.savetxt('table.txt', self.table, fmt='%13.5f')
        exit()
        # while clustering isn't completed
        while not self.stop(iteration, c_old, self.C, l_old, self.L):
            time_start = time.time()
            # reset population in clusters
            self.P = np.zeros([self.c_len])
            # show iteration number
            print('Iteration {}'.format(iteration + 1))
            # create empty python array
            # each item will contain all the points belongs to specific cluster
            self.A = [np.empty([0, 2]) for i in range(self.c_len)]
            # for each point
            print('  assigning points')
            l_old = np.array(self.L)
            res = asyncWorker(range(self.x_len), self.xloop)
            # equate the previous and current centers of clusters
            c_old = self.C

            path = 'log'
            if not (os.path.exists(path)):
                os.makedirs(path)
            cc = self.C
            cc = list(map(lambda x, y: (np.append(x, y)).tolist(), cc, self.P))
            filename = '{}/r_centers_{}.js'.format(path, iteration + 1)
            dump(cc, filename)
            xc = self.X
            xc = list(map(lambda x, y: (np.append(x, y)).tolist(), xc, self.L))
            filename = '{}/r_points_{}.js'.format(path, iteration + 1)
            dump(xc, filename)

            # array for calculated centers of clusters
            mu = np.empty([self.c_len, 3], dtype='object')

            print('\n  calculating new centers')
            # for each cluster
            i = 0
            while i < self.c_len:
                # if it contains points
                if self.P[i] != 0:
                    # calculate center of cluster
                    k = np.array(np.round(np.mean(self.A[i], axis=0), decimals=5), dtype='object')
                    mu[i] = np.append(k, i)
                else:
                    d = np.round(self.C[i][:2].astype(np.double), decimals=5)
                    mu[i] = np.append(d.astype(np.object), i)
                i += 1
            if self.stations:
                print('  locating centers on roadmap')
                for c in range(self.c_len):
                    text = '      progress: {} / {}'.format(c + 1, self.c_len)
                    digits = len(text)
                    delete = '\r' * digits
                    print('{0}{1}'.format(delete, text), end='')
                    new = self.route.locate(mu[c][:2])
                    mu[c][0], mu[c][1] = new[0], new[1]
            print('  replacing old centers with new')
            # equate current centroids to calculated
            self.C = mu
            # increment iteration counter
            iteration += 1
            print('  iteration end:')
            iter_time = time.time() - time_start
            if iter_time > 86400:
                iter_time = '{:.4f} days'.format(iter_time / 86400)
            elif iter_time > 3600:
                iter_time = '{:.4f} hours'.format(iter_time / 3600)
            elif iter_time > 60:
                iter_time = '{:.4f} minutes'.format(iter_time / 60)
            else:
                iter_time = '{:.4f} seconds'.format(iter_time)
            print(' ' * 17 + '{}'.format(iter_time))
        # record results
        self.clusterCenters = self.C
        self.labels = self.L
        self.population = self.P
        self.route.stop()

class KMeansClusteringMachine(ClusteringMachine):
    def __init__(self, X, init, maxIter=100, stations=False):
        self.X = X
        self.clusterCenters = init
        self.clusterInstance = KMeans(maxIter=maxIter, stations=stations)

    def fit(self):
        t_start = time.time()
        # perform clustering
        self.clusterInstance.fit(self.X, self.clusterCenters)
        # calculate time
        self.fitTime = time.time() - t_start
        if self.fitTime > 86400:
            self.fitTime = '{:.4f} days'.format(self.fitTime / 86400)
        elif self.fitTime > 3600:
            self.fitTime = '{:.4f} hours'.format(self.fitTime / 3600)
        elif self.fitTime > 60:
            self.fitTime = '{:.4f} minutes'.format(self.fitTime / 60)
        else:
            self.fitTime = '{:.4f} seconds'.format(self.fitTime)
        # get points labels
        self.labels = self.clusterInstance.labels
        # get clusters population
        self.population = self.clusterInstance.population
        # get cluster centers
        self.clusterCenters = self.clusterInstance.clusterCenters
        # get clusters number
        self.numCluster = len(np.unique(self.labels))
