from __future__ import division, print_function
from math import ceil, floor
import random as rnd
import os
import numpy as np
import json
import time
from geographiclib.geodesic import Geodesic
from multiprocessing.dummy import Pool as ThreadPool
from argparse import ArgumentParser
from geodata import Geodata as Gd, Point as Pt, Cluster as Cl
from routelib import Route

parser = ArgumentParser(description='EM clustering.')
parser.add_argument('-i', '--iteration', type=int, help='Iterations number.', default=100)
parser.add_argument('-c', '--clusters', nargs='+', help='Load clusters from file which name is the first argument.\n'
                          'If clusters should be load from specific points\' types, pass them to arguments after filename.')
parser.add_argument('-p', '--points', nargs='+', help='Load points from file which name is the first argument.\n'
                          'If points shouldn\'t be load from specific points\' types, pass them to arguments after filename.')#,
                          #required=True)
parser.add_argument('-r', '--random', type=int, nargs=1, help='Initialize clusters by uniform distribution of points. Argument is the number of clusters.')
parser.add_argument('-g', '--grid', type=int, nargs=2, help='Initialize clusters by grid. Arguments are numbers of columns and rows of grid.')
parser.add_argument('--threads', type=int, nargs=1, help='', default=4)

# ============== data files ==============

def load_file(filename, params=[]):
    with open(filename) as file_:
        arr = json.loads(file_.readlines()[0])
    data = [Pt(float(i['lat']), float(i['lon']), 0) for i in arr if i['type'] not in params]
    data = np.array(data)
    return data

def export_file(filename, data):
    fpath = os.path.dirname(filename)
    if not (os.path.exists(fpath)):
        os.makedirs(fpath)
    with open(filename, 'w') as file_:
        json.dump(data, file_)

# ============== init ==============

def get_bounds(points):
    """
    Returns
    -------
    bounds : array {bottom_border, left_border, top_border, right_border}
    """
    bounds = None
    # choose four coordinates
    # of different points as bounds:
    # most bottom, most left, most top, and most right
    b = min(map(lambda x: x.lat, p))
    l = min(map(lambda x: x.lon, p))
    t = max(map(lambda x: x.lat, p))
    r = max(map(lambda x: x.lon, p))
    bounds = [b, l, t, r]
    return bounds

def init_grid(grid, bounds):
    """ Initialize centers on grid.

    Parameters
    ----------
    grid : array {size_x, size_y}
    bounds : array {bottom_border, left_border, top_border, right_border}
    """
    xv = np.linspace(bounds[1], bounds[3], grid[0])
    yv = np.linspace(bounds[0], bounds[2], grid[1])
    
    i = (i for i in range(len(xv) * len(yv)))
    centers = np.array([Cl(x, y, next(i), 0) for x in xv for y in yv])

    return centers

def init_random(count, bounds):
    """ Initialize centers by random.

    Parameters
    ----------
    count : int
    bounds : array {bottom_border, left_border, top_border, right_border}
    """
    centers = np.array([Cl(rnd.uniform(bounds[0], bounds[2]), rnd.uniform(bounds[1], bounds[3]), i) for i in range(count)])
    return centers

def init_file(filename, params=[]):
    """ Initialize centers from file.

    Parameters
    ----------
    filename : str
    params : list, default empty list
    """
    with open(filename, 'r') as file_:
        arr = json.load(file_)
    arr = [i for i in arr if i['type'] not in params]
    data = [Cl(float(i['lat']), float(i['lon']), k, 0) for k, i in enumerate(arr)]
    data = np.array(data)
    return data

# ============== global ==============

args = parser.parse_args()

threads = args.threads
pool = ThreadPool(processes=threads)

route = Route()

path = str(time.time()).replace('.', '_')

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

def graham_scan(x):
    def rotate(a, b, c):
        return (b.lon - a.lon) * (c.lat - b.lat) - (b.lat - a.lat) * (c.lon - b.lon)
    
    lx = len(x) # число точек
    p = list(range(lx)) # список номеров точек
    for i in range(1, lx):
        if x[p[i]].lon < x[p[0]].lon: # если P[i]-ая точка лежит левее P[0]-ой точки
            p[i], p[0] = p[0], p[i] # меняем местами номера этих точек 
    for i in range(2, lx): # сортировка вставкой
        j = i
        while j > 1 and (rotate(x[p[0]], x[p[j - 1]], x[p[j]]) < 0): 
            p[j], p[j - 1] = p[j - 1], p[j]
            j -= 1
    s = [p[0], p[1]] # создаем стек
    for i in range(2, lx):
        while rotate(x[s[-2]], x[s[-1]], x[p[i]]) < 0:
            del s[-1] # pop(S)
        s.append(p[i]) # push(S,P[i])
    hull = [x[i] for i in s]
    return hull

