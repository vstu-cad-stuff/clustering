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

/* ---------- initializing all variables ---------- */ {
/* creating map; turning off closing popups on click:
   we'll do it ourselves */
var map = L.map('map', {closePopupOnClick: false}).
  setView([48.7819, 44.7777], 14);
L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png').addTo(map);

/* array for points. Structure of an element:
   [point_lat, point_lng] */
var points = [];

// array of layers, needed for easy deletion and selection
var layers = [];

// current mode of work. Initial - 'select' mode
var work_mode = 'select';
// current type of point. Initial - 'default'
var point_type = 'default';
// points count, need for spray and uniform modes
var count = 20;
// uid - global variable for counting users, userid - string hex uid
var uid = -1, userid;
// array of last actions
var last_actions = [];
// _leaflet_id of clicked marker
var clicked;
// 
var poly_state = [false, []];
/* ---------- ------------ --- --------- ---------- */ }

/* ---------- marker icons ---------- */ {
// icon for non-separated point
var icon_def = L.icon({
  iconUrl: 'img/icon.png',
  shadowUrl: 'img/shadow.png',
  
  iconSize:     [16, 16],
  shadowSize:   [16, 16],
  iconAnchor:   [8, 8],
  shadowAnchor: [8, 8],
  popupAnchor:  [0, -5]
});

// icon for origin point
var icon_origin = L.icon({
  iconUrl: 'img/origin.png',
  shadowUrl: 'img/shadow.png',
  
  iconSize:     [16, 16],
  shadowSize:   [16, 16],
  iconAnchor:   [8, 8],
  shadowAnchor: [8, 8],
  popupAnchor:  [0, -5]
});

// icon for destination point
var icon_destination = L.icon({
  iconUrl: 'img/destination.png',
  shadowUrl: 'img/shadow.png',
  
  iconSize:     [16, 16],
  shadowSize:   [16, 16],
  iconAnchor:   [8, 8],
  shadowAnchor: [8, 8],
  popupAnchor:  [0, -5]
});

// icon for polygon handle
var icon_handle = L.icon({
  iconUrl: 'img/handle.png',
  shadowUrl: 'img/shadow.png',
  
  iconSize:     [16, 16],
  shadowSize:   [16, 16],
  iconAnchor:   [8, 8],
  shadowAnchor: [8, 8],
  popupAnchor:  [0, -5]
});
/* ---------- ------ ----- ---------- */ }

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

function get_type(marker) {
  /* some strange way to get state of marker:
     get name of it's icon, then cut 'img/' in beginning
     and '.png' at the end. If name is 'icon' then it is
     a default marker */
  var m_type = marker.options.icon.options.iconUrl.slice(4, -4);
  if (m_type == 'icon')
    m_type = 'default';
  return m_type;
}

function draw_marker(type, latlng) {
  // creating marker
  switch (type) {
    case 'default': {
      var marker = L.marker(latlng, {
        draggable: 'true',
        // layer's index in 'layers' array
        layer: layers.length - 1,
        // point's index in 'points' array
        point: points.length - 1
      }).addTo(map).
        bindPopup(latlng[0].toFixed(5) + '; ' + latlng[1].toFixed(5));
      break; }
    case 'origin': {
      var marker = L.origin(latlng, {
        draggable: 'true',
        // layer's index in 'layers' array
        layer: layers.length - 1,
        // point's index in 'points' array
        point: points.length - 1
      }).addTo(map).
        bindPopup('<b>origin</b><br/>' +
          latlng[0].toFixed(5) + '; ' + latlng[1].toFixed(5));
      break; }
    case 'destination': {
      var marker = L.destination(latlng, {
        draggable: 'true',
        // layer's index in 'layers' array
        layer: layers.length - 1,
        // point's index in 'points' array
        point: points.length - 1
      }).addTo(map).
        bindPopup('<b>destination</b><br/>' +
          latlng[0].toFixed(5) + '; ' + latlng[1].toFixed(5));
      break; }
    case 'handle': {
      var marker = L.handle(latlng, {
        draggable: 'true',
        // layer's index in 'layers' array
        layer: layers.length - 1
      }).addTo(map);
    }
  }
  // add event listeners to marker
  marker.on('click', onMarkerClick);
  marker.on('dragstart', onMarkerDragStart);
  marker.on('dragend', onMarkerDragEnd);
  if (type == 'handle') {
    marker.on('contextmenu', function (e) {
      if (work_mode != 'select' && work_mode != 'poly') {
        map.contextmenu.hide();
        return false;
      }
      clicked = e.target._leaflet_id;
    })
  } else {
    marker.on('contextmenu', function (e) {
      if (work_mode != 'select') {
        map.contextmenu.hide();
        return false;
      }
      clicked = e.target._leaflet_id;
    })
  }
  return marker;
}
/* ---------- ----- ---------- */ }

