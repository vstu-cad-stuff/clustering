from __future__ import division, print_function
import os
import time
import numpy as np
from scipy.spatial import ConvexHull
import geojson as json
from math import ceil, floor
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

def inline_print(text, endwith='\r'):
    print('{}{}'.format(text, '\033[K'), end=endwith)

def time_readable(time_int):
    if time_int > 86400:
        return '{:.4f} days'.format(time_int / 86400)
    elif time_int > 3600:
        return '{:.4f} hours'.format(time_int / 3600)
    elif time_int > 60:
        return '{:.4f} minutes'.format(time_int / 60)
    else:
        return '{:.4f} seconds'.format(time_int)

def jarvis(x):
    def rotate(a, b, c):
        return (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1])

    n = len(x)
    p = list(range(n))
    for i in range(1,n):
        if x[p[i]][1] < x[p[0]][1]:
            p[i], p[0] = p[0], p[i]
    h = [p[0]]
    del p[0]
    p.append(h[0])
    while True:
        right = 0
        for i in range(1, len(p)):
            if rotate(x[h[-1]], x[p[right]], x[p[i]]) < 0:
                right = i
        if p[right] == h[0]:
            break
        else:
            h.append(p[right])
            del p[right]
    return x[h]

def inside(point, hull):
    result = False
    j = hull[-1]
    for k in hull:
        if ((k[0] > point[0]) != (j[0] > point[0])) and (point[1] < (j[1] - k[1]) * (point[0] - k[0]) / (j[0] - k[0]) + k[1]):
            result = not result
        j = k
    return result

