from argparse import ArgumentParser

parser = ArgumentParser(description='EM clustering.')
parser.add_argument('-i', '--iteration', type=int, help='Iterations number.', default=100)
parser.add_argument('-c', '--clusters', nargs='+', help='Load clusters from file which name is the first argument.\n'
                          'If clusters should be load from specific points\' types, pass them to arguments after filename.')
parser.add_argument('-p', '--points', nargs='+', help='Load points from file which name is the first argument.\n'
                          'If points shouldn\'t be load from specific points\' types, pass them to arguments after filename.')
parser.add_argument('-t', '--table', nargs=1, help='Load metric table from specified file.')
parser.add_argument('-r', '--random', type=int, nargs=1, help='Initialize clusters by uniform distribution of points. Argument is the number of clusters.')
parser.add_argument('-g', '--grid', type=int, nargs=2, help='Initialize clusters by grid. Arguments are numbers of columns and rows of grid.')
parser.add_argument('-d', '--distances', nargs=1, help='Load metric distances table from specified file.')
parser.add_argument('--threads', type=int, nargs=1, help='', default=4)

# ============== imports ==============

from __future__ import division, print_function
from math import ceil, floor
import random as rnd
import os
import numpy as np
import json
from geographiclib.geodesic import Geodesic
from multiprocessing.dummy import Pool as ThreadPool
from geodata import Geodata as Gd, Point as Pt, Cluster as Cl
from routelib import Route

# ============== data files ==============

def load_file(filename, params=[]):
    with open(filename) as file_:
        arr = json.loads(file_.readlines()[0])
    data = [Pt(float(i['lat']), float(i['lon']), 0) for i in arr if i['type'] not in params]
    data = np.array(data)
    return data

def export_file(filename, data):
    path = os.path.dirname(filename)
    if not (os.path.exists(path)):
        os.makedirs(path)
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

    centers = np.array([Cl(x, y, i, 0) for x in xv for y in yv for i in range(len(xv) * len(yv))])

    return centers

def init_rnd(count, bounds):
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

def inline_print(digits, text):
    delete = '\r' * digits
    print('{}{}'.format(delete, text), end='')
    return len(text)

def make_table(X):
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
                left = round(all - completed) * time_one) # approx time left
                digits = inline_print(digits, '  {}% ({} / {}; estimated time: {}s)'.format(percent, completed, all, left))
                last = percent

    res = asyncWorker(range(lx), i_loop)
    inline_print(digits, '  100% ({a} / {a})'.format(a=all))
    return table

# ============== main ==============

if __name__ == '__main__':

    X = None
    labels = None
    population = None
    clusterCenters = None
    numCluster = None
    clusterInstance = None
    fitTime = 0
