/* ---------- error showing ---------- */ {

// reload page if error while loading js-libraries
function reload() {
  window.location.reload();
}

// show div with error description
if (error) {
  document.getElementById("error").style.visibility = "visible";
}
/* ---------- ----- ------- ---------- */ }

/* ---------- marker icons ---------- */ {

// icon for non-separated point
var icon = L.icon({
  iconUrl: 'img/icon.png',
  shadowUrl: 'img/shadow.png',
  
  iconSize:     [16, 16],
  shadowSize:   [16, 16],
  iconAnchor:   [8, 8],
  shadowAnchor: [8, 8],
  popupAnchor:  [0, -5]
});

// icon for origin point
var origin = L.icon({
  iconUrl: 'img/origin.png',
  shadowUrl: 'img/shadow.png',
  
  iconSize:     [32, 32],
  shadowSize:   [32, 32],
  iconAnchor:   [16, 16],
  shadowAnchor: [16, 16],
  popupAnchor:  [0, -10]
});

// icon for destination point
var destination = L.icon({
  iconUrl: 'img/destination.png',
  shadowUrl: 'img/shadow.png',
  
  iconSize:     [32, 32],
  shadowSize:   [32, 32],
  iconAnchor:   [16, 16],
  shadowAnchor: [16, 16],
  popupAnchor:  [0, -10]
});
/* ---------- ------ ----- ---------- */ }

/* ---------- extending Leaflet templates ---------- */ {

/* extend Leaflet Marker:
   add option for binding Marker with Layer in which
   it was created (was made for undo actions),
   add option for binding Marker with it index in
   'points' array (was made for dragging points) */
L.Marker = L.Marker.extend({
   options: {
      layer: 0,
      point: 0,
      icon: icon
   }
});
/* ---------- --------- ------- --------- ---------- */ }

/* ---------- initializing all variables ---------- */ {

/* creating map; turning off closing popups on click:
   we'll do it ourselves */
var map = L.map('map', {closePopupOnClick: false}).
  setView([48.7819, 44.7777], 14);
L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);

/* array for couples of points. Structure of an element:
   [userID, first_lat, first_lng, second_lat, second_lng] */
var data = [];
/* array for points. Structure of an element:
   [point_lat, point_lng] */
var points = [];

// array of layers, needed for easy deletion and selection
var layers = [];

// current mode of work. Initial - 'select' mode
var work_mode = 'select';
// points count, need for spray and uniform modes
var count = 20;
// uid - global variable for counting users, userid - string hex uid
var uid = -1, userid;
// array of last actions
var last_actions = [];
/* ---------- ------------ --- --------- ---------- */ }