/* ---------- context menu functions ---------- */ {
function change_to(type, L_id) {
  /* change type of point with _leaflet_id = L_id to 'type' */
  // get marker
  var marker = map._layers[L_id];
  // get latlng of marker
  var latlng = marker._latlng;
  // get options layer and point from marker
  var layer = marker.options.layer;
  var point = marker.options.point;
  // get previous state of marker
  var prev_type = get_type(marker);
  // remove marker from layer
  layers[layer].removeLayer(marker);
  // remove marker from map
  map.removeLayer(marker);
  // due to new type of marker, use specified marker template
  switch (type) {
    case 'origin': {
      marker = L.origin(latlng, {
        layer: layer,
        point: point
      }).addTo(map).bindPopup('<b>origin</b><br/>' + lat.toFixed(5) + '; ' + lng.toFixed(5));
      break;
    }
    case 'destination': {
      marker = L.destination(latlng, {
        layer: layer,
        point: point
      }).addTo(map).bindPopup('<b>destination</b><br/>' + lat.toFixed(5) + '; ' + lng.toFixed(5));
      break;
    }
    case 'default': {
      marker = L.marker(latlng, {
        layer: layer,
        point: point
      }).addTo(map).bindPopup(lat.toFixed(5) + '; ' + lng.toFixed(5));
      break;
    }
  }
  // add event listeners and callback functions
  marker.on('click', onMarkerClick);
  marker.on('dragstart', onMarkerDragStart);
  marker.on('dragend', onMarkerDragEnd);
  marker.on('contextmenu', function (e) {
    clicked = e.target._leaflet_id
  });
  // write new marker to PREVIOUS position (!important)
  map._layers[L_id] = marker;
  // delete automatically created layer
  delete map._layers[marker._leaflet_id];
  // change _leaflet_id of created marker to L_id
  map._layers[L_id]._leaflet_id = L_id;
  // add created marker to previous layer contained it
  layers[layer].addLayer(map._layers[L_id]);
  // return prev_type because we'll need it in undo function
  return prev_type;
}

function delete_marker(L_id) {
  var marker = map._layers[L_id];
  // get layer it contained
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
  return temp;
}

function set_as_origin() {
  // get prev_type and change 'clicked' marker to origin
  var prev_type = change_to('origin', clicked);
  // write new action to 'last_actions'
  last_actions.push(['change', clicked, prev_type]);
}

function set_as_destin() {
  var prev_type = change_to('destination', clicked);
  last_actions.push(['change', clicked, prev_type]);
}

function set_as_default() {
  var prev_type = change_to('default', clicked);
  last_actions.push(['change', clicked, prev_type]);
}

function delete_point() {
  var temp = delete_marker(clicked);
  last_actions.push(temp);
}
/* ---------- ------- ---- --------- ---------- */ }

