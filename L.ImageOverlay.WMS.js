L.ImageOverlay.WMS = L.ImageOverlay.extend({

    defaultWmsParams: {
        service: 'WMS',
        request: 'GetMap',
        srs: 'EPSG:4326',
        version: '1.3',
        layers: '',
        styles: '',
        format: 'image/png',
        transparent: false,
        tiled: false
    },

    initialize: function (url, options) {
        this._baseUrl = url;
        var wmsParams = L.Util.extend({}, this.defaultWmsParams);
        if (options.detectRetina && L.Browser.retina) {
            wmsParams.width = wmsParams.height = this.options.tileSize * 2;
        } else {
            wmsParams.width = wmsParams.height = this.options.tileSize;
        }
        for (var i in options) {
            // all keys that are not TileLayer options go to WMS params
            if (!this.options.hasOwnProperty(i) && i !== 'crs') {
                wmsParams[i] = options[i];
            }
        }

        this.wmsParams = wmsParams;

        L.Util.setOptions(this, options);
    },

    onAdd: function (map) {
        this._bounds = map.getBounds();
        this._map = map;
        var projectionKey = parseFloat(this.wmsParams.version) >= 1.3 ? 'crs' : 'srs';
        this.wmsParams[projectionKey] = map.options.crs.code;
        this._image1 = this._initImage();
        this._image2 = this._initImage();
        map._panes.overlayPane.appendChild(this._image1);
        map._panes.overlayPane.appendChild(this._image2);
        this._image = this._image1;
        map.on("moveend", this._reset, this);
        map.on("zoomstart", this._zoomStart, this);
        map.on('viewreset', this._reset, this);
        this._reset();
    },

    onRemove: function (map) {
        map.getPanes().overlayPane.removeChild(this._image1);
        map.getPanes().overlayPane.removeChild(this._image2);
        map.off('viewreset', this._reset, this);
        map.off("moveend", this._reset, this)
        map.off("zoomstart", this._zoomStart, this)
    },

    _zoomStart: function() {
        L.DomUtil.setOpacity(this._image, 0);
    },

    _updateUrl: function () {
        var map = this._map,
            bounds = this._bounds,
            crs = map.options.crs,
            topLeft = map.latLngToLayerPoint(bounds.getNorthWest()),
            mapSize = map.latLngToLayerPoint(bounds.getSouthEast()).subtract(topLeft),
            nw = crs.project(bounds.getNorthWest()),
            se = crs.project(bounds.getSouthEast()),
            bbox = [nw.x, se.y, se.x, nw.y].join(','),
            urlParams = { width: mapSize.x, height: mapSize.y, bbox: bbox };
        this._url = this._baseUrl + L.Util.getParamString(L.Util.extend({}, this.wmsParams, urlParams));
    },

    _initImage: function () {
        var image = L.DomUtil.create('img', 'leaflet-image-layer');
        L.DomUtil.addClass(image, 'leaflet-zoom-hide');
        this._bounds = this._map.getBounds().pad(0.1);
        this._updateUrl();
        L.Util.extend(image, {
            galleryimg: 'no',
            onselectstart: L.Util.falseFn,
            onmousemove: L.Util.falseFn,
            onload: L.Util.bind(this._onImageLoad, this),
            src: ''
        });
        L.DomUtil.setOpacity(image, 0);
        return image;
    },

    _updateImagePosition: function () {
        L.ImageOverlay.prototype._reset.call(this);
    },

    _reset: function () {
        this._bounds = this._map.getBounds().pad(0.1);
        this._updateUrl();
        if (this._image == this._image1) {
            this._image = this._image2;
        } else {
            this._image = this._image1;
        }
        L.DomUtil.setOpacity(this._image, 0);
        L.Util.extend(this._image, {
            src: this._url
        });
    },

    setUrl: function () {
        this._image.src = this._url;
    },

    _onImageLoad: function () {
        this.fire('load');
        this._updateImagePosition();
        L.DomUtil.setOpacity(this._image, this.options.opacity);
        if (this._image == this._image1) {
            L.DomUtil.setOpacity(this._image2, 0);
        } else {
            L.DomUtil.setOpacity(this._image1, 0);
        }
    }
});

L.imageOverlay.wms = function (url, options) {
    return new L.ImageOverlay.WMS(url, options);
};