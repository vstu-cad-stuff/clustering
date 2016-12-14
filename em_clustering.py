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

# ----------------------------------

import random as rnd
import json as json
import numpy as np
import os
from geodata import Geodata as Gd, Point as Pt, Cluster as Cl

# ============== Init ==============

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

def random(count, bounds):
    """ Initialize centers by random.

    Parameters
    ----------
    count : int
    bounds : array {bottom_border, left_border, top_border, right_border}
    """
    centers = np.array([Cl(rnd.uniform(bounds[0], bounds[2]), rnd.uniform(bounds[1], bounds[3]), i) for i in range(count)])
    return centers

def file(filename, params=[]):
    """ Initialize centers from file.

    Parameters
    ----------
    filename : int
        Specify source file name.
    params : list, default empty list
        Specifies types of points which will be loaded.
    """
    with open(filename, 'r') as file_:
        arr = json.load(file_)
    centers = np.empty((0), object)
    k = 0
    for i in arr:
        if str(i['type']) in params or params == []:
            lat, lon, id = float(i['lat']), float(i['lon']), k
            centers = np.append(centers, Cl(lat, lon, id, 0))
            k += 1
    return centers

# ============== Global ==============

def inline_print(previous, text):
    digits = len(previous)
    delete = '\r' * digits
    print('{}{}'.format(delete, text), end='')


def make_table(self, X):
    dim = len(X)
    percent = 0
    digits = 0
    last = -1
    time_one = 0.007
    from math import floor

    if self.osrm:
        self.table = np.zeros([dim, dim])
        for i in range(dim):
            for j in range(i + 1, dim):
                self.table[i][j] = self.route_distance(X[i], X[j])
                self.table[j][i] = self.table[i][j]
                completed = i * dim + j
                all = dim * dim
                percent = floor(completed / all * 1000) / 10
                left = round(((dim - i) ** 2 / 2 - i - (dim - j)) * time_one)

                text = '  {}% ({} / {}; estimated time: {}s)'.format(percent, completed, all, left)
                delete = '\r' * digits
                if percent != last:
                    last = percent
                    print('{0}{1}'.format(delete, text), end='')
                    digits = len(text)

        text = '  100% ({a} / {a})'.format(a=all)
        delete = '\r' * digits
        print('{0}{1}'.format(delete, text), end='')
    return self.table