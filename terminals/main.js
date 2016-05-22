var slidebar = document.getElementById('slidebar');
slidebar.setAttribute('onInput', 'draw()');

var map = L.map('map').setView([48.7941, 44.8009], 13);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var colors = [
    '#ff0000', '#906090', '#239837', '#000030', '#d2691e',
    '#ff69b4', '#20b2aa', '#1e90ff', '#006400', '#a0522d',
    '#1387a9', '#003000', '#808080', '#923999', '#48989e',
    '#b22222', '#20958a', '#800000', '#6b8e23', '#ba7478',
    '#008b8b', '#483d8b', '#8a2be2', '#ff00ff', '#7b68ee',
    '#654321', '#2e8b57', '#983490', '#a52a2a', '#ff8c00',
    '#4682b4', '#8748a8', '#b8860b', '#a9a9a9', '#808000',
    '#be8378', '#bf8949', '#cd5c5c', '#8b0000', '#123456',
    '#ff6347', '#228b22', '#389218', '#ba55d3', '#00008b',
    '#ff7f50', '#708090', '#ba7ea7', '#405719', '#da70d6',
    '#556b2f', '#9400d3', '#ab477e', '#2f4f4f', '#fa8072',
    '#9a9a32', '#5f9ea0', '#101101', '#00a000', '#f08080',
    '#000080', '#ee82ee', '#9932cc', '#b72004', '#191970',
    '#4169e1', '#0987b3', '#696969', '#2e7a57', '#bd8747',
    '#ff1493', '#008080', '#498ba9', '#e9967a', '#8b4513',
    '#6a5acd', '#daa520', '#0000ff', '#394991', '#8b008b',
    '#000000', '#cd853f', '#778899', '#300000', '#800080',
    '#db7093', '#8387ba', '#ff4500', '#008000', '#0000a0',
    '#8c8f8f', '#d38887', '#a00000', '#bf883a', '#0000cd',
    '#89390a', '#73287a', '#ba8910', '#9370db', '#c71585',
    '#bc8f8f', '#4b0082', '#dc143c', '#6495ed', '#800850'
];

Cluster = (function() {
    function Cluster(lat, lon, pop) {
        this.lat = lat;
        this.lon = lon;
        this.pop = pop;
    }

    Cluster.prototype.addHull = function(hull) {
        this.hull = hull;
    };

    return Cluster;
})();

TimeSlice = (function() {
    function TimeSlice(time, list) {
        this.time = time;
        this.clusters = list || [];
    }

    TimeSlice.prototype.addCluster = function(cluster, pos) {
        if (pos) {
            this.clusters[pos] = cluster;
        } else {
            this.clusters.push(cluster);
        }
    };

    return TimeSlice;
})();

Metric = (function() {
    function Metric(n, list) {
        this.name = n;
        this.times = list || [];
    }

    Metric.prototype.addTime = function(time) {
        this.times.push(time);
    };

    Metric.prototype.init = function(c, p) {
        for (var t = 0; t < c.length; t++) {
            var time = new TimeSlice(t);

            for (var j in c[t]) {
                var lat         = c[t][j][0];
                var lon         = c[t][j][1];
                var id            = c[t][j][2];
                var pop         = c[t][j][3];
                var cluster = new Cluster(lat, lon, pop);
                time.addCluster(cluster, id);
            }

            for (j in p[t]) {
                var hull = p[t][j];
                var ctr    = p[t][j][0][2];
                time.clusters[ctr].addHull(hull);
            }

            this.addTime(time);
        }
    };

    return Metric;
})();

Test = (function() {
    function Test(n, list, view) {
        this.name = n;
        this.metrics = list || [];
        this.view = view || [map.getCenter(), map.getZoom()];
    }

    Test.prototype.addMetric = function(metric) {
        this.metrics.push(metric);
        this[metric.name] = metric;
    };

    Test.prototype.addView = function(view) {
        this.view = view;
    };

    Test.prototype.init = function(m_list) {
            for (var i = 0; i < m_list.length; i++) {
                m = new Metric(m_list[i][0]);
                m.init(m_list[i][1], m_list[i][2]);
                this.addMetric(m);
            }
    };

    return Test;
})();

