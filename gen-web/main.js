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
// points count, need for spray and uniform modes
var count = 20;
// uid - global variable for counting users, userid - string hex uid
var uid = -1, userid;
// array of last actions
var last_actions = [];
//
var clicked;
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
  /* some strange way to get previous state of marker:
     get name of it's icon, then cut 'img/' in beginning
     and '.png' at the end. If name is 'icon' then it was
     default marker */
  var prev_type = marker.options.icon.options.iconUrl.slice(4, -4);
  if (prev_type == 'icon')
    prev_type = 'default';
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
  // get clicked marker
  var marker = map._layers[clicked]; /* create delete(marker) function, DRY */
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
      // creating origin Marker
      marker = L.marker([lat, lng], {
        draggable: 'true',
        // layer's index in 'layers' array
        layer: layers.length - 1,
        // point's index in 'points' array
        point: points.length - 1
      }).addTo(map).bindPopup(lat.toFixed(5) + '; ' + lng.toFixed(5));
      // add event listeners to marker
      marker.on('click', onMarkerClick);
      marker.on('dragstart', onMarkerDragStart);
      marker.on('dragend', onMarkerDragEnd);
      marker.on('contextmenu', function (e) {
        if (work_mode != 'select') {
          map.contextmenu.hide();
          return false;
        }
        clicked = e.target._leaflet_id;
      });
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
        var marker = L.marker([nlat, nlng], {
          // layer's index in 'layers' array
          layer: layers.length - 1,
          // point's index in 'points' array
          point: points.length - 1
        }).addTo(map).bindPopup(lat.toFixed(5) + '; ' + lng.toFixed(5));
        // adding click function to markers
        marker.on('click', onMarkerClick);
        marker.on('dragstart', onMarkerDragStart);
        marker.on('dragend', onMarkerDragEnd);
        marker.on('contextmenu', function (e) {
          if (work_mode != 'select') {
            map.contextmenu.hide();
            return false;
          }
          clicked = e.target._leaflet_id
        });
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
        marker.on('contextmenu', function (e) {
          if (work_mode != 'select') {
            map.contextmenu.hide();
            return false;
          }
          clicked = e.target._leaflet_id
        });
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
        marker.on('contextmenu', function (e) {
          if (work_mode != 'select') {
            map.contextmenu.hide();
            return false;
          }
          clicked = e.target._leaflet_id
        });
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
      break; }
  }
}

// on marker drag start
function onMarkerDragStart(e) {
  /* an easy protection from dragging markers in not 'select'
     work mode: equate new coordinates to old */
  map.contextmenu.hide();
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
  map.contextmenu.hide();
  // setting work mode
  work_mode = option;
  // doing stuff depending on work mode
  switch (work_mode) {
    case 'select':
      { // html changing
        document.getElementById('input').style.visibility = 'hidden';
        document.getElementById('poly_sub').style.visibility = 'hidden';
        document.getElementById('spray_radius').style.visibility = 'hidden';
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
        document.getElementById('spray_radius').style.visibility = 'hidden';
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
        document.getElementById('spray_radius').style.visibility = 'visible';
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
        document.getElementById('spray_radius').style.visibility = 'hidden';
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
        document.getElementById('spray_radius').style.visibility = 'hidden';
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
        document.getElementById('spray_radius').style.visibility = 'hidden';
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
    /* 'handle' type:  */
    case 'handle': {
      break; }
    /* 'change' type: change type of marker back.
       Element structure:
         ['change', marker_leaflet_id, previous_type] */
    case 'change': {
      var marker = action[1];
      var type = action[2];
      change_to(type, marker);
      break;
    }
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
