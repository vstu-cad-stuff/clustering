import subprocess
from argparse import ArgumentParser

parser = ArgumentParser(description='Control OSRM-routed server.')
parser.add_argument('-r', '--run', help='Start OSRM-routed server', action='store_true')
parser.add_argument('-s', '--stop', help='Stop OSRM-routed server', action='store_true')
parser.add_argument('-t', '--threads', help='', type=int, default=8)
parser.add_argument('-q', '--quiet', help='Hide console output', action='store_true')
parser.add_argument('--map', help='Select map file', nargs=1, default='~/map/map.osrm')
args = parser.parse_args()

if args.run and args.stop:
    parser.print_help()
    exit()
elif args.run:
    subprocess.Popen('osrm-routed {} -t {}'.format(args.map, args.threads),
                     stdout=subprocess.DEVNULL if args.quiet else None,
                     stderr=subprocess.STDOUT, shell=True)
elif args.stop:
    subprocess.Popen(['pkill', 'osrm-routed'])
else:
    parser.print_help()
    exit()
