/**
 *  GBIF Static map widget thing v0.1
 *  No dependencies, (hopefully) no conflicts.
 */

// Make IE play nice. Should not cause conflicts with any sane frameworks/libs
NodeList.prototype.forEach = NodeList.prototype.forEach || Array.prototype.forEach;
if(!window.addEventListener) window.addEventListener = window.attachEvent;

// Who knows how people will use this, better make sure we declare it only once.
window.gbifStaticMap = window.gbifStaticMap || (function(){
  var baseSettings = {
    zoomLevel: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 1,
    pointsStyle: 'classic.point',
    tilesStyle: 'gbif-classic',
    taxonKey: 1,
    dataUrl: 'https://api.gbif.org/v2/map/occurrence/density/',
    tileUrl: 'https://tile.gbif.org/3857/omt/',
    speciesUrl: 'http://api.gbif.org/v1/species/',
    gbifUrl: 'https://www.gbif.org/species/',
    projection: 3857
  };

  var maps =[];

  var get = function(url, cb){
    var x = new XMLHttpRequest();
    x.onload = cb;
    x.open("GET", url);
    x.send();
  };

  var clone = function(obj){
    if (typeof Object.assign == 'function') return Object.assign({}, obj);
    var o = {};
    for (var p in obj) {
      if (obj.hasOwnProperty(p)) o[p] = obj[p];
    }
    return o;
  };

  // Just to avoid those pesky broken image things. Gbif api returns 204 for non data tiles, this covers them as well.
  var imageLoadErrorHandler = function(ev){
    ev.target.setAttribute('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
  };

  // Injects minimum stylesheet into head if none present.
  var addStyles = function(){
    if (!document.querySelector('#gbif-static-map-css')) {
      var stylesheet = document.createElement('STYLE');
      stylesheet.setAttribute('id', 'gbif-static-map-css');
      stylesheet.textContent = '.gbif-static-map *{ box-sizing: border-box; } .gbif-static-map div{ margin: 0; padding: 0; border: 0; } .gbif-static-map img{ display: inline-block; vertical-align: bottom; background-size: cover; background-repeat: no-repeat; min-height: 0; min-width: 0; height: 100%; width: 100%; margin: -0.5px; }';;
      document.head.appendChild(stylesheet)
    }
  };

  var map = function(containerElement) {
    //Read settings
    var settings = clone(baseSettings);
    for (var key in containerElement.dataset) {
      if (key == 'topLeft') {
        var tl = (containerElement.dataset[key] + ',0').split(',').map(function(n){return parseInt(n, 10)});
        settings.left = tl[0];
        settings.top = tl[1];
      } else if (key == "bottomRight") {
        var br = (containerElement.dataset[key] + ',').split(',').map(function(n){return parseInt(n, 10)});
        settings.right = br[0];
        settings.bottom = br[1];
      }

      if(Object.keys(settings).indexOf(key) >= 0) {
          settings[key] = containerElement.dataset[key];
      }
    }

    // NB: we never check, but assume the caption element is a direct child of container. If this mess up your layout... *shrug*
    var captionContainer = containerElement.querySelector('.caption');

    // "draw"

    var tiles = [], div, tile,
      w = 100/ (1 + settings.right - settings.left),
      h = 100/ (1 + settings.bottom - settings.top),
      src;
    for (var j = settings.top; j <= settings.bottom; j++) {
      div = document.createElement('div');
      for (var i = settings.left; i <= settings.right; i++) {
        // Note we never set alt text for the tiles. Use aria-label for the parent container to explain what you try to show. This is your responsibility.
        tile = document.createElement('img');
        tile.onerror = imageLoadErrorHandler;
        // TODO: add tile size to settings
        src = settings.dataUrl + settings.zoomLevel + '/' + i + '/' +  j + '@1x.png?style=' + settings.pointsStyle
          + '&srs=EPSG:' + settings.projection +'&taxonKey=' + settings.taxonKey;
        if (settings.pointsStyle.match('poly')) src += '&bin=hex'; // polys needs shapes. TODO: add shape to settings
        tile.setAttribute('src', src);
        tile.setAttribute('style',
          'background-image: url(' + settings.tileUrl + settings.zoomLevel + '/' + i + '/' +  j
          + '@1x.png?style=' + settings.tilesStyle + ');'
          + 'max-width: ' + w + '%;'
        );

        div.setAttribute('style', 'max-height: ' + h + '%;');
        div.appendChild(tile);
        tiles.push(tile);
      }

      if (captionContainer) containerElement.insertBefore(div, captionContainer);
      else containerElement.appendChild(div);
    }
    // Add auto caption
    if (captionContainer && captionContainer.classList.contains('auto-caption')) { // TODO: fails IE9, no classList support
      get(settings.speciesUrl + settings.taxonKey, function(){
        if(this.readyState == 4 && [200,301,302].indexOf(this.status) >= 0 && this.responseText) {
          try {
            var json = JSON.parse(this.responseText);
            captionContainer.innerHTML = 'GBIF: <a href="' + settings.gbifUrl + settings.taxonKey + '">' + json.scientificName + '</a>';
          } catch (e) {
            console.log("Species lookup", e);
          }
        }
      })
    }

    return {
      container: containerElement,
      settings: settings
    };
  };


  return {
    init: function(){
      document.querySelectorAll('.gbif-static-map').forEach(function(element){
        maps.push(map(element));
      });
      if (map.length) addStyles();
    },
    maps: maps // So we can manipulate the maps in the future.
  }
})();

// Run when the doucment has properly loaded.
window.addEventListener('load', window.gbifStaticMap.init);