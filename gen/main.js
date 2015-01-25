function reload() {
  window.location.reload();
}

if (error) {
  document.getElementById("error").style.visibility = "visible";
}

// center of map
var lat = (bd[0] + bd[2]) / 2;
var lon = (bd[1] + bd[3]) / 2;

// open many popups at the same time
L.Map = L.Map.extend({
  openPopup: function(popup) {
    this._popup = popup;
    return this.addLayer(popup).fire('popupopen', {
      popup: this._popup
    });
  }
});

// create map
var map = L.map('map').setView([lat, lon], 13)    
L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
map.on('click', removeAll);

function Way(id, orig_lat, orig_lon, dest_lat, dest_lon) {
  this.userid = id;
  this.origin = [orig_lat, orig_lon];
  this.destin = [dest_lat, dest_lon];
  this.originMarker = createMarker(this.origin, 'origin', 'red', this.userid);
  this.destinMarker = createMarker(this.destin, 'destination', 'black', this.userid);
}

function createMarker(coord, label, color, userid) {
  marker = L.circleMarker(coord, {color: color, radius: 3}).addTo(map).bindPopup('<b>' +
    userid + '</b><br />' + label + '<br />' + coord[0] + ', ' + coord[1]);
  marker.on('click', onClick);
  return marker;
}

function onClick(e) {
  if (map.hasLayer(poly)) map.removeLayer(poly);
  poly = new L.FeatureGroup();
  for (i in d) {
    if (d[i].originMarker == e.target || d[i].destinMarker == e.target) {
      d[i].originMarker.openPopup();
      d[i].destinMarker.openPopup();
      polyline = L.polyline([d[i].origin, d[i].destin],
        {color: 'blue'});
      poly.addLayer(polyline);
      polylineDecorator = L.polylineDecorator([d[i].origin, d[i].destin], {
        patterns: [ {
          offset: 25,
          repeat: 100,
          symbol: L.Symbol.arrowHead({
            pixelSize: 15,
            pathOptions: {fillOpacity: 1, weight: 0}
            })
          }]
        });
      poly.addLayer(polylineDecorator);
    } else {
      d[i].originMarker.closePopup();
      d[i].destinMarker.closePopup();
    }
  }
  map.addLayer(poly);
}

function removeAll(e) {
  map.removeLayer(poly);
  poly = new L.FeatureGroup();
}

var poly = new L.FeatureGroup();
var d = [];
for (i in dt) {
  d[i] = new Way(dt[i][0], dt[i][1], dt[i][2], dt[i][3], dt[i][4]);
}
