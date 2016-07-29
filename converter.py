import json
import numpy as np
from argparse import ArgumentParser

def rotate(a, b, c):
    return (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1])

def jarvis(a):
    n = len(a)
    p = list(range(n))
    for i in range(1,n):
        if a[p[i]][1] < a[p[0]][1]:
            p[i], p[0] = p[0], p[i]
    h = [p[0]]
    del p[0]
    p.append(h[0])
    while True:
        right = 0
        for i in range(1, len(p)):
            if rotate(a[h[-1]], a[p[right]], a[p[i]]) < 0:
                right = i
        if p[right] == h[0]:
            break
        else:
            h.append(p[right])
            del p[right]
    return h

def hull(a, b):
    h = []
    for i in a:
        h.append(b[i])
    return h

def action(param_list):
    last = param_list['last']
    log = param_list['log']
    metric = param_list['metric']
    filecen = '{}_{}c.js'.format(log.replace('/', ''), metric[0])
    filepoi = '{}_{}p.js'.format(log.replace('/', ''), metric[0])

    centers = []
    hulls = []

    print('Processing {} {} {}...'.format(log, metric, last))

    File = open(filecen, 'w')
    File.write('{}_{}c = '.format(log[:3], metric[0]))
    for i in range(1, last + 1):
        filec = '{}/{}_centers_{}.js'.format(log, metric[0], i)
        with open(filec, 'r') as file_:
            center = json.load(file_)
            # print('readed c#' + str(i))
            centers.append(center)
    json.dump(centers, File)
    File.close()

    File = open(filepoi, 'w')
    File.write('{}_{}p = '.format(log[:3], metric[0]))
    for i in range(1, last + 1):
        filep = '{}/{}_points_{}.js'.format(log, metric[0], i)
        with open(filep, 'r') as file_:
            points = json.load(file_)
            # print('readed p#' + str(i))
        mx = int(max(map(lambda k: k[2], points))) + 1
        ps = [np.empty([0, 3]) for each in range(0, mx)]
        for j in points:
            b = int(j[2])
            ps[b] = np.append(ps[b], [j], axis=0)
        this_hulls = []
        for j in ps:
            try:
                # print('Calculating hull of {} points for cluster {}'.format(len(j), j[0][2]))
                h = hull(jarvis(j), j.tolist())
                # print('Found {} vertices'.format(len(h)))
                this_hulls.append(h)
            except IndexError:
                pass
        hulls.append(this_hulls)
    json.dump(hulls, File)
    File.close()

def actions(lists):
    for params in lists:
        action(params)

parser = ArgumentParser()
parser.add_argument('-m', '--metric', choices=['route', 'euclid', 'surface'], help='Used metric')
parser.add_argument('-l', '--last', type=int, help='Last iteration numer')
parser.add_argument('-f', '--folder', help='Folder with data')
parser.add_argument('-n', '--many', nargs='*', help='Multiple converts. Args order: folder1 metric1 last1 folder2 metric2 ...')

args = parser.parse_args()
if args.many:
    folders = args.many[::3]
    metrics = args.many[1::3]
    lasts = args.many[2::3]
    length = len(lasts)

    acts = []
    for i in range(length):
        last = int(lasts[i])
        fold = folders[i]
        metr = metrics[i]
        acts.append({'last': last, 'log': fold, 'metric': metr})

    actions(acts)
    if len(folders) > length:
        print('[warn] Number of args was not n*3')
else:
    last = args.last
    metr = args.metric
    fold = args.folder

    action({'last': last, 'log': fold, 'metric': metr})