/* ---------- extending Leaflet templates ---------- */ {

/* extend Leaflet Marker:
   add option for binding Marker with Layer in which
   it was created (was made for undo actions),
   add option for binding Marker with it index in
   'points' array (was made for dragging points) */
L.Marker = L.Marker.extend({
   options: {
      draggable: 'true',              // we can drag it now
      layer: 0,                       // option for binding with layer
      point: 0,                       // option for binding with index
      icon: icon_def,                 // set icon to default
      contextmenu: true,              // create context menu
      contextmenuInheritItems: false, // do NOT get inherit items (if do, we'll get infinite menu)
      contextmenuItems: [{            // set as origin
        text: 'Set as origin point',
        callback: set_as_origin,
        icon: 'img/origin.png'
      }, {                            // set as destination
        text: 'Set as destination point',
        callback: set_as_destin,
        icon: 'img/destination.png'
      }, {                            // separator
        separator: true
      }, {                            // delete
        text: 'Delete point',
        callback: delete_point,
        icon: 'img/delete.png'
      }]
   }
});

L.Origin = L.Marker.extend({
   options: {
      draggable: 'true',
      layer: 0,
      point: 0,
      icon: icon_origin,
      contextmenu: true,
      contextmenuInheritItems: false,
      contextmenuItems: [{
        text: 'Set as default point',
        callback: set_as_default,
        icon: 'img/icon.png'
      }, {
        text: 'Set as destination point',
        callback: set_as_destin,
        icon: 'img/destination.png'
      }, {
        separator: true
      }, {
        text: 'Delete point',
        callback: delete_point,
        icon: 'img/delete.png'
      }]
   }
});

L.origin = function (t, e) { return new L.Origin(t, e) };

L.Destination = L.Marker.extend({
   options: {
      draggable: 'true',
      layer: 0,
      point: 0,
      icon: icon_destination,
      contextmenu: true,
      contextmenuInheritItems: false,
      contextmenuItems: [{
        text: 'Set as default point',
        callback: set_as_default,
        icon: 'img/icon.png'
      }, {
        text: 'Set as origin point',
        callback: set_as_origin,
        icon: 'img/origin.png'
      }, {
        separator: true
      }, {
        text: 'Delete point',
        callback: delete_point,
        icon: 'img/delete.png'
      }]
   }
});

L.destination = function (t, e) { return new L.Destination(t, e) };

L.Handle = L.Marker.extend({
   options: {
      draggable: 'true',
      layer: 0,
      in: undefined,
      out: undefined,
      icon: icon_handle,
      contextmenu: true,
      contextmenuInheritItems: false,
      contextmenuItems: [{
        text: 'Delete point',
        callback: delete_point,
        icon: 'img/delete.png'
      }]
   }
});

L.handle = function (t, e) { return new L.Handle(t, e) };
/* ---------- --------- ------- --------- ---------- */ }

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
      map.contextmenu.hide();
      break; }
    /* ----- point mode ----- */
    case 'point': {
      /* if clicking on map in 'point' mode
         we should set marker */
      // creating new layer for point
      layers.push(new L.FeatureGroup());
      // writing point to 'points' array
      points.push([lat, lng]);
      // creating marker
      var marker = draw_marker(point_type, [lat, lng]);
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
      var count = parseInt(document.getElementById('count').value);
      // if wrong number set it to default
      if (isNaN(count) || count <= 0)
        count = 20;
      // showing number
      document.getElementById('count').value = count;
      
      var radius = document.getElementById('input_radius').value;
      
      // create new layer
      layers.push(new L.FeatureGroup());
      // for each point we
      for (i = 0; i < count; i++) {
        // generate random coordinates
        var not_in_circle = true;
        var nlat = 0;
        var nlng = 0;
        while (not_in_circle) {
          nlat = (Math.random() - 0.5) * (radius * 2 / 3);
          nlng = (Math.random() - 0.5) * radius;
          if ((nlat << 1) + (nlng << 1) <= 2 / 3 * (radius << 1))
            not_in_circle = false;
        }
        nlat += lat;
        nlng += lng;
        // writing point to 'points' array
        points.push([nlat, nlng]);
        // creating marker
        var marker = draw_marker(point_type, [nlat, nlng]);
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
        var marker = draw_marker(point_type, [nlat, nlng]);
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
      var started = false;
      if (!poly_state[0]) {
        // creating new layer for point
        layers.push(new L.FeatureGroup());
        poly_state[0] = layers[layers.length - 1];
        started = true;
      }
      // creating marker
      var marker = draw_marker('handle', [lat, lng]);
      // add marker to layer
      poly_state[0].addLayer(marker);
      if (started) {
        poly_state[1].push(marker);
        last_actions.push(['handle', [marker._leaflet_id]]);
      } else {
        var last = poly_state[1].slice(-1)[0];
        var line = L.polyline([last._latlng, [lat, lng]],
          {color: 'green'});
        poly_state[0].addLayer(line);
        last.options.out = line;
        last_actions.push(['handle',
          [marker._leaflet_id, last._leaflet_id, line]]);
        marker.options.in = line;
        poly_state[1].push(marker);
      }
      // and draw it on map
      map.addLayer(poly_state[0]);
      break; }
  }
}

