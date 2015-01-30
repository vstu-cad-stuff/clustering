// reload page if error while loading js-libraries
function reload() {
  window.location.reload();
}

// show div with error description
if (error) {
  document.getElementById("error").style.visibility = "visible";
}

/* extend leaflet Map for opening multiple popups
   at the same time */
L.Map = L.Map.extend({
  openPopup: function(popup) {
    this._popup = popup;
    return this.addLayer(popup).fire('popupopen', {
      popup: this._popup
    });
  }
});


/* extend leaflet CircleMarker for binding origin
   and destination markers together. Also add option
   for binding Marker with Layer in which it was created
   (was made for easy deletion of markers) */   
L.CircleMarker = L.CircleMarker.extend({
   options: { 
      pair: 0,
      layer: 0
   }
});

/* creating map; turning off closing popups on click:
   we'll do it ourselves */
var map = L.map('map', {closePopupOnClick: false}).
  setView([48.7819, 44.7777], 14);
L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);
// binding function 'onClick' with map click event
map.on('click', onClick);

/* array for points. Structure of an element:
   [userID, orig_lat, orig_lon, dest_lat, dest_lon] */
var data = [];

// array of layers, needed for easy deletion and selection
var circles = [];
// layer for polyline, used in 'select' mode
var line = new L.FeatureGroup();
/* array of IDs of elements which has popup opened.
   Need this for closing all popups the same time */
var opened = [];

// current mode of work. Initial - 'select' mode
var type = 'select';
// points count, need for spray and uniform modes
var count = 20;
// true if we set destination point, false - origin ('points' mode)
var dest = false;
// uid - global variable for counting users, userid - string hex uid
var uid = -1, userid;
// first marker of couple
var first;