var Common = new Test('common');
Common.init([['euclid', com_ec, com_ep], ['route', com_rc, com_rp], ['surface', com_sc, com_sp]]);
Common.addView([[48.7728, 44.7965], 14]);
var Railway = new Test('railway');
Railway.init([['euclid', rai_ec, rai_ep], ['route', rai_rc, rai_rp], ['surface', rai_sc, rai_sp]]);
Railway.addView([[48.798624, 44.777656], 15]);
var River = new Test('river');
River.init([['euclid', riv_ec, riv_ep], ['route', riv_rc, riv_rp], ['surface', riv_sc, riv_sp]]);
River.addView([[48.7717, 44.7262], 14]);
var Few = new Test('few');
Few.init([['euclid', few_ec, few_ep], ['route', few_rc, few_rp], ['surface', few_sc, few_sp]]);
Few.addView([[48.7941, 44.8009], 12]);
/*var Full = new Test('full');
Full.init([['euclid', ful_ec, ful_ep], ['route', ful_rc, ful_rp], ['surface', ful_sc, ful_sp]]);
Full.addView([[48.7941, 44.8009], 12]);*/

var current = [], circles;

change = function(test, mrc) {
    change_test = function(testc, metrc) {
        if (!testc)
            testc = current[0];
        if (current[0] != testc) {
            if (current[0]) {
                var obt = document.getElementById(current[0].name.slice(0, 3) +
                    'bt');
                obt.className = '';
            }
            var nbt = document.getElementById(testc.name.slice(0, 3) + 'bt');
            nbt.className = 'selected';
            current[0] = testc;
            if (metrc) {
                select(metrc)
            } else {
                select(current[1]);
            }
        }
    }

    switch (test) {
        case 'common':
            test = Common;
            break;
        case 'railway':
            test = Railway;
            break;
        case 'river':
            test = River
            break;
        case 'few':
            test = Few;
            break;
        case 'full':
            test = Full;
            break;
        default:
            test = current[0];
            break;
    }
    change_test(test, mrc);
    map.setView(test.view[0], test.view[1])
}

select = function(mic) {
    select_mic = function(metrc) {
        if (!metrc)
            metrc = current[1];
        if (current[1] != metrc) {
            if (current[1]) {
                var obt = document.getElementById(current[1].name.slice(0, 3) +
                    'bt');
                obt.className = '';
            }
            var nbt = document.getElementById(metrc.name.slice(0, 3) + 'bt');
            nbt.className = 'selected';
            current[1] = metrc;
            slidebar.max = current[1].times.length - 1;
            if (slidebar.value > slidebar.max) {
                slidebar.value = slidebar.max;
            }
        }
    };

    switch (mic) {
        case 'euc':
            mic = current[0]['euclid'];
            break;
        case 'rou':
            mic = current[0]['route'];
            break;
        case 'sur':
            mic = current[0]['surface'];
            break;
        default:
            mic = current[0][current[1].name];
            break;
    }
    select_mic(mic);
    draw();
};

draw = function() {
    if (map.hasLayer(circles)) map.removeLayer(circles);
    circles = new L.FeatureGroup();
    var clusters = current[1].times[slidebar.value].clusters;
    for (var k in clusters) {
        var lat = clusters[k].lat, lon = clusters[k].lon, pop = clusters[k].pop;
        if (clusters[k].pop > 0) {
            var h = clusters[k].hull.map(function (a) { return [a[0], a[1]] });
            var polygon = new L.polygon(h, {
                color: colors[k % colors.length],
                opacity: 0.6,
                fillOpacity: 0.2,
                weight: 2
            }).addTo(map).bindPopup('Population of cluster #' + k + ': ' + pop);

            var circle = new L.circleMarker([lat, lon], {
                    color: colors[k % colors.length],
                    radius: 3 + Math.pow(clusters[k].pop, 1 / 3) * 2,
                    opacity: 0.9,
                    fillOpacity: 0.5
                }).addTo(map).bindPopup('<b>Cluster #' + k + '</b> at ' +
                    lat + ', ' + lon + '<br />Has ' + pop + ' points');

            circles.addLayer(polygon);
            circles.addLayer(circle);
        }
    }

    map.addLayer(circles);
};
window.onload = function(e) {
    change('common', 'euc');
}