// on marker click
function onMarkerClick(e) {
  // doing stuff depending on work mode
  switch (work_mode) {
    case 'select': {
      /* in 'select' mode we just open popup */
      // opening popup for clicked marker
      map._layers[e.target._leaflet_id].openPopup();
      map.contextmenu.hide();
      break; }
    case 'delete': {
      /* in 'delete' mode we delete marker
         and layer contained it, if it has no more markers */
      map.contextmenu.hide();
      var l_id = e.target._leaflet_id;
      var temp = delete_marker(l_id);
      last_actions.push(temp);
      break; }
    case 'poly': {
      if (e.target == poly_state[1][poly_state[1].length - 1]) {
        if (poly_state[1].length > 2)
          poly_ready();
      }
      break;
    }
  }
}

// on marker drag start
function onMarkerDragStart(e) {
  /* an easy protection from dragging markers in not 'select'
     work mode: equate new coordinates to old */
  map.contextmenu.hide();
  // fail on polygon mode
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
  var type = get_type(marker);
  if (type == 'handle') {
    var line;
    if (marker.options.out != undefined) {
      line = marker.options.out;
      line._latlngs[0] = [lat, lng];
      map.removeLayer(line);
      map.addLayer(line);
    }
    if (marker.options.in != undefined) {
      line = marker.options.in;
      line._latlngs[1] = [lat, lng];
      map.removeLayer(line);
      map.addLayer(line);
    }
  } else {
    last_actions.push(['move', points[marker.options.point], marker._leaflet_id]);
    // changing data in array
    points[marker.options.point] = [lat, lng];
    
    // binding new popup
    switch (type) {
      case 'default': {
        marker.bindPopup(lat.toFixed(5) + '; ' + lng.toFixed(5));
      break; }
      case 'origin': {
        marker.bindPopup('<b>origin</b><br/>' +
          lat.toFixed(5) + '; ' + lng.toFixed(5));
      break; }
      case 'destination': {
        marker.bindPopup('<b>destination</b><br/>' +
          lat.toFixed(5) + '; ' + lng.toFixed(5));
      break; }
    }
  }
}
/* ---------- ----- -------- ---------- */ }

