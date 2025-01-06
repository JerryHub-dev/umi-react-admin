/*! cesium-navigation-es6 v3.0.9 - CesiumNavigation.umd.js, 78e21a3a5403392c0e1f, Thu Apr 18 2024 14:28:40 GMT+0800 (中国标准时间) */
!(function (e, t) {
  'object' == typeof exports && 'object' == typeof module
    ? (module.exports = t(require('Cesium')))
    : 'function' == typeof define && define.amd
    ? define(['Cesium'], t)
    : 'object' == typeof exports
    ? (exports.CesiumNavigation = t(require('Cesium')))
    : (e.CesiumNavigation = t(e.Cesium));
})(self, (e) =>
  (() => {
    var t = {
        89: (e) => {
          'use strict';
          e.exports = function (e) {
            var t = [];
            return (
              (t.toString = function () {
                return this.map(function (t) {
                  var i = '',
                    n = void 0 !== t[5];
                  return (
                    t[4] && (i += '@supports ('.concat(t[4], ') {')),
                    t[2] && (i += '@media '.concat(t[2], ' {')),
                    n && (i += '@layer'.concat(t[5].length > 0 ? ' '.concat(t[5]) : '', ' {')),
                    (i += e(t)),
                    n && (i += '}'),
                    t[2] && (i += '}'),
                    t[4] && (i += '}'),
                    i
                  );
                }).join('');
              }),
              (t.i = function (e, i, n, o, a) {
                'string' == typeof e && (e = [[null, e, void 0]]);
                var r = {};
                if (n)
                  for (var s = 0; s < this.length; s++) {
                    var d = this[s][0];
                    null != d && (r[d] = !0);
                  }
                for (var c = 0; c < e.length; c++) {
                  var l = [].concat(e[c]);
                  (n && r[l[0]]) ||
                    (void 0 !== a &&
                      (void 0 === l[5] ||
                        (l[1] = '@layer'.concat(l[5].length > 0 ? ' '.concat(l[5]) : '', ' {').concat(l[1], '}')),
                      (l[5] = a)),
                    i && (l[2] ? ((l[1] = '@media '.concat(l[2], ' {').concat(l[1], '}')), (l[2] = i)) : (l[2] = i)),
                    o &&
                      (l[4]
                        ? ((l[1] = '@supports ('.concat(l[4], ') {').concat(l[1], '}')), (l[4] = o))
                        : (l[4] = ''.concat(o))),
                    t.push(l));
                }
              }),
              t
            );
          };
        },
        248: (e) => {
          'use strict';
          e.exports = function (e) {
            return e[1];
          };
        },
        637: (e, t, i) => {
          'use strict';
          i.r(t), i.d(t, { default: () => s });
          var n = i(248),
            o = i.n(n),
            a = i(89),
            r = i.n(a)()(o());
          r.push([
            e.id,
            ".distance-legend {\n  pointer-events: auto;\n  position: absolute;\n  border-radius: 15px;\n  padding-left: 5px;\n  padding-right: 5px;\n  bottom: 30px;\n  height: 30px;\n  width: 125px;\n  box-sizing: content-box;\n}\n\n.distance-legend-label {\n  display: inline-block;\n  font-family: 'Roboto', sans-serif;\n  font-size: 14px;\n  font-weight: lighter;\n  line-height: 30px;\n  color: #FFFFFF;\n  width: 125px;\n  text-align: center;\n}\n\n.distance-legend-scale-bar {\n  border-left: 1px solid #FFFFFF;\n  border-right: 1px solid #FFFFFF;\n  border-bottom: 1px solid #FFFFFF;\n  position: absolute;\n  height: 10px;\n  top: 15px;\n}\n\n@media print {\n  .distance-legend {\n    display: none;\n  }\n}\n\n@media screen and (max-width: 700px),\nscreen and (max-height: 420px) {\n  .distance-legend {\n    display: none;\n  }\n}\n\n.navigation-controls {\n  position: absolute;\n  right: 30px;\n  top: 210px;\n  width: 30px;\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  font-weight: 300;\n  -webkit-touch-callout: none;\n  -webkit-user-select: none;\n  -khtml-user-select: none;\n  -moz-user-select: none;\n  -ms-user-select: none;\n  user-select: none;\n}\n\n.navigation-control {\n  cursor: pointer;\n  border-bottom: 1px solid #555555;\n}\n\n.naviagation-control:active {\n  color: #FFF;\n}\n\n.navigation-control-last {\n  cursor: pointer;\n  border-bottom: 1px solid #555555;\n  border-bottom: 0;\n}\n\n.navigation-control-icon-zoom-in {\n  position: relative;\n  text-align: center;\n  font-size: 20px;\n  color: #FFFFFF;\n  padding-bottom: 4px;\n}\n\n.navigation-control-icon-zoom-out {\n  position: relative;\n  text-align: center;\n  font-size: 20px;\n  color: #FFFFFF;\n}\n\n.navigation-control-icon-reset {\n  position: relative;\n  left: 10px;\n  width: 10px;\n  height: 10px;\n  fill: rgba(255, 255, 255, 0.8);\n  padding-top: 6px;\n  padding-bottom: 6px;\n  box-sizing: content-box;\n}\n\n.compass {\n  pointer-events: auto;\n  position: absolute;\n  right: 0px;\n  top: 100px;\n  width: 95px;\n  height: 95px;\n  overflow: hidden;\n}\n\n.compass-outer-ring {\n  position: absolute;\n  top: 0;\n  width: 95px;\n  height: 95px;\n  fill: rgba(255, 255, 255, 0.5);\n}\n\n.compass-outer-ring-background {\n  position: absolute;\n  top: 14px;\n  left: 14px;\n  width: 44px;\n  height: 44px;\n  border-radius: 44px;\n  border: 12px solid rgba(47, 53, 60, 0.8);\n  box-sizing: content-box;\n}\n\n.compass-gyro {\n  pointer-events: none;\n  position: absolute;\n  top: 0;\n  width: 95px;\n  height: 95px;\n  fill: #CCC;\n}\n\n.compass-gyro-active {\n  fill: #68ADFE;\n}\n\n.compass-gyro-background {\n  position: absolute;\n  top: 30px;\n  left: 30px;\n  width: 33px;\n  height: 33px;\n  border-radius: 33px;\n  background-color: rgba(47, 53, 60, 0.8);\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  box-sizing: content-box;\n}\n\n.compass-gyro-background:hover+.compass-gyro {\n  fill: #68ADFE;\n}\n\n.compass-rotation-marker {\n  position: absolute;\n  top: 0;\n  width: 95px;\n  height: 95px;\n  fill: #68ADFE;\n}\n\n@media screen and (max-width: 700px),\nscreen and (max-height: 420px) {\n  .navigation-controls {\n    display: none;\n  }\n\n  .compass {\n    display: none;\n  }\n}\n\n@media print {\n  .navigation-controls {\n    display: none;\n  }\n\n  .compass {\n    display: none;\n  }\n}",
            '',
          ]);
          const s = r;
        },
        760: (e, t, i) => {
          var n = i(72),
            o = i(637);
          'string' == typeof (o = o.__esModule ? o.default : o) && (o = [[e.id, o, '']]);
          var a = { insert: 'head', singleton: !1 };
          n(o, a);
          e.exports = o.locals || {};
        },
        72: (e, t, i) => {
          'use strict';
          var n,
            o = function () {
              return void 0 === n && (n = Boolean(window && document && document.all && !window.atob)), n;
            },
            a = (function () {
              var e = {};
              return function (t) {
                if (void 0 === e[t]) {
                  var i = document.querySelector(t);
                  if (window.HTMLIFrameElement && i instanceof window.HTMLIFrameElement)
                    try {
                      i = i.contentDocument.head;
                    } catch (e) {
                      i = null;
                    }
                  e[t] = i;
                }
                return e[t];
              };
            })(),
            r = [];
          function s(e) {
            for (var t = -1, i = 0; i < r.length; i++)
              if (r[i].identifier === e) {
                t = i;
                break;
              }
            return t;
          }
          function d(e, t) {
            for (var i = {}, n = [], o = 0; o < e.length; o++) {
              var a = e[o],
                d = t.base ? a[0] + t.base : a[0],
                c = i[d] || 0,
                l = ''.concat(d, ' ').concat(c);
              i[d] = c + 1;
              var p = s(l),
                u = { css: a[1], media: a[2], sourceMap: a[3] };
              -1 !== p
                ? (r[p].references++, r[p].updater(u))
                : r.push({ identifier: l, updater: g(u, t), references: 1 }),
                n.push(l);
            }
            return n;
          }
          function c(e) {
            var t = document.createElement('style'),
              n = e.attributes || {};
            if (void 0 === n.nonce) {
              var o = i.nc;
              o && (n.nonce = o);
            }
            if (
              (Object.keys(n).forEach(function (e) {
                t.setAttribute(e, n[e]);
              }),
              'function' == typeof e.insert)
            )
              e.insert(t);
            else {
              var r = a(e.insert || 'head');
              if (!r)
                throw new Error(
                  "Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.",
                );
              r.appendChild(t);
            }
            return t;
          }
          var l,
            p =
              ((l = []),
              function (e, t) {
                return (l[e] = t), l.filter(Boolean).join('\n');
              });
          function u(e, t, i, n) {
            var o = i ? '' : n.media ? '@media '.concat(n.media, ' {').concat(n.css, '}') : n.css;
            if (e.styleSheet) e.styleSheet.cssText = p(t, o);
            else {
              var a = document.createTextNode(o),
                r = e.childNodes;
              r[t] && e.removeChild(r[t]), r.length ? e.insertBefore(a, r[t]) : e.appendChild(a);
            }
          }
          function h(e, t, i) {
            var n = i.css,
              o = i.media,
              a = i.sourceMap;
            if (
              (o ? e.setAttribute('media', o) : e.removeAttribute('media'),
              a &&
                'undefined' != typeof btoa &&
                (n += '\n/*# sourceMappingURL=data:application/json;base64,'.concat(
                  btoa(unescape(encodeURIComponent(JSON.stringify(a)))),
                  ' */',
                )),
              e.styleSheet)
            )
              e.styleSheet.cssText = n;
            else {
              for (; e.firstChild; ) e.removeChild(e.firstChild);
              e.appendChild(document.createTextNode(n));
            }
          }
          var v = null,
            m = 0;
          function g(e, t) {
            var i, n, o;
            if (t.singleton) {
              var a = m++;
              (i = v || (v = c(t))), (n = u.bind(null, i, a, !1)), (o = u.bind(null, i, a, !0));
            } else
              (i = c(t)),
                (n = h.bind(null, i, t)),
                (o = function () {
                  !(function (e) {
                    if (null === e.parentNode) return !1;
                    e.parentNode.removeChild(e);
                  })(i);
                });
            return (
              n(e),
              function (t) {
                if (t) {
                  if (t.css === e.css && t.media === e.media && t.sourceMap === e.sourceMap) return;
                  n((e = t));
                } else o();
              }
            );
          }
          e.exports = function (e, t) {
            (t = t || {}).singleton || 'boolean' == typeof t.singleton || (t.singleton = o());
            var i = d((e = e || []), t);
            return function (e) {
              if (((e = e || []), '[object Array]' === Object.prototype.toString.call(e))) {
                for (var n = 0; n < i.length; n++) {
                  var o = s(i[n]);
                  r[o].references--;
                }
                for (var a = d(e, t), c = 0; c < i.length; c++) {
                  var l = s(i[c]);
                  0 === r[l].references && (r[l].updater(), r.splice(l, 1));
                }
                i = a;
              }
            };
          };
        },
        354: (t) => {
          'use strict';
          t.exports = e;
        },
      },
      i = {};
    function n(e) {
      var o = i[e];
      if (void 0 !== o) return o.exports;
      var a = (i[e] = { id: e, exports: {} });
      return t[e](a, a.exports, n), a.exports;
    }
    (n.n = (e) => {
      var t = e && e.__esModule ? () => e.default : () => e;
      return n.d(t, { a: t }), t;
    }),
      (n.d = (e, t) => {
        for (var i in t) n.o(t, i) && !n.o(e, i) && Object.defineProperty(e, i, { enumerable: !0, get: t[i] });
      }),
      (n.o = (e, t) => Object.prototype.hasOwnProperty.call(e, t)),
      (n.r = (e) => {
        'undefined' != typeof Symbol &&
          Symbol.toStringTag &&
          Object.defineProperty(e, Symbol.toStringTag, { value: 'Module' }),
          Object.defineProperty(e, '__esModule', { value: !0 });
      }),
      (n.nc = void 0);
    var o = {};
    return (
      (() => {
        'use strict';
        n.d(o, { default: () => V });
        n(760);
        var e = n(354);
        const t = function (e) {
          var t = document.createElement('div');
          t.innerHTML = e;
          for (var i = document.createDocumentFragment(); t.firstChild; ) i.appendChild(t.firstChild);
          return i;
        };
        var i = e.knockout;
        const a = function (n, o, a) {
          o = (0, e.getElement)(o);
          var r,
            s = t(n),
            d = [];
          for (r = 0; r < s.childNodes.length; ++r) d.push(s.childNodes[r]);
          for (o.appendChild(s), r = 0; r < d.length; ++r) {
            var c = d[r];
            (1 !== c.nodeType && 8 !== c.nodeType) || i.applyBindings(a, c);
          }
          return d;
        };
        var r = e.knockout,
          s = function (t) {
            if (!(0, e.defined)(t) || !(0, e.defined)(t.terria))
              throw new e.DeveloperError('options.terria is required.');
            (this.terria = t.terria),
              (this._removeSubscription = void 0),
              (this._lastLegendUpdate = void 0),
              (this.eventHelper = new e.EventHelper()),
              (this.distanceLabel = void 0),
              (this.barWidth = void 0),
              (this.enableDistanceLegend = !(0, e.defined)(t.enableDistanceLegend) || t.enableDistanceLegend),
              r.track(this, ['distanceLabel', 'barWidth']),
              this.eventHelper.add(
                this.terria.afterWidgetChanged,
                function () {
                  (0, e.defined)(this._removeSubscription) &&
                    (this._removeSubscription(), (this._removeSubscription = void 0));
                },
                this,
              );
            var i = this;
            function n() {
              if ((0, e.defined)(i.terria)) {
                var t = i.terria.scene;
                i._removeSubscription = t.postRender.addEventListener(function () {
                  !(function (t, i) {
                    if (!t.enableDistanceLegend) return (t.barWidth = void 0), void (t.distanceLabel = void 0);
                    var n = (0, e.getTimestamp)();
                    if (n < t._lastLegendUpdate + 250) return;
                    t._lastLegendUpdate = n;
                    var o = i.canvas.clientWidth,
                      a = i.canvas.clientHeight,
                      r = i.camera.getPickRay(new e.Cartesian2((o / 2) | 0, a - 1)),
                      s = i.camera.getPickRay(new e.Cartesian2((1 + o / 2) | 0, a - 1)),
                      l = i.globe,
                      p = l.pick(r, i),
                      u = l.pick(s, i);
                    if (!(0, e.defined)(p) || !(0, e.defined)(u))
                      return (t.barWidth = void 0), void (t.distanceLabel = void 0);
                    var h = l.ellipsoid.cartesianToCartographic(p),
                      v = l.ellipsoid.cartesianToCartographic(u);
                    d.setEndPoints(h, v);
                    for (var m, g = d.surfaceDistance, f = 100, b = c.length - 1; !(0, e.defined)(m) && b >= 0; --b)
                      c[b] / g < f && (m = c[b]);
                    if ((0, e.defined)(m)) {
                      var C;
                      (C = m >= 1e3 ? (m / 1e3).toString() + ' km' : m.toString() + ' m'),
                        (t.barWidth = (m / g) | 0),
                        (t.distanceLabel = C);
                    } else (t.barWidth = void 0), (t.distanceLabel = void 0);
                  })(this, t);
                }, i);
              }
            }
            n(),
              this.eventHelper.add(
                this.terria.afterWidgetChanged,
                function () {
                  n();
                },
                this,
              );
          };
        (s.prototype.destroy = function () {
          this.eventHelper.removeAll();
        }),
          (s.prototype.show = function (e) {
            var t;
            (t = this.enableDistanceLegend
              ? '<div class="distance-legend" data-bind="visible: distanceLabel && barWidth"><div class="distance-legend-label" data-bind="text: distanceLabel"></div><div class="distance-legend-scale-bar" data-bind="style: { width: barWidth + \'px\', left: (5 + (125 - barWidth) / 2) + \'px\' }"></div></div>'
              : '<div class="distance-legend"  style="display: none;" data-bind="visible: distanceLabel && barWidth"><div class="distance-legend-label"  data-bind="text: distanceLabel"></div><div class="distance-legend-scale-bar"  data-bind="style: { width: barWidth + \'px\', left: (5 + (125 - barWidth) / 2) + \'px\' }"></div></div>'),
              a(t, e, this);
          }),
          (s.create = function (e) {
            var t = new s(e);
            return t.show(e.container), t;
          });
        var d = new e.EllipsoidGeodesic(),
          c = [
            1, 2, 3, 5, 10, 20, 30, 50, 100, 200, 300, 500, 1e3, 2e3, 3e3, 5e3, 1e4, 2e4, 3e4, 5e4, 1e5, 2e5, 3e5, 5e5,
            1e6, 2e6, 3e6, 5e6, 1e7, 2e7, 3e7, 5e7,
          ];
        const l = s;
        var p = e.knockout,
          u = function (t) {
            if (!(0, e.defined)(t)) throw new e.DeveloperError('terria is required');
            (this._terria = t),
              (this.name = 'Unnamed Control'),
              (this.text = void 0),
              (this.svgIcon = void 0),
              (this.svgHeight = void 0),
              (this.svgWidth = void 0),
              (this.cssClass = void 0),
              (this.isActive = !1),
              p.track(this, ['name', 'svgIcon', 'svgHeight', 'svgWidth', 'cssClass', 'isActive']);
          };
        Object.defineProperties(u.prototype, {
          terria: {
            get: function () {
              return this._terria;
            },
          },
          hasText: {
            get: function () {
              return (0, e.defined)(this.text) && 'string' == typeof this.text;
            },
          },
        }),
          (u.prototype.activate = function () {
            throw new e.DeveloperError('activate must be implemented in the derived class.');
          });
        const h = u;
        var v = function (e) {
          h.apply(this, arguments);
        };
        v.prototype = Object.create(h.prototype);
        const m = v;
        var g = function (e) {
          m.apply(this, arguments),
            (this.name = e.options.resetTooltip ? e.options.resetTooltip : '重置视图'),
            (this.navigationLocked = !1),
            (this.svgIcon = e.options.resetSvg
              ? ''
              : 'M 7.5,0 C 3.375,0 0,3.375 0,7.5 0,11.625 3.375,15 7.5,15 c 3.46875,0 6.375,-2.4375 7.21875,-5.625 l -1.96875,0 C 12,11.53125 9.9375,13.125 7.5,13.125 4.40625,13.125 1.875,10.59375 1.875,7.5 1.875,4.40625 4.40625,1.875 7.5,1.875 c 1.59375,0 2.90625,0.65625 3.9375,1.6875 l -3,3 6.5625,0 L 15,0 12.75,2.25 C 11.4375,0.84375 9.5625,0 7.5,0 z'),
            (this.resetSvg = e.options.resetSvg),
            (this.resetSuccess = e.options.resetSuccess),
            (this.svgHeight = 15),
            (this.svgWidth = 15),
            (this.cssClass = 'navigation-control-icon-reset');
        };
        ((g.prototype = Object.create(m.prototype)).setNavigationLocked = function (e) {
          this.navigationLocked = e;
        }),
          (g.prototype.resetView = function () {
            if (!this.navigationLocked) {
              var t = this.terria.scene;
              if (t.screenSpaceCameraController.enableInputs) {
                this.isActive = !0;
                var i = t.camera;
                if ((0, e.defined)(this.terria.trackedEntity)) {
                  var n = this.terria.trackedEntity;
                  (this.terria.trackedEntity = void 0), (this.terria.trackedEntity = n);
                } else {
                  const n = this.terria.options.duration ? this.terria.options.duration : 3;
                  if (this.terria.options.defaultResetView) {
                    const o = this.terria.options.orientation
                      ? this.terria.options.orientation
                      : { heading: e.Math.toRadians(5.729578) };
                    if (
                      this.terria.options.defaultResetView &&
                      this.terria.options.defaultResetView instanceof e.Cartographic
                    )
                      i.flyTo({
                        destination: t.globe.ellipsoid.cartographicToCartesian(this.terria.options.defaultResetView),
                        orientation: o,
                        duration: n,
                      });
                    else if (
                      this.terria.options.defaultResetView &&
                      this.terria.options.defaultResetView instanceof e.Rectangle
                    )
                      try {
                        e.Rectangle.validate(this.terria.options.defaultResetView),
                          i.flyTo({
                            destination: this.terria.options.defaultResetView,
                            orientation: o,
                            duration: n,
                            complete: this.resetSuccess,
                          });
                      } catch (e) {
                        console.log(
                          'Cesium-navigation/ResetViewNavigationControl:   options.defaultResetView Cesium rectangle is  invalid!',
                        );
                      }
                  } else
                    'function' == typeof i.flyHome
                      ? i.flyHome(1)
                      : i.flyTo({ destination: e.Camera.DEFAULT_VIEW_RECTANGLE, duration: n });
                }
                this.isActive = !1;
              }
            }
          }),
          (g.prototype.activate = function () {
            this.resetView();
          });
        const f = g;
        var b = {},
          C = new e.Cartographic(),
          x = new e.Ray();
        b.getCameraFocus = function (t, i, n) {
          var o = t.scene,
            a = o.camera;
          if (
            o.mode !== e.SceneMode.MORPHING &&
            ((0, e.defined)(n) || (n = new e.Cartesian3()),
            (0, e.defined)(t.trackedEntity)
              ? (n = t.trackedEntity.position.getValue(t.clock.currentTime, n))
              : ((x.origin = a.positionWC), (x.direction = a.directionWC), (n = o.globe.pick(x, o, n))),
            (0, e.defined)(n))
          )
            return (
              o.mode === e.SceneMode.SCENE2D || o.mode === e.SceneMode.COLUMBUS_VIEW
                ? ((n = a.worldToCameraCoordinatesPoint(n, n)),
                  i && (n = o.globe.ellipsoid.cartographicToCartesian(o.mapProjection.unproject(n, C), n)))
                : i || (n = a.worldToCameraCoordinatesPoint(n, n)),
              n
            );
        };
        const y = b;
        var M = function (e, t) {
          m.apply(this, arguments),
            (this.name = t
              ? e.options.zoomInTooltip
                ? e.options.zoomInTooltip
                : '放大'
              : e.options.zoomOutTooltip
              ? e.options.zoomOutTooltip
              : '缩小'),
            t
              ? e.options.zoomInSvg
                ? (this.zoomInSvg = e.options.zoomInSvg)
                : (this.text = '+')
              : e.options.zoomOutSvg
              ? (this.zoomOutSvg = e.options.zoomOutSvg)
              : (this.text = '-'),
            (this.cssClass = 'navigation-control-icon-zoom-' + (t ? 'in' : 'out')),
            (this.relativeAmount = 2),
            t && (this.relativeAmount = 1 / this.relativeAmount);
        };
        (M.prototype.relativeAmount = 1),
          ((M.prototype = Object.create(m.prototype)).activate = function () {
            this.zoom(this.relativeAmount);
          });
        var k = new e.Cartesian3();
        M.prototype.zoom = function (t) {
          if (((this.isActive = !0), (0, e.defined)(this.terria))) {
            var i = this.terria.scene,
              n = i.screenSpaceCameraController;
            if (!n.enableInputs || !n.enableZoom) return;
            var o,
              a = i.camera;
            switch (i.mode) {
              case e.SceneMode.MORPHING:
                break;
              case e.SceneMode.SCENE2D:
                a.zoomIn(a.positionCartographic.height * (1 - this.relativeAmount));
                break;
              default:
                var r;
                if (
                  ((r = (0, e.defined)(this.terria.trackedEntity)
                    ? new e.Cartesian3()
                    : y.getCameraFocus(this.terria, !1)),
                  (0, e.defined)(r))
                )
                  o = { direction: a.direction, up: a.up };
                else {
                  var s = new e.Ray(
                    a.worldToCameraCoordinatesPoint(i.globe.ellipsoid.cartographicToCartesian(a.positionCartographic)),
                    a.directionWC,
                  );
                  (r = e.IntersectionTests.grazingAltitudeLocation(s, i.globe.ellipsoid)),
                    (o = { heading: a.heading, pitch: a.pitch, roll: a.roll });
                }
                if (a.position.z >= 406944828719368.56) return;
                var d = e.Cartesian3.subtract(a.position, r, k),
                  c = e.Cartesian3.multiplyByScalar(d, t, d),
                  l = e.Cartesian3.add(r, c, r);
                (0, e.defined)(this.terria.trackedEntity) || i.mode === e.SceneMode.COLUMBUS_VIEW
                  ? (a.position = l)
                  : a.flyTo({ destination: l, orientation: o, duration: 0.5, convert: !1 });
            }
          }
          this.isActive = !1;
        };
        const w = M;
        var F = e.knockout,
          L = function (t) {
            (this.terria = t.terria),
              (this.eventHelper = new e.EventHelper()),
              (this.enableZoomControls = !(0, e.defined)(t.enableZoomControls) || t.enableZoomControls),
              (this.enableCompass = !(0, e.defined)(t.enableCompass) || t.enableCompass),
              (this.navigationLocked = !1),
              (this.controls = t.controls),
              (0, e.defined)(this.controls) ||
                (this.controls = [new w(this.terria, !0), new f(this.terria), new w(this.terria, !1)]),
              (this.svgCompassOuterRing =
                'm 66.5625,0 0,15.15625 3.71875,0 0,-10.40625 5.5,10.40625 4.375,0 0,-15.15625 -3.71875,0 0,10.40625 L 70.9375,0 66.5625,0 z M 72.5,20.21875 c -28.867432,0 -52.28125,23.407738 -52.28125,52.28125 0,28.87351 23.413818,52.3125 52.28125,52.3125 28.86743,0 52.28125,-23.43899 52.28125,-52.3125 0,-28.873512 -23.41382,-52.28125 -52.28125,-52.28125 z m 0,1.75 c 13.842515,0 26.368948,5.558092 35.5,14.5625 l -11.03125,11 0.625,0.625 11.03125,-11 c 8.9199,9.108762 14.4375,21.579143 14.4375,35.34375 0,13.764606 -5.5176,26.22729 -14.4375,35.34375 l -11.03125,-11 -0.625,0.625 11.03125,11 c -9.130866,9.01087 -21.658601,14.59375 -35.5,14.59375 -13.801622,0 -26.321058,-5.53481 -35.4375,-14.5 l 11.125,-11.09375 c 6.277989,6.12179 14.857796,9.90625 24.3125,9.90625 19.241896,0 34.875,-15.629154 34.875,-34.875 0,-19.245847 -15.633104,-34.84375 -34.875,-34.84375 -9.454704,0 -18.034511,3.760884 -24.3125,9.875 L 37.0625,36.4375 C 46.179178,27.478444 58.696991,21.96875 72.5,21.96875 z m -0.875,0.84375 0,13.9375 1.75,0 0,-13.9375 -1.75,0 z M 36.46875,37.0625 47.5625,48.15625 C 41.429794,54.436565 37.65625,63.027539 37.65625,72.5 c 0,9.472461 3.773544,18.055746 9.90625,24.34375 L 36.46875,107.9375 c -8.96721,-9.1247 -14.5,-21.624886 -14.5,-35.4375 0,-13.812615 5.53279,-26.320526 14.5,-35.4375 z M 72.5,39.40625 c 18.297686,0 33.125,14.791695 33.125,33.09375 0,18.302054 -14.827314,33.125 -33.125,33.125 -18.297687,0 -33.09375,-14.822946 -33.09375,-33.125 0,-18.302056 14.796063,-33.09375 33.09375,-33.09375 z M 22.84375,71.625 l 0,1.75 13.96875,0 0,-1.75 -13.96875,0 z m 85.5625,0 0,1.75 14,0 0,-1.75 -14,0 z M 71.75,108.25 l 0,13.9375 1.71875,0 0,-13.9375 -1.71875,0 z'),
              (this.svgCompassGyro =
                'm 72.71875,54.375 c -0.476702,0 -0.908208,0.245402 -1.21875,0.5625 -0.310542,0.317098 -0.551189,0.701933 -0.78125,1.1875 -0.172018,0.363062 -0.319101,0.791709 -0.46875,1.25 -6.91615,1.075544 -12.313231,6.656514 -13,13.625 -0.327516,0.117495 -0.661877,0.244642 -0.9375,0.375 -0.485434,0.22959 -0.901634,0.471239 -1.21875,0.78125 -0.317116,0.310011 -0.5625,0.742111 -0.5625,1.21875 l 0.03125,0 c 0,0.476639 0.245384,0.877489 0.5625,1.1875 0.317116,0.310011 0.702066,0.58291 1.1875,0.8125 0.35554,0.168155 0.771616,0.32165 1.21875,0.46875 1.370803,6.10004 6.420817,10.834127 12.71875,11.8125 0.146999,0.447079 0.30025,0.863113 0.46875,1.21875 0.230061,0.485567 0.470708,0.870402 0.78125,1.1875 0.310542,0.317098 0.742048,0.5625 1.21875,0.5625 0.476702,0 0.876958,-0.245402 1.1875,-0.5625 0.310542,-0.317098 0.582439,-0.701933 0.8125,-1.1875 0.172018,-0.363062 0.319101,-0.791709 0.46875,-1.25 6.249045,-1.017063 11.256351,-5.7184 12.625,-11.78125 0.447134,-0.1471 0.86321,-0.300595 1.21875,-0.46875 0.485434,-0.22959 0.901633,-0.502489 1.21875,-0.8125 0.317117,-0.310011 0.5625,-0.710861 0.5625,-1.1875 l -0.03125,0 c 0,-0.476639 -0.245383,-0.908739 -0.5625,-1.21875 C 89.901633,71.846239 89.516684,71.60459 89.03125,71.375 88.755626,71.244642 88.456123,71.117495 88.125,71 87.439949,64.078341 82.072807,58.503735 75.21875,57.375 c -0.15044,-0.461669 -0.326927,-0.884711 -0.5,-1.25 -0.230061,-0.485567 -0.501958,-0.870402 -0.8125,-1.1875 -0.310542,-0.317098 -0.710798,-0.5625 -1.1875,-0.5625 z m -0.0625,1.40625 c 0.03595,-0.01283 0.05968,0 0.0625,0 0.0056,0 0.04321,-0.02233 0.1875,0.125 0.144288,0.147334 0.34336,0.447188 0.53125,0.84375 0.06385,0.134761 0.123901,0.309578 0.1875,0.46875 -0.320353,-0.01957 -0.643524,-0.0625 -0.96875,-0.0625 -0.289073,0 -0.558569,0.04702 -0.84375,0.0625 C 71.8761,57.059578 71.936151,56.884761 72,56.75 c 0.18789,-0.396562 0.355712,-0.696416 0.5,-0.84375 0.07214,-0.07367 0.120304,-0.112167 0.15625,-0.125 z m 0,2.40625 c 0.448007,0 0.906196,0.05436 1.34375,0.09375 0.177011,0.592256 0.347655,1.271044 0.5,2.03125 0.475097,2.370753 0.807525,5.463852 0.9375,8.9375 -0.906869,-0.02852 -1.834463,-0.0625 -2.78125,-0.0625 -0.92298,0 -1.802327,0.03537 -2.6875,0.0625 0.138529,-3.473648 0.493653,-6.566747 0.96875,-8.9375 0.154684,-0.771878 0.320019,-1.463985 0.5,-2.0625 0.405568,-0.03377 0.804291,-0.0625 1.21875,-0.0625 z m -2.71875,0.28125 c -0.129732,0.498888 -0.259782,0.987558 -0.375,1.5625 -0.498513,2.487595 -0.838088,5.693299 -0.96875,9.25 -3.21363,0.15162 -6.119596,0.480068 -8.40625,0.9375 -0.682394,0.136509 -1.275579,0.279657 -1.84375,0.4375 0.799068,-6.135482 5.504716,-11.036454 11.59375,-12.1875 z M 75.5,58.5 c 6.043169,1.18408 10.705093,6.052712 11.5,12.15625 -0.569435,-0.155806 -1.200273,-0.302525 -1.875,-0.4375 -2.262525,-0.452605 -5.108535,-0.783809 -8.28125,-0.9375 -0.130662,-3.556701 -0.470237,-6.762405 -0.96875,-9.25 C 75.761959,59.467174 75.626981,58.990925 75.5,58.5 z m -2.84375,12.09375 c 0.959338,0 1.895843,0.03282 2.8125,0.0625 C 75.48165,71.267751 75.5,71.871028 75.5,72.5 c 0,1.228616 -0.01449,2.438313 -0.0625,3.59375 -0.897358,0.0284 -1.811972,0.0625 -2.75,0.0625 -0.927373,0 -1.831062,-0.03473 -2.71875,-0.0625 -0.05109,-1.155437 -0.0625,-2.365134 -0.0625,-3.59375 0,-0.628972 0.01741,-1.232249 0.03125,-1.84375 0.895269,-0.02827 1.783025,-0.0625 2.71875,-0.0625 z M 68.5625,70.6875 c -0.01243,0.60601 -0.03125,1.189946 -0.03125,1.8125 0,1.22431 0.01541,2.407837 0.0625,3.5625 -3.125243,-0.150329 -5.92077,-0.471558 -8.09375,-0.90625 -0.784983,-0.157031 -1.511491,-0.316471 -2.125,-0.5 -0.107878,-0.704096 -0.1875,-1.422089 -0.1875,-2.15625 0,-0.115714 0.02849,-0.228688 0.03125,-0.34375 0.643106,-0.20284 1.389577,-0.390377 2.25,-0.5625 2.166953,-0.433487 4.97905,-0.75541 8.09375,-0.90625 z m 8.3125,0.03125 c 3.075121,0.15271 5.824455,0.446046 7.96875,0.875 0.857478,0.171534 1.630962,0.360416 2.28125,0.5625 0.0027,0.114659 0,0.228443 0,0.34375 0,0.735827 -0.07914,1.450633 -0.1875,2.15625 -0.598568,0.180148 -1.29077,0.34562 -2.0625,0.5 -2.158064,0.431708 -4.932088,0.754666 -8.03125,0.90625 0.04709,-1.154663 0.0625,-2.33819 0.0625,-3.5625 0,-0.611824 -0.01924,-1.185379 -0.03125,-1.78125 z M 57.15625,72.5625 c 0.0023,0.572772 0.06082,1.131112 0.125,1.6875 -0.125327,-0.05123 -0.266577,-0.10497 -0.375,-0.15625 -0.396499,-0.187528 -0.665288,-0.387337 -0.8125,-0.53125 -0.147212,-0.143913 -0.15625,-0.182756 -0.15625,-0.1875 0,-0.0047 -0.02221,-0.07484 0.125,-0.21875 0.147212,-0.143913 0.447251,-0.312472 0.84375,-0.5 0.07123,-0.03369 0.171867,-0.06006 0.25,-0.09375 z m 31.03125,0 c 0.08201,0.03503 0.175941,0.05872 0.25,0.09375 0.396499,0.187528 0.665288,0.356087 0.8125,0.5 0.14725,0.14391 0.15625,0.21405 0.15625,0.21875 0,0.0047 -0.009,0.04359 -0.15625,0.1875 -0.147212,0.143913 -0.416001,0.343722 -0.8125,0.53125 -0.09755,0.04613 -0.233314,0.07889 -0.34375,0.125 0.06214,-0.546289 0.09144,-1.094215 0.09375,-1.65625 z m -29.5,3.625 c 0.479308,0.123125 0.983064,0.234089 1.53125,0.34375 2.301781,0.460458 5.229421,0.787224 8.46875,0.9375 0.167006,2.84339 0.46081,5.433176 0.875,7.5 0.115218,0.574942 0.245268,1.063612 0.375,1.5625 -5.463677,-1.028179 -9.833074,-5.091831 -11.25,-10.34375 z m 27.96875,0 C 85.247546,81.408945 80.919274,85.442932 75.5,86.5 c 0.126981,-0.490925 0.261959,-0.967174 0.375,-1.53125 0.41419,-2.066824 0.707994,-4.65661 0.875,-7.5 3.204493,-0.15162 6.088346,-0.480068 8.375,-0.9375 0.548186,-0.109661 1.051942,-0.220625 1.53125,-0.34375 z M 70.0625,77.53125 c 0.865391,0.02589 1.723666,0.03125 2.625,0.03125 0.912062,0 1.782843,-0.0048 2.65625,-0.03125 -0.165173,2.736408 -0.453252,5.207651 -0.84375,7.15625 -0.152345,0.760206 -0.322989,1.438994 -0.5,2.03125 -0.437447,0.03919 -0.895856,0.0625 -1.34375,0.0625 -0.414943,0 -0.812719,-0.02881 -1.21875,-0.0625 -0.177011,-0.592256 -0.347655,-1.271044 -0.5,-2.03125 -0.390498,-1.948599 -0.700644,-4.419842 -0.875,-7.15625 z m 1.75,10.28125 c 0.284911,0.01545 0.554954,0.03125 0.84375,0.03125 0.325029,0 0.648588,-0.01171 0.96875,-0.03125 -0.05999,0.148763 -0.127309,0.31046 -0.1875,0.4375 -0.18789,0.396562 -0.386962,0.696416 -0.53125,0.84375 -0.144288,0.147334 -0.181857,0.125 -0.1875,0.125 -0.0056,0 -0.07446,0.02233 -0.21875,-0.125 C 72.355712,88.946416 72.18789,88.646562 72,88.25 71.939809,88.12296 71.872486,87.961263 71.8125,87.8125 z'),
              (this.svgCompassRotationMarker =
                'M 72.46875,22.03125 C 59.505873,22.050338 46.521615,27.004287 36.6875,36.875 L 47.84375,47.96875 C 61.521556,34.240041 83.442603,34.227389 97.125,47.90625 l 11.125,-11.125 C 98.401629,26.935424 85.431627,22.012162 72.46875,22.03125 z'),
              (this.showCompass = (0, e.defined)(this.terria) && this.enableCompass),
              (this.heading = this.showCompass ? this.terria.scene.camera.heading : 0),
              (this.isOrbiting = !1),
              (this.orbitCursorAngle = 0),
              (this.orbitCursorOpacity = 0),
              (this.orbitLastTimestamp = 0),
              (this.orbitFrame = void 0),
              (this.orbitIsLook = !1),
              (this.orbitMouseMoveFunction = void 0),
              (this.orbitMouseUpFunction = void 0),
              (this.isRotating = !1),
              (this.rotateInitialCursorAngle = void 0),
              (this.rotateFrame = void 0),
              (this.rotateIsLook = !1),
              (this.rotateMouseMoveFunction = void 0),
              (this.rotateMouseUpFunction = void 0),
              (this._unsubcribeFromPostRender = void 0),
              F.track(this, ['controls', 'showCompass', 'heading', 'isOrbiting', 'orbitCursorAngle', 'isRotating']);
            var i = this;
            function n() {
              (0, e.defined)(i.terria)
                ? (i._unsubcribeFromPostRender &&
                    (i._unsubcribeFromPostRender(), (i._unsubcribeFromPostRender = void 0)),
                  (i.showCompass = i.enableCompass),
                  (i._unsubcribeFromPostRender = i.terria.scene.postRender.addEventListener(function () {
                    i.heading = i.terria.scene.camera.heading;
                  })))
                : (i._unsubcribeFromPostRender &&
                    (i._unsubcribeFromPostRender(), (i._unsubcribeFromPostRender = void 0)),
                  (i.showCompass = !1));
            }
            (L.prototype.setNavigationLocked = function (e) {
              (this.navigationLocked = e),
                this.controls &&
                  this.controls.length > 1 &&
                  this.controls[1].setNavigationLocked(this.navigationLocked);
            }),
              this.eventHelper.add(this.terria.afterWidgetChanged, n, this),
              n();
          };
        (L.prototype.destroy = function () {
          this.eventHelper.removeAll();
        }),
          (L.prototype.show = function (e) {
            const t = '</div>',
              i = '>',
              n = ' style="display: none;"',
              o = '<div class="compass"',
              r =
                void 0 === this.terria.options.enableCompassOuterRing || this.terria.options.enableCompassOuterRing
                  ? 'title="" data-bind="visible: showCompass, event: { mousedown: handleMouseDown,touchstart:handleMouseDown, dblclick: handleDoubleClick }">'
                  : 'title="" data-bind="visible: showCompass">',
              s =
                " <div class=\"compass-rotation-marker\" data-bind=\"visible: isOrbiting, style: { transform: 'rotate(-' + orbitCursorAngle + 'rad)', '-webkit-transform': 'rotate(-' + orbitCursorAngle + 'rad)', opacity: orbitCursorOpacity }",
              d = s + ', cesiumSvgPath: { path: svgCompassRotationMarker, width: 145, height: 145 }"' + i,
              c = s + '"' + i + this.terria.options.compassRotationMarkerSvg,
              l = (this.terria.options.compassRotationMarkerSvg ? c : d) + t,
              p =
                " <div class=\"compass-outer-ring\" title=\"\" data-bind=\"style: { transform: 'rotate(-' + heading + 'rad)', '-webkit-transform': 'rotate(-' + heading + 'rad)' }",
              u = p + ', cesiumSvgPath: { path: svgCompassOuterRing, width: 145, height: 145 }"' + i,
              h = p + '"' + i + this.terria.options.compassOuterRingSvg,
              v = (this.terria.options.compassOuterRingSvg ? h : u) + t,
              m = ' <div class="compass-gyro" data-bind="css: { \'compass-gyro-active\': isOrbiting }',
              g = m + ',cesiumSvgPath: { path: svgCompassGyro, width: 145, height: 145 } "' + i,
              f = m + '"' + i + this.terria.options.compassGyroSvg,
              b =
                r +
                '<div class="compass-outer-ring-background"></div>' +
                l +
                v +
                ' <div class="compass-gyro-background"></div>' +
                ((this.terria.options.compassGyroSvg ? f : g) + t) +
                t,
              C = o + b,
              x = o + n + b,
              y = '<div class="navigation-controls"',
              M = this.terria.options.resetSvg,
              k = this.terria.options.zoomInSvg,
              w = this.terria.options.zoomOutSvg,
              F =
                '>\x3c!-- ko foreach: controls --\x3e<div data-bind="click: activate, attr: { title: $data.name }, css: $root.isLastControl($data) ? \'navigation-control-last\' : \'navigation-control\' ">   \x3c!-- ko if: $data.hasText --\x3e   <div data-bind="text: $data.text, css: $data.isActive ?  \'navigation-control-icon-active \' + $data.cssClass : $data.cssClass"></div>   \x3c!-- /ko --\x3e  \x3c!-- ko ifnot: $data.hasText --\x3e  \x3c!-- ko if: $data.svgIcon --\x3e  <div data-bind="cesiumSvgPath: { path: $data.svgIcon, width: $data.svgWidth, height: $data.svgHeight }, css: $data.isActive ?  \'navigation-control-icon-active \' + $data.cssClass : $data.cssClass"></div>  \x3c!-- /ko --\x3e  \x3c!-- ko ifnot: $data.svgIcon --\x3e  \x3c!-- ko if: $data.resetSvg --\x3e  <div class="navigation-control-icon-svg reset" onclick="' +
                this.terria.options.reset +
                '">' +
                M +
                '</div>  \x3c!-- /ko --\x3e  \x3c!-- ko ifnot: $data.resetSvg --\x3e  \x3c!-- ko if: $data.zoomInSvg --\x3e  <div class="navigation-control-icon-svg" zoomin>' +
                k +
                '</div>  \x3c!-- /ko --\x3e  \x3c!-- ko ifnot: $data.zoomInSvg --\x3e  \x3c!-- ko if: $data.zoomOutSvg --\x3e  <div class="navigation-control-icon-svg zoomout">' +
                w +
                '</div>  \x3c!-- /ko --\x3e  \x3c!-- /ko --\x3e  \x3c!-- /ko --\x3e  \x3c!-- /ko --\x3e  \x3c!-- /ko --\x3e </div> \x3c!-- /ko --\x3e' +
                t,
              L = y + F,
              S = y + n + i + F,
              E = (this.enableCompass ? C : x) + (this.enableZoomControls ? L : S);
            a(E, e, this);
          }),
          (L.prototype.add = function (e) {
            this.controls.push(e);
          }),
          (L.prototype.remove = function (e) {
            this.controls.remove(e);
          }),
          (L.prototype.isLastControl = function (e) {
            return e === this.controls[this.controls.length - 1];
          });
        var S = new e.Cartesian2();
        const E = (e) => {
          let t;
          t = e.touches ? e.touches[0] : e;
          const { clientX: i, clientY: n } = t;
          return { clientX: i, clientY: n };
        };
        L.prototype.handleMouseDown = function (t, i) {
          const { clientX: n, clientY: o } = E(i);
          if (this.terria.scene.mode === e.SceneMode.MORPHING) return !0;
          if (t.navigationLocked) return !0;
          var a = i.currentTarget,
            r = i.currentTarget.getBoundingClientRect(),
            s = r.width / 2,
            d = new e.Cartesian2((r.right - r.left) / 2, (r.bottom - r.top) / 2),
            c = new e.Cartesian2(n - r.left, o - r.top),
            l = e.Cartesian2.subtract(c, d, S),
            p = e.Cartesian2.magnitude(l) / s;
          if (p < 50 / 145)
            !(function (t, i, n) {
              var o = t.terria.scene,
                a = o.screenSpaceCameraController;
              if (o.mode === e.SceneMode.MORPHING || !a.enableInputs) return;
              if (t.navigationLocked) return !0;
              switch (o.mode) {
                case e.SceneMode.COLUMBUS_VIEW:
                  if (a.enableLook) break;
                  if (!a.enableTranslate || !a.enableTilt) return;
                  break;
                case e.SceneMode.SCENE3D:
                  if (a.enableLook) break;
                  if (!a.enableTilt || !a.enableRotate) return;
                  break;
                case e.SceneMode.SCENE2D:
                  if (!a.enableTranslate) return;
              }
              O(t),
                (0, e.defined)(t.orbitTickFunction) && t.terria.clock.onTick.removeEventListener(t.orbitTickFunction);
              (t.orbitMouseMoveFunction = void 0),
                (t.orbitMouseUpFunction = void 0),
                (t.orbitTickFunction = void 0),
                (t.isOrbiting = !0),
                (t.orbitLastTimestamp = (0, e.getTimestamp)());
              var r = o.camera;
              if ((0, e.defined)(t.terria.trackedEntity)) (t.orbitFrame = void 0), (t.orbitIsLook = !1);
              else {
                var s = y.getCameraFocus(t.terria, !0, R);
                (0, e.defined)(s)
                  ? ((t.orbitFrame = e.Transforms.eastNorthUpToFixedFrame(s, o.globe.ellipsoid, D)),
                    (t.orbitIsLook = !1))
                  : ((t.orbitFrame = e.Transforms.eastNorthUpToFixedFrame(r.positionWC, o.globe.ellipsoid, D)),
                    (t.orbitIsLook = !0));
              }
              function d(i, n) {
                var o = Math.atan2(-i.y, i.x);
                t.orbitCursorAngle = e.Math.zeroToTwoPi(o - e.Math.PI_OVER_TWO);
                var a = e.Cartesian2.magnitude(i),
                  r = n / 2,
                  s = Math.min(a / r, 1),
                  d = 0.5 * s * s + 0.5;
                t.orbitCursorOpacity = d;
              }
              (t.orbitTickFunction = function (i) {
                var n,
                  a = (0, e.getTimestamp)(),
                  s = (a - t.orbitLastTimestamp) * ((2.5 * (t.orbitCursorOpacity - 0.5)) / 1e3),
                  d = t.orbitCursorAngle + e.Math.PI_OVER_TWO,
                  c = Math.cos(d) * s,
                  l = Math.sin(d) * s;
                if (t.navigationLocked) return !0;
                (0, e.defined)(t.orbitFrame) &&
                  ((n = e.Matrix4.clone(r.transform, T)), r.lookAtTransform(t.orbitFrame)),
                  o.mode === e.SceneMode.SCENE2D
                    ? r.move(
                        new e.Cartesian3(c, l, 0),
                        (Math.max(o.canvas.clientWidth, o.canvas.clientHeight) / 100) *
                          r.positionCartographic.height *
                          s,
                      )
                    : t.orbitIsLook
                    ? (r.look(e.Cartesian3.UNIT_Z, -c), r.look(r.right, -l))
                    : (r.rotateLeft(c), r.rotateUp(l)),
                  (0, e.defined)(t.orbitFrame) && r.lookAtTransform(n),
                  (t.orbitLastTimestamp = a);
              }),
                (t.orbitMouseMoveFunction = function (t) {
                  const { clientX: n, clientY: o } = E(t);
                  var a = i.getBoundingClientRect(),
                    r = new e.Cartesian2((a.right - a.left) / 2, (a.bottom - a.top) / 2),
                    s = new e.Cartesian2(n - a.left, o - a.top);
                  d(e.Cartesian2.subtract(s, r, S), a.width);
                }),
                (t.orbitMouseUpFunction = function (i) {
                  (t.isOrbiting = !1),
                    O(t),
                    (0, e.defined)(t.orbitTickFunction) &&
                      t.terria.clock.onTick.removeEventListener(t.orbitTickFunction),
                    (t.orbitMouseMoveFunction = void 0),
                    (t.orbitMouseUpFunction = void 0),
                    (t.orbitTickFunction = void 0);
                }),
                z(t),
                t.terria.clock.onTick.addEventListener(t.orbitTickFunction),
                d(n, i.getBoundingClientRect().width);
            })(this, a, l);
          else {
            if (!(p < 1)) return !0;
            !(function (t, i, n) {
              var o,
                a = t.terria.scene,
                r = a.camera,
                s = a.screenSpaceCameraController;
              if (a.mode === e.SceneMode.MORPHING || a.mode === e.SceneMode.SCENE2D || !s.enableInputs) return;
              if (t.navigationLocked) return !0;
              if (
                !s.enableLook &&
                (a.mode === e.SceneMode.COLUMBUS_VIEW || (a.mode === e.SceneMode.SCENE3D && !s.enableRotate))
              )
                return;
              if (
                (_(t),
                (t.rotateMouseMoveFunction = void 0),
                (t.rotateMouseUpFunction = void 0),
                (t.isRotating = !0),
                (t.rotateInitialCursorAngle = Math.atan2(-n.y, n.x)),
                (0, e.defined)(t.terria.trackedEntity))
              )
                (t.rotateFrame = void 0), (t.rotateIsLook = !1);
              else {
                var d = y.getCameraFocus(t.terria, !0, R);
                (0, e.defined)(d) && (a.mode !== e.SceneMode.COLUMBUS_VIEW || s.enableLook || s.enableTranslate)
                  ? ((t.rotateFrame = e.Transforms.eastNorthUpToFixedFrame(d, a.globe.ellipsoid, D)),
                    (t.rotateIsLook = !1))
                  : ((t.rotateFrame = e.Transforms.eastNorthUpToFixedFrame(r.positionWC, a.globe.ellipsoid, D)),
                    (t.rotateIsLook = !0));
              }
              (0, e.defined)(t.rotateFrame) &&
                ((o = e.Matrix4.clone(r.transform, T)), r.lookAtTransform(t.rotateFrame));
              (t.rotateInitialCameraAngle = -r.heading), (0, e.defined)(t.rotateFrame) && r.lookAtTransform(o);
              (t.rotateMouseMoveFunction = function (n) {
                const { clientX: o, clientY: a } = E(n);
                var r,
                  s = i.getBoundingClientRect(),
                  d = new e.Cartesian2((s.right - s.left) / 2, (s.bottom - s.top) / 2),
                  c = new e.Cartesian2(o - s.left, a - s.top),
                  l = e.Cartesian2.subtract(c, d, S),
                  p = Math.atan2(-l.y, l.x) - t.rotateInitialCursorAngle,
                  u = e.Math.zeroToTwoPi(t.rotateInitialCameraAngle - p),
                  h = t.terria.scene.camera;
                (0, e.defined)(t.rotateFrame) &&
                  ((r = e.Matrix4.clone(h.transform, T)), h.lookAtTransform(t.rotateFrame));
                var v = -h.heading;
                h.rotateRight(u - v), (0, e.defined)(t.rotateFrame) && h.lookAtTransform(r);
              }),
                (t.rotateMouseUpFunction = function (e) {
                  (t.isRotating = !1), _(t), (t.rotateMouseMoveFunction = void 0), (t.rotateMouseUpFunction = void 0);
                }),
                I(t);
            })(this, a, l);
          }
        };
        var T = new e.Matrix4(),
          D = new e.Matrix4(),
          R = new e.Cartesian3();
        (L.prototype.handleDoubleClick = function (t, i) {
          var n = t.terria.scene,
            o = n.camera,
            a = n.screenSpaceCameraController;
          if (n.mode === e.SceneMode.MORPHING || !a.enableInputs) return !0;
          if (t.navigationLocked) return !0;
          if (n.mode !== e.SceneMode.COLUMBUS_VIEW || a.enableTranslate) {
            if (n.mode === e.SceneMode.SCENE3D || n.mode === e.SceneMode.COLUMBUS_VIEW) {
              if (!a.enableLook) return;
              if (n.mode === e.SceneMode.SCENE3D && !a.enableRotate) return;
            }
            var r = y.getCameraFocus(t.terria, !0, R);
            if ((0, e.defined)(r)) {
              var s = n.globe.ellipsoid.cartographicToCartesian(o.positionCartographic, new e.Cartesian3()),
                d = n.globe.ellipsoid.geodeticSurfaceNormal(r),
                c = new e.BoundingSphere(r, 0);
              o.flyToBoundingSphere(c, {
                offset: new e.HeadingPitchRange(
                  0,
                  e.Math.PI_OVER_TWO - e.Cartesian3.angleBetween(d, o.directionWC),
                  e.Cartesian3.distance(s, r),
                ),
                duration: 1.5,
              });
            } else this.controls[1].resetView();
          }
        }),
          (L.create = function (e) {
            var t = new L(e);
            return t.show(e.container), t;
          });
        const z = (e) => {
            document.addEventListener('mousemove', e.orbitMouseMoveFunction, !1),
              document.addEventListener('touchmove', e.orbitMouseMoveFunction, !1),
              document.addEventListener('mouseup', e.orbitMouseUpFunction, !1),
              document.addEventListener('touchend', e.orbitMouseUpFunction, !1);
          },
          I = (e) => {
            document.addEventListener('mousemove', e.rotateMouseMoveFunction, !1),
              document.addEventListener('touchmove', e.rotateMouseMoveFunction, !1),
              document.addEventListener('mouseup', e.rotateMouseUpFunction, !1),
              document.addEventListener('touchend', e.rotateMouseUpFunction, !1);
          },
          O = (e) => {
            document.removeEventListener('mousemove', e.orbitMouseMoveFunction, !1),
              document.removeEventListener('touchmove', e.orbitMouseMoveFunction, !1),
              document.removeEventListener('mouseup', e.orbitMouseUpFunction, !1),
              document.removeEventListener('touchend', e.orbitMouseUpFunction, !1);
          },
          _ = (e) => {
            document.removeEventListener('mousemove', e.rotateMouseMoveFunction, !1),
              document.removeEventListener('touchmove', e.rotateMouseMoveFunction, !1),
              document.removeEventListener('mouseup', e.rotateMouseUpFunction, !1),
              document.removeEventListener('touchend', e.rotateMouseUpFunction, !1);
          };
        const A = L;
        var N = e.Event,
          U = function (e) {
            W.apply(this, arguments), (this._onDestroyListeners = []);
          };
        function W(t, i) {
          if (!(0, e.defined)(t)) throw new e.DeveloperError('CesiumWidget or Viewer is required.');
          var n = (0, e.defined)(t.cesiumWidget) ? t.cesiumWidget : t,
            o = document.createElement('div');
          (o.className = 'cesium-widget-cesiumNavigationContainer'),
            n.container.appendChild(o),
            (this.terria = t),
            (this.terria.options = (0, e.defined)(i) ? i : {}),
            (this.terria.afterWidgetChanged = new N()),
            (this.terria.beforeWidgetChanged = new N()),
            (this.container = o),
            ((0, e.defined)(this.terria.options.enableDistanceLegend) && !this.terria.options.enableDistanceLegend) ||
              ((this.distanceLegendDiv = document.createElement('div')),
              o.appendChild(this.distanceLegendDiv),
              this.distanceLegendDiv.setAttribute('id', 'distanceLegendDiv'),
              (this.distanceLegendViewModel = l.create({
                container: this.distanceLegendDiv,
                terria: this.terria,
                mapElement: o,
                enableDistanceLegend: !0,
              }))),
            ((0, e.defined)(this.terria.options.enableZoomControls) && !this.terria.options.enableZoomControls) ||
            ((0, e.defined)(this.terria.options.enableCompass) && !this.terria.options.enableCompass)
              ? !(0, e.defined)(this.terria.options.enableZoomControls) ||
                this.terria.options.enableZoomControls ||
                ((0, e.defined)(this.terria.options.enableCompass) && !this.terria.options.enableCompass)
                ? ((0, e.defined)(this.terria.options.enableZoomControls) && !this.terria.options.enableZoomControls) ||
                  !(0, e.defined)(this.terria.options.enableCompass) ||
                  this.terria.options.enableCompass
                  ? (0, e.defined)(this.terria.options.enableZoomControls) &&
                    !this.terria.options.enableZoomControls &&
                    (0, e.defined)(this.terria.options.enableCompass) &&
                    this.terria.options.enableCompass
                  : ((this.navigationDiv = document.createElement('div')),
                    this.navigationDiv.setAttribute('id', 'navigationDiv'),
                    o.appendChild(this.navigationDiv),
                    (this.navigationViewModel = A.create({
                      container: this.navigationDiv,
                      terria: this.terria,
                      enableZoomControls: !0,
                      enableCompass: !1,
                    })))
                : ((this.navigationDiv = document.createElement('div')),
                  this.navigationDiv.setAttribute('id', 'navigationDiv'),
                  o.appendChild(this.navigationDiv),
                  (this.navigationViewModel = A.create({
                    container: this.navigationDiv,
                    terria: this.terria,
                    enableZoomControls: !1,
                    enableCompass: !0,
                  })))
              : ((this.navigationDiv = document.createElement('div')),
                this.navigationDiv.setAttribute('id', 'navigationDiv'),
                o.appendChild(this.navigationDiv),
                (this.navigationViewModel = A.create({
                  container: this.navigationDiv,
                  terria: this.terria,
                  enableZoomControls: !0,
                  enableCompass: !0,
                })));
        }
        (U.prototype.distanceLegendViewModel = void 0),
          (U.prototype.navigationViewModel = void 0),
          (U.prototype.navigationDiv = void 0),
          (U.prototype.distanceLegendDiv = void 0),
          (U.prototype.terria = void 0),
          (U.prototype.container = void 0),
          (U.prototype._onDestroyListeners = void 0),
          (U.prototype._navigationLocked = !1),
          (U.prototype.setNavigationLocked = function (e) {
            (this._navigationLocked = e), this.navigationViewModel.setNavigationLocked(this._navigationLocked);
          }),
          (U.prototype.getNavigationLocked = function () {
            return this._navigationLocked;
          }),
          (U.prototype.destroy = function () {
            (0, e.defined)(this.navigationViewModel) && this.navigationViewModel.destroy(),
              (0, e.defined)(this.distanceLegendViewModel) && this.distanceLegendViewModel.destroy(),
              (0, e.defined)(this.navigationDiv) && this.navigationDiv.parentNode.removeChild(this.navigationDiv),
              delete this.navigationDiv,
              (0, e.defined)(this.distanceLegendDiv) &&
                this.distanceLegendDiv.parentNode.removeChild(this.distanceLegendDiv),
              delete this.distanceLegendDiv,
              (0, e.defined)(this.container) && this.container.parentNode.removeChild(this.container),
              delete this.container;
            for (var t = 0; t < this._onDestroyListeners.length; t++) this._onDestroyListeners[t]();
          }),
          (U.prototype.addOnDestroyListener = function (e) {
            'function' == typeof e && this._onDestroyListeners.push(e);
          });
        const V = U;
      })(),
      (o = o.default)
    );
  })(),
);