def inside(p, h):
    result = False
    j = h[-1]
    for k in h:
        if ((k.lat > p.lat) != (j.lat > p.lat)) and (p.lon < (j.lon - k.lon) * (p.lat - k.lat) / (j.lat - k.lat) + k.lon):
            result = not result
        j = k
    return result
    
def inline_print(digits, text):
    delete = '\r' * digits
    print('{}{}'.format(delete, text), end='')
    return len(text)

def calculate_table(X):
    lx = len(X)
    percent = 0
    digits = 0
    last = -1
    time_one = 0.007
    table = np.zeros([lx, lx])
    completed = 0
    all = lx * lx

    def i_loop(i, _=None):
        for j in range(i + 1, lx):
            table[i][j] = route.distance(X[i], X[j])
            table[j][i] = table[i][j]
            completed += 2

            percent = floor(completed / all * 1000) / 10
            if percent != last:
                left = round(all - completed) * time_one # approx time left
                digits = inline_print(digits, '  {}% ({} / {}; estimated time: {}s)'.format(percent, completed, all, left))
                last = percent

    res = asyncWorker(range(lx), i_loop)
    inline_print(digits, '  100% ({a} / {a})'.format(a=all))
    return table
    
def closer(a, b):
    idx = np.array([i for i in b]) - a
    idx = list(map(lambda x: x.lat + 1j * x.lon, idx))
    idx = np.abs(np.array(idx)).argmin()
    return b[idx]

def geodist(a, b):
    r = Geodesic.WGS84.Inverse(a.lat, a.lon, b.lat, b.lon)['s12']
    return r
    
def index(a, table):
    a = np.where(table == a)[0][0]
    return a
        