// on map click
function onClick(e) {
  // getting coordinates of click
  lat = e.latlng.lat;
  lon = e.latlng.lng;
  // doing stuff depending on work mode
  switch (type) {
    case 'select':
    case 'delete':
      /* if clicking on map in 'select' or 'delete' mode
         we should just close popups */
      close_popups();
      break;
    case 'points':
      /* if clicking on map in 'points' mode
         we should set origin or destination marker */
      // if setting origin point
      if (!dest) {
        // creating new layer for couple of points
        circles.push(new L.FeatureGroup());
        // getting userid for couple
        userid = get_userid();
        // creating origin CircleMarker
        circle = L.circleMarker([lat, lon], {
          color: 'red',
          radius: 5,
          // link to created layer
          layer: circles.length - 1
        }).addTo(map).bindPopup(userid + ' | ' +
          lat.toFixed(5) + '; ' + lon.toFixed(5));
        // next we'll set destination point
        dest = true;
        // remembering origin marker
        first = circle;
      // if setting destination point
      } else {
        // creating destination CircleMarker
        circle = L.circleMarker([lat, lon], {
          color: 'black',
          radius: 5,
          // link to created layer
          layer: circles.length - 1
        }).addTo(map).bindPopup(userid + ' | ' +
          lat.toFixed(5) + '; ' + lon.toFixed(5));
        // next we'll set new origin point
        dest = false;
        // writing origin-destination points to 'data' array
        data.push([userid,
          first._latlng.lat, first._latlng.lng,
          circle._latlng.lat, circle._latlng.lng]);
        // binding points together
        first.options.pair = circle._leaflet_id;
        circle.options.pair = first._leaflet_id;
      }
      // whatever point we may set, we should add click function to it
      circle.on('click', onCircleClick);
      // add marker to layer
      circles[circles.length - 1].addLayer(circle);
      // and draw it on map
      add();
      break;
    case 'spray':
      /* if clicking on map in 'spray' mode
         we should set 'count' / 2 of couples of
         origin and destination markers in an small area
         near click point */
      // parsing input for number
      count = parseInt(document.getElementById('count').value);
      // if wrong number set it to default
      if (isNaN(count) || count <= 0)
        count = 20;
      // if number is odd we'll increment it
      if (count % 2)
        count += 1;
      // showing number
      document.getElementById('count').value = count;
      
      // for each couple we
      for (i = 0; i < count / 2; i++) {
        // create new layer
        circles.push(new L.FeatureGroup());
        // getting userID
        userid = get_userid();
        // generate random coordinates for origin
        nlat = lat + (Math.random() - 0.5) * 0.01;
        nlon = lon + (Math.random() - 0.5) * 0.01;
        // creating origin marker
        first = L.circleMarker([nlat, nlon], {
          color: 'red',
          radius: 5,
          // link to created layer
          layer: circles.length - 1
        }).addTo(map).bindPopup(userid + ' | ' +
          nlat.toFixed(5) + '; ' + nlon.toFixed(5));
        // generate random coordinates for destination
        nlat = lat + (Math.random() - 0.5) * 0.01;
        nlon = lon + (Math.random() - 0.5) * 0.01;
        // creating destination marker
        circle = L.circleMarker([nlat, nlon], {
          color: 'black',
          radius: 5,
          // link to created layer
          layer: circles.length - 1
        }).addTo(map).bindPopup(userid + ' | ' +
          nlat.toFixed(5) + '; ' + nlon.toFixed(5));
        // writing couple to 'data' array
        data.push([userid,
          first._latlng.lat, first._latlng.lng,
          circle._latlng.lat, circle._latlng.lng]);
        // binding points together
        first.options.pair = circle._leaflet_id;
        circle.options.pair = first._leaflet_id;
        // adding markers to layer
        circles[circles.length - 1].addLayer(first).addLayer(circle);
        // adding click function to markers
        first.on('click', onCircleClick);
        circle.on('click', onCircleClick);
      }
      // draw markers
      add();
      break;
    case 'random':
      /* if clicking on map in 'random' mode
         we should set 'count' / 2 of couples of
         origin and destination markers in a bounding
         box of a map on screen */
      // parsing input for number
      count = parseInt(document.getElementById('count').value);
      // if wrong number set it to default
      if (isNaN(count) || count <= 0)
        count = 20;
      // if number is odd we'll increment it
      if (count % 2)
        count += 1;
      // showing number
      document.getElementById('count').value = count;
      
      // getting map bounds on screen
      bounds = [
        map.getBounds()._southWest.lat,  // min latitude
        map.getBounds()._northEast.lat,  // max latitude
        map.getBounds()._southWest.lng,  // min longitude
        map.getBounds()._northEast.lng]; // max longitude
      // for each couple we
      for (i = 0; i < count / 2; i++) {
        // create new layer
        circles.push(new L.FeatureGroup());
        // getting userID
        userid = get_userid();
        // generate random coordinates for origin
        nlat = bounds[0] + Math.random() * (bounds[1] - bounds[0]);
        nlon = bounds[2] + Math.random() * (bounds[3] - bounds[2]);
        // creating origin marker
        first = L.circleMarker([nlat, nlon], {
          color: 'red',
          radius: 5,
          // link to created layer
          layer: circles.length - 1
        }).addTo(map).bindPopup(userid + ' | ' +
          nlat.toFixed(5) + '; ' + nlon.toFixed(5));
        // generate random coordinates for destination
        nlat = bounds[0] + Math.random() * (bounds[1] - bounds[0]);
        nlon = bounds[2] + Math.random() * (bounds[3] - bounds[2]);
        // creating destination marker
        circle = L.circleMarker([nlat, nlon], {
          color: 'black',
          radius: 5,
          // link to created layer
          layer: circles.length - 1
        }).addTo(map).bindPopup(userid + ' | ' +
          nlat.toFixed(5) + '; ' + nlon.toFixed(5));
        // writing couple to 'data' array
        data.push([userid,
          first._latlng.lat, first._latlng.lng,
          circle._latlng.lat, circle._latlng.lng]);
        // binding points together
        first.options.pair = circle._leaflet_id;
        circle.options.pair = first._leaflet_id;
        // adding markers to layer
        circles[circles.length - 1].addLayer(first).addLayer(circle);
        // adding click function to markers
        first.on('click', onCircleClick);
        circle.on('click', onCircleClick);
      }
      // draw markers
      add();
      break;
  }
}

// on circleMarker click
function onCircleClick(e) {
  // doing stuff depending on work mode
  switch (type) {
    case 'select':
      /* in 'select' mode we show line between origin and
         destination markers, also open their popups */
      /* if map already has drawn line and opened popups,
          we should remove them */
      close_popups();
      // clearing line layer
      line = new L.FeatureGroup();
      // opening popup for clicked marker
      map._layers[e.target._leaflet_id].openPopup();
      // and it's pair
      map._layers[e.target.options.pair].openPopup();
      // adding IDs of elements with opened popups to 'opened' array
      opened.push(e.target._leaflet_id);
      opened.push(e.target.options.pair);
      
      /* if clicked marker is origin marker
         (I just don't wanted to add another option
          to circleMarker, yep) */
      if (e.target.options.color == 'red') {
        origin = e.target;
        destin = map._layers[e.target.options.pair];
      // if clicked marker is destination marker
      } else {
        destin = e.target;
        origin = map._layers[e.target.options.pair];
      }
      
      // creating line between markers
      polyline = L.polyline([origin._latlng, destin._latlng],
        {color: 'blue'});
      // adding it to 'line' layer
      line.addLayer(polyline);
      // creating "arrow" symbols on line
      decorator = L.polylineDecorator([origin._latlng, destin._latlng],
        {patterns: [{
          offset: 25,
          repeat: 100,
          symbol: L.Symbol.arrowHead({
            pixelSize: 15,
            pathOptions: {fillOpacity: 1, weight: 0}
            })
          }]
        });
      // adding them to 'line' layer
      line.addLayer(decorator);
      // draw 'line' layer
      map.addLayer(line);
      break;
    case 'delete':
      /* in 'delete' mode we delete couple of markers
         and layer contained them on one of markers click */
      remove();
      delete circles[e.target.options.layer];
      add();
      break;
  }
}