/* ---------- toolbar functions ---------- */ {
// on toolbar's element click
function select(option) {
  map.contextmenu.hide();
  // setting work mode
  work_mode = option;
  // doing stuff depending on work mode
  switch (work_mode) {
    case 'select': {
      // hide input panel
      document.getElementById('input').style.visibility = 'hidden';
      // hide polygon submenu
      document.getElementById('poly_sub').style.visibility = 'hidden';
      // hide spray radius changer
      document.getElementById('spray_radius').style.visibility = 'hidden';
      // hide point's type selection menu
      document.getElementById('select_type').style.visibility = 'hidden';
      // select 'select' element
      document.getElementById('select').className = 'selected';
      document.getElementById('point').className = '';
      document.getElementById('spray').className = '';
      document.getElementById('poly').className = '';
      document.getElementById('bb').className = '';
      document.getElementById('delete').className = '';
      break; }
    case 'point': {
      document.getElementById('input').style.visibility = 'hidden';
      document.getElementById('poly_sub').style.visibility = 'hidden';
      document.getElementById('spray_radius').style.visibility = 'hidden';
      // show point's type selection menu
      document.getElementById('select_type').style.visibility = 'visible';
      // select 'point' element
      document.getElementById('select').className = '';
      document.getElementById('point').className = 'selected';
      document.getElementById('spray').className = '';
      document.getElementById('poly').className = '';
      document.getElementById('bb').className = '';
      document.getElementById('delete').className = '';
      break; }
    case 'spray': {
      // show input panel
      document.getElementById('input').style.visibility = 'visible';
      document.getElementById('poly_sub').style.visibility = 'hidden';
      // show spray radius changer
      document.getElementById('spray_radius').style.visibility = 'visible';
      document.getElementById('select_type').style.visibility = 'visible';
      document.getElementById('count').value = count;
      document.getElementById('select').className = '';
      document.getElementById('point').className = '';
      document.getElementById('spray').className = 'selected';
      document.getElementById('poly').className = '';
      document.getElementById('bb').className = '';
      document.getElementById('delete').className = '';
      break; }
    case 'poly': {
      document.getElementById('input').style.visibility = 'visible';
      // show polygon submenu
      document.getElementById('poly_sub').style.visibility = 'visible';
      document.getElementById('spray_radius').style.visibility = 'hidden';
      document.getElementById('select_type').style.visibility = 'visible';
      document.getElementById('count').value = count;
      document.getElementById('select').className = '';
      document.getElementById('point').className = '';
      document.getElementById('spray').className = '';
      document.getElementById('poly').className = 'selected';
      document.getElementById('bb').className = '';
      document.getElementById('delete').className = '';
      break; }
    case 'bb': {
      document.getElementById('input').style.visibility = 'visible';
      document.getElementById('poly_sub').style.visibility = 'hidden';
      document.getElementById('spray_radius').style.visibility = 'hidden';
      document.getElementById('select_type').style.visibility = 'visible';
      document.getElementById('count').value = count;
      document.getElementById('select').className = '';
      document.getElementById('point').className = '';
      document.getElementById('spray').className = '';
      document.getElementById('poly').className = '';
      document.getElementById('bb').className = 'selected';
      document.getElementById('delete').className = '';
      break; }
    case 'delete': {
      document.getElementById('input').style.visibility = 'hidden';
      document.getElementById('poly_sub').style.visibility = 'hidden';
      document.getElementById('spray_radius').style.visibility = 'hidden';
      document.getElementById('select_type').style.visibility = 'hidden';
      document.getElementById('select').className = '';
      document.getElementById('point').className = '';
      document.getElementById('spray').className = '';
      document.getElementById('poly').className = '';
      document.getElementById('bb').className = '';
      document.getElementById('delete').className = 'selected';
      break; }
  }
}

// on point type selection
function select_type(option) {
  map.contextmenu.hide();
  // changing point's type
  point_type = option;
  // doing stuff depending on work mode
  switch (point_type) {
    case 'default': {
      // select 'default' type
      document.getElementById('default').className = 'selected';
      document.getElementById('origin').className = '';
      document.getElementById('destination').className = 'last';
      break; }
    case 'origin': {
      // select 'origin' type
      document.getElementById('default').className = '';
      document.getElementById('origin').className = 'selected';
      document.getElementById('destination').className = 'last';
      break; }
    case 'destination': {
      // select 'destination' type
      document.getElementById('default').className = '';
      document.getElementById('origin').className = '';
      document.getElementById('destination').className = 'last selected';
      break; }
  }
}

// save function
function save() {
  map.contextmenu.hide();
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

// load function
function load() {
  map.contextmenu.hide();
  /* here will be load function */
}

// undo function
function undo() {
  map.contextmenu.hide();
  // if user did nothing
  if (last_actions.length == 0)
    return false;
  // last action
  var action = last_actions.pop();
  // type of last action
  var type = action[0]
  switch (type) {
    case 'add': {
      /* 'add' type: delete created layer.
         Element structure:
           ['add', layer] */
      // get layer index
      var layer = action[1];
      //
      for (i in layers[layer]._layers) {
        delete points[map._layers[i].options.point];
      }
      // remove layer from the map
      map.removeLayer(layers[layer]);
      // and the 'layers' array
      delete layers[layer];
      break; }
    case 'move': {
      /* 'move' type: move marker back.
         Element structure:
           ['move', [old_lat, old_lng], marker_leaflet_id] */
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
    case 'delete': {
      /* 'delete' type: return deleted layers.
         Element structure:
           ['delete', [layers]] */
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
    case 'handle': {
      /* 'handle' type: delete created handle
         Element structure:
           ['handle', [element(s)]] */
      var options = action[1];
      if (options.length == 1) {
        delete_marker(options[0]);
        poly_state[0] = false;
        poly_state[1] = [];
      } else {
        var line = options[2];
        map.removeLayer(line);
        delete_marker(options[0]);
        poly_state[1].pop();
      }
      break; }
    case 'polygon': {
      /* 'polygon' type: unlock created polygon and
         delete points from it.
         Element structure:
           ['polygon', [poly_state[1], poly_state[2], points_layer]] */
      var options = action[1];
      poly_state[1] = options[0];
      poly_state[2] = options[1];
      poly_state[0] = layers[poly_state[1].options.layer];
      var line = poly_state[1].options.out;
      map.removeLayer(line);
      poly_state[1].options.out = undefined;
      poly_state[2].options.in = undefined;
      poly_state[0].removeLayer[options[2]];
      map.removeLayer(options[2]);
      break; }
    case 'change': {
      /* 'change' type: change type of marker back.
         Element structure:
           ['change', marker_leaflet_id, previous_type] */
      var marker = action[1];
      var type = action[2];
      change_to(type, marker);
      break;
    }
  }
  return true;
}

function poly_cancel() {
  if (poly_state[0]) {
    map.removeLayer(poly_state[0]);
    poly_state[0] = false;
    last_actions = last_actions.slice(0, -poly_state[1].length);
    poly_state[1] = [];
  }
}

function poly_ready () {
  var line = L.polyline([poly_state[1]._latlng, poly_state[2]._latlng],
    {color: 'blue'});
  poly_state[0].addLayer(line);
  poly_state[1].options.out = line;
  poly_state[2].options.in = line;
  var layer = new L.FeatureGroup();
  // parsing input for number
  count = parseInt(document.getElementById('count').value);
  // if wrong number set it to default
  if (isNaN(count) || count <= 0)
    count = 20;
  // showing number
  document.getElementById('count').value = count;
      
  // getting bounds of polygon
  bounds = [
    map.getBounds()._southWest.lat,  // min latitude
    map.getBounds()._northEast.lat,  // max latitude
    map.getBounds()._southWest.lng,  // min longitude
    map.getBounds()._northEast.lng]; // max longitude
  for (i = 0; i < count; i++) {
    // generate random coordinates
    var not_in_circle = true;
    var nlat = 0;
    var nlng = 0;
    while (not_in_circle) {
      nlat = (Math.random() - 0.5) * (0.01 * 2 / 3);
      nlng = (Math.random() - 0.5) * 0.01;
      if ((nlat << 1) + (nlng << 1) <= 2 / 3 * (0.01 << 1))
        not_in_circle = false;
    }
    nlat += 48.7819;
    nlng += 44.7777;
    // writing point to 'points' array
    points.push([nlat, nlng]);
    // creating marker
    var marker = draw_marker(point_type, [nlat, nlng]);
    // adding markers to layer
    layer.addLayer(marker);
  }
  // draw markers
  poly_state[0].addLayer(layer);
  map.addLayer(poly_state[0]);
  last_actions.push(['polygon', [poly_state[1], layer]]);
  poly_state[1] = [];
  poly_state[0] = false;
}
/* ---------- ------- --------- ---------- */ }

// binding function 'onClick' with map click event
map.on('click', onClick);