def fit(X, C, I):
    dist_table = []
    def tab_dist(a, b):
        r = dist_table[a][b]
        return r

    def stop(iter, old, new):
        if iter >= I:
            return True
        return np.array_equal(old, new)
        
    def make_grid(size, bounds, decimals):
        xv = np.linspace(bounds[1], bounds[3], size[0])
        yv = np.linspace(bounds[0], bounds[2], size[1])

        grid = np.array([Pt(x, y, 0).round(decimals) for x in xv for y in yv])
        return grid
    
    lx = len(X)
    lc = len(C)
    iter = 0

    print('Searching for bounds of points set...')
    bnds = getBounds(X)
    # size = max(self.geodist(left-top, right-top), self.geodist(right-bottom, right-top))
    size_x, size_y = self.geodist(bnds[2:0:-1], bnds[2:5]), self.geodist(bnds[::3], bnds[2:5])
    size_x, size_y = map(lambda x: int(ceil(x / 50)), (size_x, size_y))
    print('  Done. Size of grid: {}x{}'.format(size_x, size_y))
    print('Making grid...')
    grid = make_grid([size_x, size_y], getBounds(X), 5)
    print('  Done. Number of elements: {}'.format(len(grid)))
    print('Finding unnecessary elements...')
    outside = []
    hull = graham_scan(X)
    for i, j in enumerate(grid):
        if not inside(j, hull):
            outside.append(i)
    grid = np.delete(grid, outside, axis=0)
    print('  Done. Number of elements was reduced to {}'.format(len(grid)))
    print('Removing duplicates...')
    grid = np.array(list(map(lambda x: Pt(x[0], x[1], 0), {tuple(row) for row in grid}))) # this deletes dublicates
    print('  Done. Final number of elements: {}'.format(len(grid)))
    table = np.append(X, grid, axis=0)
    np.savetxt('{}/table.txt'.format(path), table, fmt='%s')
    print('Now {} points will be clustering to {} clusters using additional {} elements'.format(lx, lc, len(grid)))

    self.L = np.empty([lx])
    self.P = None
    self.A = None

    print('Calculating metric...')
    dist_table = calculate_table(table)
    print('  Done.')
    print('Tabulating metric...')
    fixed = 0
    def yz_loop(x):
        for z in range(x + 1, lx):
            for y in range(x + 1, lx):
                if y != z:
                    xy = tab_dist(x, y)
                    xz = tab_dist(x, z)
                    yz = tab_dist(y, z)
                    xyz = round(xy + yz, 5)
                    if xyz < xz:
                        fixed += 1
                        dist_table[x][z] = xyz
                        dist_table[z][x] = dist_table[x][z]
    res = asyncWorker(range(lx - 1), yz_loop)
    np.savetxt('{}/distances.txt'.format(path), dist_table, fmt='%13.5f')
    print('  Done. Fixed distances: {}'.format(fixed))

    # replace all points with their place in table
    X_ = list(range(len(X)))
    # finding closest points to cluster centers
    i = list(map(C.cid))
    C = np.array(list(map(lambda x: list(closer(x), table), C[:, :2])))
    self.C = np.append(C, np.reshape(i, (i.shape[0], 1)), axis=1)
    # while clustering isn't completed
    while not self.stop(iteration, c_old, self.C, l_old, self.L):
        time_start = time.time()
        # reset population in clusters
        self.P = np.zeros([lc])
        # show iteration number
        print('Iteration {}:'.format(iteration + 1))
        # create empty python array
        # each item will contain all the points belongs to specific cluster
        self.A = [np.empty(0, dtype='object') for i in range(lc)]
        # for each point
        print('  assigning points...')
        l_old = np.array(self.L)
        res = asyncWorker(range(lx), self.xloop)
        for i in range(lx):
            # calculate distance between point and all the clusters centers
            distances = [(tab_dist(X[i], C[each]), each) for each in range(lc)]
            # sort distances ascending
            distances.sort(key=lambda x: x[0])
            # pick number of cluster, which center has the smallest
            # distance to point
            m = distances[0][1]
            # set label of point
            L[i] = C[m][2]
            P[m] += 1
            arrays[m] = np.append(arrays[m], [X[i]], axis=0)
        # equate the previous and current centers of clusters
        c_old = self.C

        cc = self.C
        cc = list(map(lambda x, y: (np.append(x, y)).tolist(), cc, self.P))
        filename = '{}/r_centers_{}.js'.format(path, iteration + 1)
        dump(cc, filename)
        xc = X
        xc = list(map(lambda x, y: (np.append(list(x), y)).tolist(), xc, self.L))
        filename = '{}/r_points_{}.js'.format(path, iteration + 1)
        dump(xc, filename)

        # array for calculated centers of clusters
        mu = np.empty([lc, 3], dtype='object')

        print('  calculating new centers...')
        # for each cluster
        i = 0
        while i < lc:
            # if it contains points
            if self.P[i] != 0:
                # calculate center of cluster
                k = np.array(np.round(np.mean(list(map(list, self.A[i])), axis=0).astype(np.double), decimals=6), dtype='object')
                mu[i] = np.append(k, i)
            else:
                d = np.round(self.C[i][:2].astype(np.double), decimals=6)
                mu[i] = np.append(d.astype(np.object), i)
            i += 1
        print('  replacing old centers with new...')
        # equate current centroids to calculated
        i = mu[:, 2]
        mu = np.array(list(map(lambda x: list(self.closer(x)), mu[:, :2])))
        self.C = np.append(mu, np.reshape(i, (i.shape[0], 1)), axis=1)
        # increment iteration counter
        iteration += 1
        iter_time = time.time() - time_start
        if iter_time > 86400:
            iter_time = '{:.4f} days'.format(iter_time / 86400)
        elif iter_time > 3600:
            iter_time = '{:.4f} hours'.format(iter_time / 3600)
        elif iter_time > 60:
            iter_time = '{:.4f} minutes'.format(iter_time / 60)
        else:
            iter_time = '{:.4f} seconds'.format(iter_time)
        print('  iteration ended in {}\n'.format(iter_time))
    # record results
    self.clusterCenters = self.C
    self.labels = self.L
    self.population = self.P

# ============== main ==============

if __name__ == '__main__':
    max_iter = args.iteration
    
    file_, params = args.points[0], args.points[1:]
    X = load_file(file_, params=params)
        
    if args.random:
        bounds = get_bounds(X)
        clusters = init_random(count=args.random, bounds=bounds)
    elif args.grid:
        bounds = get_bounds(X)
        clusters = init_grid(grid=args.grid, bounds=bounds)
    elif args.clusters:
        file_, params = args.clusters[0], args.clusters[1:]
        clusters = init_file(filename=file_, params=params)
    
    if not (os.path.exists(path)):
        os.makedirs(path)
        
    result = fit(X, clusters, max_iter)
    print('Fit time: {}, clusters: {}. Saved in {}'.format(result['fitTime'], result['numCluster'], path))

    # export centers to 'centers.js'
    export_file('{}/cls.js'.format(path), clusters.tolist())
    # export points to 'points.js'
    export_file('{}/pts.js'.format(path), X.tolist())