// on toolbar's element click
function select(option) {
  // setting work mode
  type = option;
  // pre-re-draw map
  remove();
  // doing stuff depending on work mode
  switch (type) {
    case 'select':
      /* if we choose 'select' mode
         we should look for 'points' mode complete:
         'dest' must be false */
      if (dest) {
        circles.pop(); // deleting layer created for couple of origin-destination points
        dest = false;
      }
      { // html changing
        document.getElementById('input').style.visibility = 'hidden';
        document.getElementById('select').className = 'first selected';
        document.getElementById('points').className = '';
        document.getElementById('spray').className = '';
        document.getElementById('random').className = '';
        document.getElementById('delete').className = '';
      }
      break;
    case 'points':
      /* if we choose 'points' mode
         we should do nothing, just change elements classNames */
      { // html changing
        document.getElementById('input').style.visibility = 'hidden';
        document.getElementById('select').className = 'first';
        document.getElementById('points').className = 'selected';
        document.getElementById('spray').className = '';
        document.getElementById('random').className = '';
        document.getElementById('delete').className = '';
      }
      break;
    case 'spray':
      /* if we choose 'spray' mode
         we should look for 'points' mode complete:
         'dest' must be false */
      if (dest) {
        circles.pop(); // deleting layer created for couple of origin-destination points
        dest = false;
      }
      { // html changing
        document.getElementById('input').style.visibility = 'visible';
        document.getElementById('count').value = count;
        document.getElementById('select').className = 'first';
        document.getElementById('points').className = '';
        document.getElementById('spray').className = 'selected';
        document.getElementById('random').className = '';
        document.getElementById('delete').className = '';
      }
      break;
    case 'random':
      /* if we choose 'random' mode
         we should look for 'points' mode complete:
         'dest' must be false */
      if (dest) {
        circles.pop(); // deleting layer created for couple of origin-destination points
        dest = false;
      }
      { // html changing
        document.getElementById('input').style.visibility = 'visible';
        document.getElementById('count').value = count;
        document.getElementById('select').className = 'first';
        document.getElementById('points').className = '';
        document.getElementById('spray').className = '';
        document.getElementById('random').className = 'selected';
        document.getElementById('delete').className = '';
      }
      break;
    case 'delete':
      /* if we choose 'delete' mode
         we should look for 'points' mode complete:
         'dest' must be false */
      if (dest) {
        circles.pop(); // deleting layer created for couple of origin-destination points
        dest = false;
      }
      { // html changing
        document.getElementById('input').style.visibility = 'hidden';
        document.getElementById('select').className = 'first';
        document.getElementById('points').className = '';
        document.getElementById('spray').className = '';
        document.getElementById('random').className = '';
        document.getElementById('delete').className = 'selected';
      }
      break;
  }
  // re-draw map
  add();
  // close all popups
  close_popups();
}

function remove() {
  // for re-drawing markers we'll remove all layers from map
  for (i in circles)
    map.removeLayer(circles[i]);
}

function add() {
  /* for re-drawing markers we'll add
     all layers from map after removing */
  for (i in circles)
    map.addLayer(circles[i]);
}

function close_popups() {
  // closing popups of each element in 'opened' array
  for (i in opened)
    map._layers[opened[i]].closePopup();
  // removing 'line' layer from map
  if (map.hasLayer(line))
    map.removeLayer(line);
  // we'd close all popups, no one is opened
  opened = [];
}

function save() {
  /* here will be save function */
}

function get_userid() {
  // increment global uid
  uid += 1;
  // if userID == '#ffffff', then reset it to 0
  if (uid == (1 << 24))
    uid = 0;
  // return userID
  return '#' + ('000000' + uid.toString(16)).slice(-6);
}