/* ---------- event handlers ---------- */ {

// on map click
function onClick(e) {
  // getting coordinates of click
  lat = e.latlng.lat;
  lng = e.latlng.lng;
  // doing stuff depending on work mode
  switch (work_mode) {
    /* ----- select mode ----- */
    /* ----- delete mode ----- */
    case 'select':
    case 'delete': {
      /* if clicking on map in 'select' or 'delete' mode
         we should close opened popup */
      map.closePopup();
      break; }
    /* ----- point mode ----- */
    case 'point': {
      /* if clicking on map in 'point' mode
         we should set origin or destination marker */
      // creating new layer for point
      layers.push(new L.FeatureGroup());
      // writing point to 'points' array
      points.push([lat, lng]);
      // creating origin Marker
      marker = L.marker([lat, lng], {
        draggable: 'true',
        // layer's index in 'layers' array
        layer: layers.length - 1,
        // point's index in 'points' array
        point: points.length - 1
      }).addTo(map).bindPopup(lat.toFixed(5) + '; ' + lng.toFixed(5));
      // whatever point we may set, we should add click function to it
      marker.on('click', onMarkerClick);
      marker.on('dragstart', onMarkerDragStart);
      marker.on('dragend', onMarkerDragEnd);
      // add marker to layer
      layers[layers.length - 1].addLayer(marker);
      last_actions.push(['add', layers.length - 1]);
      // and draw it on map
      map.addLayer(layers[layers.length - 1]);
      break; }
    /* ----- spray mode ----- */
    case 'spray': {
      /* if clicking on map in 'spray' mode
         we should set 'count' of points in an small area
         near click point */
      // parsing input for number
      count = parseInt(document.getElementById('count').value);
      // if wrong number set it to default
      if (isNaN(count) || count <= 0)
        count = 20;
      // showing number
      document.getElementById('count').value = count;
      
      // create new layer
      layers.push(new L.FeatureGroup());
      // for each point we
      for (i = 0; i < count; i++) {
        // generate random coordinates
        nlat = lat + (Math.random() - 0.5) * 0.01;
        nlng = lng + (Math.random() - 0.5) * 0.01;
        // writing point to 'points' array
        points.push([nlat, nlng]);
        // creating marker
        marker = L.marker([nlat, nlng], {
          draggable: 'true',
          // layer's index in 'layers' array
          layer: layers.length - 1,
          // point's index in 'points' array
          point: points.length - 1
        }).addTo(map).bindPopup(lat.toFixed(5) + '; ' + lng.toFixed(5));
        // adding click function to markers
        marker.on('click', onMarkerClick);
        marker.on('dragstart', onMarkerDragStart);
        marker.on('dragend', onMarkerDragEnd);
        // adding markers to layer
        layers[layers.length - 1].addLayer(marker);
      }
      last_actions.push(['add', layers.length - 1]);
      // draw markers
      map.addLayer(layers[layers.length - 1]);
      break; }
    /* ----- bounding box mode ----- */
    case 'bb': {
      /* if clicking on map in 'bb' mode
         we should set 'count' of points in a bounding
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
        
      // create new layer
      layers.push(new L.FeatureGroup());
      for (i = 0; i < count; i++) {
        // generate random coordinates
        nlat = bounds[0] + Math.random() * (bounds[1] - bounds[0]);
        nlng = bounds[2] + Math.random() * (bounds[3] - bounds[2]);
        // writing point to 'points' array
        points.push([nlat, nlng]);
        // creating marker
        marker = L.marker([nlat, nlng], {
          draggable: 'true',
          // layer's index in 'layers' array
          layer: layers.length - 1,
          // point's index in 'points' array
          point: points.length - 1
        }).addTo(map).bindPopup(lat.toFixed(5) + '; ' + lng.toFixed(5));
        // adding click function to markers
        marker.on('click', onMarkerClick);
        marker.on('dragstart', onMarkerDragStart);
        marker.on('dragend', onMarkerDragEnd);
        // adding markers to layer
        layers[layers.length - 1].addLayer(marker);
      }
      last_actions.push(['add', layers.length - 1]);
      // draw markers
      map.addLayer(layers[layers.length - 1]);
      break; }
    /* ----- polygon mode ----- */
    case 'poly': {
      /* if clicking on map in 'polygon' mode
         we should set vertex of polygon. Then, by clicking
         special button we fill it by 'count' points */
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
        
      // create new layer
      layers.push(new L.FeatureGroup());
      for (i = 0; i < count; i++) {
        // generate random coordinates
        nlat = bounds[0] + Math.random() * (bounds[1] - bounds[0]);
        nlng = bounds[2] + Math.random() * (bounds[3] - bounds[2]);
        // writing point to 'points' array
        points.push([nlat, nlng]);
        // creating marker
        marker = L.marker([nlat, nlng], {
          draggable: 'true',
          // layer's index in 'layers' array
          layer: layers.length - 1,
          // point's index in 'points' array
          point: points.length - 1
        }).addTo(map).bindPopup(lat.toFixed(5) + '; ' + lng.toFixed(5));
        // adding click function to markers
        marker.on('click', onMarkerClick);
        marker.on('dragstart', onMarkerDragStart);
        marker.on('dragend', onMarkerDragEnd);
        // adding markers to layer
        layers[layers.length - 1].addLayer(marker);
      }
      last_actions.push(['add', layers.length - 1]);
      // draw markers
      map.addLayer(layers[layers.length - 1]);
      break; }
  }
}

// on marker click
function onMarkerClick(e) {
  // doing stuff depending on work mode
  switch (work_mode) {
    case 'select':
      /* in 'select' mode we just open popup */
      // opening popup for clicked marker
      map._layers[e.target._leaflet_id].openPopup();
      break;
    case 'delete':
      /* in 'delete' mode we delete marker
         and layer contained it, if it has no more markers */
      var marker = e.target;
      var layer = marker.options.layer;
      // variable for last_actions array
      var temp = ['delete', [marker]];
      // remove marker from layer
      layers[layer].removeLayer(marker);
      // getting layer._layers properties
      var props = Object.getOwnPropertyNames(layers[layer]._layers);
      // if layer._layers does not have any properties
      if (!props.length) {
        // if we delete layer, add it to last_actions item
        temp[1].unshift(layers[layer]);
        // remove layer from the map
        map.removeLayer(layers[layer]);
        // and the 'layers' array
        delete layers[layer];
      }
      last_actions.push(temp);
      break;
  }
}

// on marker drag start
function onMarkerDragStart(e) {
  /* an easy protection from dragging markers in not 'select'
     work mode: equate new coordinates to old */
  if (work_mode != 'select') {
    var layer = e.target.options.layer;
    layers[layer].removeLayer(e.target);
    e.target._latlng.lat = points[e.target.options.point][0];
    e.target._latlng.lng = points[e.target.options.point][1];
    layers[layer].addLayer(e.target);
  }
}

// on marker drag end
function onMarkerDragEnd(e) {
  var marker = e.target;
  // getting new coordinates of marker
  var lat = marker._latlng.lat;
  var lng = marker._latlng.lng;
  last_actions.push(['move', points[marker.options.point], marker._leaflet_id]);
  // changing data in array
  points[marker.options.point] = [lat, lng];
  // binding new popup
  marker.bindPopup(lat.toFixed(5) + '; ' + lng.toFixed(5));
}
/* ---------- ----- -------- ---------- */ }

/* ---------- toolbar functions ---------- */ {
// on toolbar's element click
function select(option) {
  // setting work mode
  work_mode = option;
  // doing stuff depending on work mode
  switch (work_mode) {
    case 'select':
      { // html changing
        document.getElementById('input').style.visibility = 'hidden';
        document.getElementById('poly_sub').style.visibility = 'hidden';
        document.getElementById('select').className = 'selected';
        document.getElementById('point').className = '';
        document.getElementById('spray').className = '';
        document.getElementById('poly').className = '';
        document.getElementById('bb').className = '';
        document.getElementById('delete').className = '';
      }
      break;
    case 'point':
      { // html changing
        document.getElementById('input').style.visibility = 'hidden';
        document.getElementById('poly_sub').style.visibility = 'hidden';
        document.getElementById('select').className = '';
        document.getElementById('point').className = 'selected';
        document.getElementById('spray').className = '';
        document.getElementById('poly').className = '';
        document.getElementById('bb').className = '';
        document.getElementById('delete').className = '';
      }
      break;
    case 'spray':
      { // html changing
        document.getElementById('input').style.visibility = 'visible';
        document.getElementById('poly_sub').style.visibility = 'hidden';
        document.getElementById('count').value = count;
        document.getElementById('select').className = '';
        document.getElementById('point').className = '';
        document.getElementById('spray').className = 'selected';
        document.getElementById('poly').className = '';
        document.getElementById('bb').className = '';
        document.getElementById('delete').className = '';
      }
      break;
    case 'poly':
      { // html changing
        document.getElementById('input').style.visibility = 'visible';
        document.getElementById('poly_sub').style.visibility = 'visible';
        document.getElementById('count').value = count;
        document.getElementById('select').className = '';
        document.getElementById('point').className = '';
        document.getElementById('spray').className = '';
        document.getElementById('poly').className = 'selected';
        document.getElementById('bb').className = '';
        document.getElementById('delete').className = '';
      }
      break;
    case 'bb':
      { // html changing
        document.getElementById('input').style.visibility = 'visible';
        document.getElementById('poly_sub').style.visibility = 'hidden';
        document.getElementById('count').value = count;
        document.getElementById('select').className = '';
        document.getElementById('point').className = '';
        document.getElementById('spray').className = '';
        document.getElementById('poly').className = '';
        document.getElementById('bb').className = 'selected';
        document.getElementById('delete').className = '';
      }
      break;
    case 'delete':
      { // html changing
        document.getElementById('input').style.visibility = 'hidden';
        document.getElementById('poly_sub').style.visibility = 'hidden';
        document.getElementById('select').className = '';
        document.getElementById('point').className = '';
        document.getElementById('spray').className = '';
        document.getElementById('poly').className = '';
        document.getElementById('bb').className = '';
        document.getElementById('delete').className = 'selected';
      }
      break;
  }
}

// save function
function save() {
  // variable for text
  var text = '';

  // for each point
  for (i = 0; i < points.length; i++) {
    // variable for coordinates
    var el = points[i];      
    // for each coordinate
    for (j = 0; j < el.length; j++) {
      // write it to 'text'
      text += el[j].toFixed(6);
      // write comma if it's not last element
      if (j < el.length - 1)
        text += ', ';
    }
    // line break
    text += '\n';
  }

  // creating an 'a' element for downloading
  var a = document.createElement('a');
  // setting 'text' to href
  a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  // setting link to download, not to navigate; setting name of file
  a.setAttribute('download', 'data.txt');
  // adding to body (need this for firefox)
  document.body.appendChild(a);
  // clicking
  a.click();
  // removing from body
  document.body.removeChild(a);
}

// undo function
function undo() {
  // if user did nothing
  if (last_actions.length == 0)
    return false;
  // last action
  var action = last_actions.pop();
  // type of last action
  var type = action[0]
  switch (type) {
    /* 'add' type: delete created layer.
       Element structure:
         ['add', layer] */
    case 'add': {
      // get layer index
      var layer = action[1];
      // remove layer from the map
      map.removeLayer(layers[layer]);
      // and the 'layers' array
      delete layers[layer];
      break; }
    /* 'move' type: move marker back.
       Element structure:
         ['move', [old_lat, old_lng], marker_leaflet_id] */
    case 'move': {
      // get marker
      var marker = map._layers[action[2]];
      // get index in 'points' array
      var point = marker.options.point;
      // set old coordinates to points array
      points[point] = action[1];
      // set old coordinates to marker
      marker._latlng = action[1];
      // redraw marker
      map.removeLayer(marker);
      map.addLayer(marker);
      break; }
    /* 'delete' type: return deleted layers.
       Element structure:
         ['delete', [layers]] */
    case 'delete': {
      // get deleted layers array
      var deleted = action[1];
      // if point and layer were deleted
      if (deleted.length > 1) {
        // getting layer
        var layer = deleted[0];
        // getting point
        var point = deleted[1];
        // adding point to layer
        layer.addLayer(point);
        // getting layer's index in 'layers' array
        var layer_index = point.options.layer;
        // getting point's index in 'points' array
        var point_index = point.options.point;
        // adding deleted coordinates of point to 'points' array
        points[point_index] = [point._latlng.lat, point._latlng.lng];
        // adding deleted layer to 'layers' array
        layers[layer_index] = layer;
        // draw layer on map
        map.addLayer(layer);
      // if just point was deleted
      } else {
        // getting point
        var point = deleted[0];
        // getting layer's index in 'layers' array
        var layer_index = point.options.layer;
        // getting point's index in 'points' array
        var point_index = point.options.point;
        // adding deleted coordinates of point to 'points' array
        points[point_index] = [point._latlng.lat, point._latlng.lng];
        // adding point to layer
        layers[layer_index].addLayer(point);
      }
      break; }
    case 'poly_vertex': {
      break; }
  }
  return true;
}
/* ---------- ------- --------- ---------- */ }

/* ---------- other ---------- */ {

function get_userid() {
  // increment global uid
  uid += 1;
  // if userID == '#ffffff', then reset it to 0
  if (uid == (1 << 24))
    uid = 0;
  // return userID
  return '#' + ('000000' + uid.toString(16)).slice(-6);
}

// binding function 'onClick' with map click event
map.on('click', onClick);
/* ---------- ----- ---------- */ }