class EM():
    maxIter = None
    clusterCenters = None
    labels = None
    population = None
    route = None

    def __init__(self, maxIter, distances, table):
        self.maxIter = maxIter
        self.route = route()
        if distances:
            self.dist_table = np.loadtxt(distances)
        else:
            self.dist_table = None
        if table:
            self.table = np.loadtxt(table)
        else:
            self.table = None

    def dist(self, a, b):
        r = self.route.route_distance(a, b)
        return r

    def closer(self, a):
        idx = self.table - a
        idx = list(map(lambda x: x[0] + 1j * x[1], idx))
        idx = np.abs(np.array(idx)).argmin()
        return self.table[idx]

    def geodist(self, a, b):
        r = Geodesic.WGS84.Inverse(a[0], a[1], b[0], b[1])['s12']
        return r

    def index(self, a):
        a = np.where(self.table == a)[0]
        a = max(zip(*np.unique(a, return_counts=True)), key=lambda x: x[1])[0]
        return a

    def tab_dist(self, a, b):
        r = self.dist_table[a][b]
        return r

    def stop(self, iter, old, new, lold, lnew):
        if iter >= self.maxIter:
            return True
        return np.array_equal(old, new) or np.array_equal(lold, lnew)

    def cloop(self, i, j):
        return (self.tab_dist(self.X[i], self.index(self.C[j][:2])), j)

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
        self.A[m] = np.append(self.A[m], [self.table[i]], axis=0)

    def fit(self, X, C, path):
        # set initial parameters
        iteration = 0
        c_old = None
        l_old = None
        # get length of lists
        self.c_len = len(C)
        self.x_len = len(X)

        if not (os.path.exists(path)):
            os.makedirs(path)

        if self.table is None:
            # get grid size
            print('Searching for bounds of points set...')
            bnds = getBounds(X)
            size_x, size_y = self.geodist(bnds[2:0:-1], bnds[2:5]), self.geodist(bnds[::3], bnds[2:5])
            size_x, size_y = list(map(lambda x: int(ceil(x / 50)), [size_x, size_y]))
            print('  Done. Size of grid: {}x{}'.format(size_x, size_y))
            print('Making grid...')
            grid = np.delete(makeGrid([size_x, size_y], getBounds(X), round_=5), 2, axis=1)
            np.savetxt('{}/G.txt'.format(path), grid)
            print('  Done. Number of elements: {}'.format(len(grid)))
            print('Calculating convex hull...')
            outside = []
            hull = ConvexHull(X)
            hull = hull.points[hull.vertices]
            np.savetxt('{}/X.txt'.format(path), hull)
            print('  Done.')
            print('Looking for outside elements...')
            for i, j in enumerate(grid):
                if not inside(j, hull):
                    outside.append(i)
            grid = np.delete(grid, outside, axis=0)
            print('  Done. Number of elements was reduced to {}'.format(len(grid)))
            print('Removing duplicates...')
            grid = np.vstack({tuple(row) for row in grid}) # this deletes dublicates
            print('  Done. Final number of elements: {}'.format(len(grid)))
            self.table = np.append(X, grid, axis=0)
            np.savetxt('{}/table.txt'.format(path), self.table)
            print('Now {} points will be clustering to {} clusters using additional {} elements'.format(self.x_len, self.c_len, len(grid)))
        else:
            print('Now {} points will be clustering to {} clusters'.format(self.x_len, self.c_len))

        self.L = np.empty([self.x_len])
        self.P = None
        self.A = None

        if self.dist_table is None:
            print('Calculating metric...')
            self.route.start()
            self._lx = len(self.table)
            self._cm = {'percent': 0,
                        'completed': 0,
                        'all': self._lx ** 2,
                        'last': -1,
                        'time_one': 0.007,
                        'left': 0}
            self.dist_table = np.zeros([self._lx, self._lx])

            def i_loop(i, _=None):
                for j in range(i + 1, self._lx):
                    self.dist_table[i][j] = self.route.route_distance(self.table[i], self.table[j])
                    self.dist_table[j][i] = self.dist_table[i][j]
                    self._cm['completed'] += 2

                    self._cm['percent'] = floor(self._cm['completed'] / self._cm['all'] * 1000) / 10
                    if self._cm['percent'] != self._cm['last']:
                        self._cm['left'] = round(self._cm['all'] - self._cm['completed']) * self._cm['time_one'] # approx time left
                        inline_print('  {}% ({} / {}; estimated time: {})'.format(self._cm['percent'], self._cm['completed'], self._cm['all'], time_readable(self._cm['left'])))
                        self._cm['last'] = self._cm['percent']

            res = asyncWorker(range(self._lx), i_loop)
            print('  100% ({a} / {a})  Done.\033[K'.format(a=self._cm['all']))
            self.route.stop()
            print('Tabulating metric...')
            self._fixed = 0
            def yz_loop(x, _):
                for z in range(x + 1, self.x_len):
                    for y in range(x + 1, self.x_len):
                        if y != z:
                            xy = self.tab_dist(x, y)
                            xz = self.tab_dist(x, z)
                            yz = self.tab_dist(y, z)
                            xyz = round(xy + yz, 5)
                            if xyz < xz:
                                self._fixed += 1
                                self.dist_table[x][z] = xyz
                                self.dist_table[z][x] = self.dist_table[x][z]
            res = asyncWorker(range(self.x_len - 1), yz_loop)
            np.savetxt('{}/distances.txt'.format(path), self.dist_table, fmt='%13.5f')
            print('  Done. Fixed distances: {}'.format(self._fixed))

        # replace all points with their place in table
        self.X = list(range(len(X)))
        # finding closest points to cluster centers
        i = C[:, 2]
        C = np.array(list(map(lambda x: self.closer(x), C[:, :2])))
        self.C = np.append(C, np.reshape(i, (i.shape[0], 1)), axis=1)
        # while clustering isn't completed
        while not self.stop(iteration, c_old, self.C, l_old, self.L):
            time_start = time.time()
            # reset population in clusters
            self.P = np.zeros([self.c_len])
            # show iteration number
            print('Iteration {}:'.format(iteration + 1))
            # create empty python array
            # each item will contain all the points belongs to specific cluster
            self.A = [np.empty([0, 2]) for i in range(self.c_len)]
            # for each point
            print('  assigning points...')
            l_old = np.array(self.L)
            res = asyncWorker(range(self.x_len), self.xloop)
            # equate the previous and current centers of clusters
            c_old = self.C

            cc = self.C
            cc = list(map(lambda x, y: (np.append(x, y)).tolist(), cc, self.P))
            filename = '{}/r_centers_{}.js'.format(path, iteration + 1)
            dump(cc, filename)
            xc = X
            xc = list(map(lambda x, y: (np.append(x, y)).tolist(), xc, self.L))
            filename = '{}/r_points_{}.js'.format(path, iteration + 1)
            dump(xc, filename)

            # array for calculated centers of clusters
            mu = np.empty([self.c_len, 3], dtype='object')

            print('  calculating new centers...')
            # for each cluster
            i = 0
            while i < self.c_len:
                # if it contains points
                if self.P[i] != 0:
                    # calculate center of cluster
                    k = np.array(np.round(np.mean(self.A[i], axis=0).astype(np.double), decimals=6), dtype='object')
                    mu[i] = np.append(k, i)
                else:
                    d = np.round(self.C[i][:2].astype(np.double), decimals=6)
                    mu[i] = np.append(d.astype(np.object), i)
                i += 1
            print('  replacing old centers with new...')
            # equate current centroids to calculated
            i = mu[:, 2]
            mu = np.array(list(map(lambda x: self.closer(x), mu[:, :2])))
            self.C = np.append(mu, np.reshape(i, (i.shape[0], 1)), axis=1)
            # increment iteration counter
            iteration += 1
            iter_time = time.time() - time_start
            iter_time = time_readable(iter_time)
            print('  iteration ended in {}\n'.format(iter_time))
        # record results
        self.iteration = iteration
        self.clusterCenters = self.C
        self.labels = self.L
        self.population = self.P

class EMClusteringMachine(ClusteringMachine):
    def __init__(self, X, clusters, maxIter=100, distances=None, table=None):
        self.X = X
        self.clusterCenters = clusters
        self.clusterInstance = EM(maxIter=maxIter, distances=distances, table=table)

    def fit(self):
        t_start = time.time()
        self.path = '{:04}-{:02}-{:02}_{:02}-{:02}-{:02}'
        lt = time.localtime()
        self.path = self.path.format(lt.tm_year, lt.tm_mon, lt.tm_mday, lt.tm_hour, lt.tm_min, lt.tm_sec)
        # perform clustering
        self.clusterInstance.fit(self.X, self.clusterCenters, path=self.path)
        # calculate time
        self.fitTime = time.time() - t_start
        self.fitTime = time_readable(self.fitTime)
        # get points labels
        self.labels = self.clusterInstance.labels
        # get clusters population
        self.population = self.clusterInstance.population
        # get cluster centers
        self.clusterCenters = self.clusterInstance.clusterCenters
        # get clusters number
        self.numCluster = len(np.unique(self.labels))
        self.iteration = self.clusterInstance.iteration
        self.all = self.clusterInstance._cm['all']
        self.approx = time_readable(self.all * 0.007)
