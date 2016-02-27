!function(e){function r(e,r,t){e in i||(i[e]={name:e,declarative:!0,deps:r,declare:t,normalizedDeps:r})}function t(e){return c[e]||(c[e]={name:e,dependencies:[],exports:{},importers:[]})}function n(r){if(!r.module){var o=r.module=t(r.name),a=r.module.exports,s=r.declare.call(e,function(e,r){if(o.locked=!0,"object"==typeof e)for(var t in e)a[t]=e[t];else a[e]=r;for(var n=0,u=o.importers.length;u>n;n++){var i=o.importers[n];if(!i.locked)for(var s=0;s<i.dependencies.length;++s)i.dependencies[s]===o&&i.setters[s](a)}return o.locked=!1,r},r.name);o.setters=s.setters,o.execute=s.execute;for(var l=0,d=r.normalizedDeps.length;d>l;l++){var f,p=r.normalizedDeps[l],v=i[p],m=c[p];m?f=m.exports:v&&!v.declarative?f=v.esModule:v?(n(v),m=v.module,f=m.exports):f=u(p),m&&m.importers?(m.importers.push(o),o.dependencies.push(m)):o.dependencies.push(null),o.setters[l]&&o.setters[l](f)}}}function o(e){var r={};if("object"==typeof e||"function"==typeof e)if(l){var t;for(var n in e)(t=Object.getOwnPropertyDescriptor(e,n))&&f(r,n,t)}else{var o=e&&e.hasOwnProperty;for(var n in e)(!o||e.hasOwnProperty(n))&&(r[n]=e[n])}return r["default"]=e,f(r,"__useDefault",{value:!0}),r}function a(r,t){var n=i[r];if(n&&!n.evaluated&&n.declarative){t.push(r);for(var o=0,l=n.normalizedDeps.length;l>o;o++){var d=n.normalizedDeps[o];-1==s.call(t,d)&&(i[d]?a(d,t):u(d))}n.evaluated||(n.evaluated=!0,n.module.execute.call(e))}}function u(e){if(v[e])return v[e];if("@node/"==e.substr(0,6))return p(e.substr(6));var r=i[e];if(!r)throw"Module "+e+" not present.";return n(i[e]),a(e,[]),i[e]=void 0,r.declarative&&f(r.module.exports,"__esModule",{value:!0}),v[e]=r.declarative?r.module.exports:r.esModule}var i={},s=Array.prototype.indexOf||function(e){for(var r=0,t=this.length;t>r;r++)if(this[r]===e)return r;return-1},l=!0;try{Object.getOwnPropertyDescriptor({a:0},"a")}catch(d){l=!1}var f;!function(){try{Object.defineProperty({},"a",{})&&(f=Object.defineProperty)}catch(e){f=function(e,r,t){try{e[r]=t.value||t.get.call(e)}catch(n){}}}}();var c={},p="undefined"!=typeof System&&System._nodeRequire||"undefined"!=typeof require&&require.resolve&&"undefined"!=typeof process&&require,v={"@empty":{}};return function(e,t,n){return function(a){a(function(a){for(var i=0;i<t.length;i++)(function(e,r){r&&r.__esModule?v[e]=r:v[e]=o(r)})(t[i],arguments[i]);n({register:r});var s=u(e[0]);if(e.length>1)for(var i=1;i<e.length;i++)u(e[i]);return s.__useDefault?s["default"]:s})}}}("undefined"!=typeof self?self:global)

(["1","2","3","4"], [], function($__System) {

$__System.register("4", [], function($__export) {
  "use strict";
  return {
    setters: [],
    execute: function() {
      define(["require", "exports", 'es6-promise'], function(require, exports, es6_promise_1) {
        "use strict";
        var DefaultHttpRequest = (function() {
          function DefaultHttpRequest() {}
          DefaultHttpRequest.prototype.setHeaders = function(xhr, headers) {
            var keys = Object.keys(headers);
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i];
              var value = headers[key];
              xhr.setRequestHeader(key, value);
            }
          };
          DefaultHttpRequest.prototype.getJSON = function(url, config) {
            var _this = this;
            return new es6_promise_1.Promise(function(resolve, reject) {
              try {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", url);
                xhr.responseType = "json";
                if (config) {
                  if (config.headers) {
                    _this.setHeaders(xhr, config.headers);
                  }
                }
                xhr.onload = function() {
                  try {
                    if (xhr.status === 200) {
                      var response = "";
                      if (window['XDomainRequest']) {
                        response = xhr.responseText;
                      } else {
                        response = xhr.response;
                      }
                      if (typeof response === "string") {
                        response = JSON.parse(response);
                      }
                      resolve(response);
                    } else {
                      reject(Error(xhr.statusText + "(" + xhr.status + ")"));
                    }
                  } catch (err) {
                    reject(err);
                  }
                };
                xhr.onerror = function() {
                  reject(Error("Network error"));
                };
                xhr.send();
              } catch (err) {
                return reject(err);
              }
            });
          };
          return DefaultHttpRequest;
        }());
        exports.DefaultHttpRequest = DefaultHttpRequest;
      });
    }
  };
});

$__System.register("3", [], function($__export) {
  "use strict";
  return {
    setters: [],
    execute: function() {
      define(["require", "exports", 'es6-promise', './Utils'], function(require, exports, es6_promise_1, Utils_1) {
        "use strict";
        var OidcClient = (function() {
          function OidcClient(settings) {
            this._settings = settings || {};
            if (!this._settings.request_state_key) {
              this._settings.request_state_key = "OidcClient.request_state";
            }
            if (!this._settings.request_state_store) {
              this._settings.request_state_store = window.localStorage;
            }
            if (typeof this._settings.load_user_profile === 'undefined') {
              this._settings.load_user_profile = true;
            }
            if (typeof this._settings.filter_protocol_claims === 'undefined') {
              this._settings.filter_protocol_claims = true;
            }
            if (this._settings.authority && this._settings.authority.indexOf('.well-known/openid-configuration') < 0) {
              if (this._settings.authority[this._settings.authority.length - 1] !== '/') {
                this._settings.authority += '/';
              }
              this._settings.authority += '.well-known/openid-configuration';
            }
            if (!this._settings.response_type) {
              this._settings.response_type = "id_token token";
            }
          }
          Object.defineProperty(OidcClient.prototype, "isOidc", {
            get: function() {
              if (this._settings.response_type) {
                var result = this._settings.response_type.split(/\s+/g).filter(function(item) {
                  return item === "id_token";
                });
                return !!(result[0]);
              }
              return false;
            },
            enumerable: true,
            configurable: true
          });
          Object.defineProperty(OidcClient.prototype, "isOAuth", {
            get: function() {
              if (this._settings.response_type) {
                var result = this._settings.response_type.split(/\s+/g).filter(function(item) {
                  return item === "token";
                });
                return !!(result[0]);
              }
              return false;
            },
            enumerable: true,
            configurable: true
          });
          OidcClient.prototype.getJson = function(url, token) {
            var config = {};
            if (token) {
              config['headers'] = {"Authorization": "Bearer " + token};
            }
            return this._httpRequest.getJSON(url, config);
          };
          OidcClient.prototype.loadMetadataAsync = function() {
            var settings = this._settings;
            if (settings.metadata) {
              return es6_promise_1.Promise.resolve(settings.metadata);
            }
            if (!settings.authority) {
              return es6_promise_1.Promise.reject("No authority configured");
            }
            return this.getJson(settings.authority).then(function(metadata) {
              settings.metadata = metadata;
              return metadata;
            }).catch(function(err) {
              return es6_promise_1.Promise.reject("Failed to load metadata (" + err && err.message + ")");
            });
          };
          OidcClient.prototype.loadX509SigningKeyAsync = function() {
            var _this = this;
            var settings = this._settings;
            function getKeyAsync(jwks) {
              if (!jwks.keys || !jwks.keys.length) {
                return es6_promise_1.Promise.reject("Signing keys empty");
              }
              var key = jwks.keys[0];
              if (key.kty !== "RSA") {
                return es6_promise_1.Promise.reject("Signing key not RSA");
              }
              if (!key.x5c || !key.x5c.length) {
                return es6_promise_1.Promise.reject("RSA keys empty");
              }
              return es6_promise_1.Promise.resolve(key.x5c[0]);
            }
            if (settings.jwks) {
              return getKeyAsync(settings.jwks);
            }
            return this.loadMetadataAsync().then(function(metadata) {
              if (!metadata.jwks_uri) {
                return es6_promise_1.Promise.reject("Metadata does not contain jwks_uri");
              }
              return _this.getJson(metadata.jwks_uri).then(function(jwks) {
                settings.jwks = jwks;
                return getKeyAsync(jwks);
              }).catch(function(err) {
                return es6_promise_1.Promise.reject("Failed to load signing keys (" + err && err.message + ")");
              });
            });
          };
          OidcClient.prototype.loadUserProfile = function(accessToken, obj) {
            var _this = this;
            return this.loadMetadataAsync().then(function(metadata) {
              if (!metadata.userinfo_endpoint) {
                return es6_promise_1.Promise.reject("Metadata does not contain userinfo_endpoint");
              }
              return _this.getJson(metadata.userinfo_endpoint, accessToken);
            });
          };
          OidcClient.prototype.loadAuthorizationEndpoint = function() {
            if (this._settings.authorization_endpoint) {
              return es6_promise_1.Promise.resolve(this._settings.authorization_endpoint);
            }
            if (!this._settings.authority) {
              return es6_promise_1.Promise.reject("No authorization_endpoint configured");
            }
            return this.loadMetadataAsync().then(function(metadata) {
              if (!metadata.authorization_endpoint) {
                return es6_promise_1.Promise.reject("Metadata does not contain authorization_endpoint");
              }
              return metadata.authorization_endpoint;
            });
          };
          OidcClient.prototype.createTokenRequestAsync = function() {
            var _this = this;
            var settings = this._settings;
            return this.loadAuthorizationEndpoint().then(function(authorization_endpoint) {
              var state = Utils_1.Utils.rand();
              var url = authorization_endpoint + "?state=" + encodeURIComponent(state);
              if (_this.isOidc) {
                var nonce = Utils_1.Utils.rand();
                url += "&nonce=" + encodeURIComponent(nonce);
              }
              var required = ["client_id", "redirect_uri", "response_type", "scope"];
              required.forEach(function(key) {
                var value = settings[key];
                if (value) {
                  url += "&" + key + "=" + encodeURIComponent(value);
                }
              });
              var optional = ["prompt", "display", "max_age", "ui_locales", "id_token_hint", "login_hint", "acr_values"];
              optional.forEach(function(key) {
                var value = settings[key];
                if (value) {
                  url += "&" + key + "=" + encodeURIComponent(value);
                }
              });
              var request_state = {
                oidc: _this.isOidc,
                oauth: _this.isOAuth,
                state: state
              };
              if (nonce) {
                request_state["nonce"] = nonce;
              }
              settings.request_state_store.setItem(settings.request_state_key, JSON.stringify(request_state));
              return {
                request_state: request_state,
                url: url
              };
            });
          };
          OidcClient.prototype.createLogoutRequestAsync = function(idTokenHint) {
            var settings = this._settings;
            return this.loadMetadataAsync().then(function(metadata) {
              if (!metadata.end_session_endpoint) {
                return es6_promise_1.Promise.reject("No end_session_endpoint in metadata");
              }
              var url = metadata.end_session_endpoint;
              if (idTokenHint && settings.post_logout_redirect_uri) {
                url += "?post_logout_redirect_uri=" + encodeURIComponent(settings.post_logout_redirect_uri);
                url += "&id_token_hint=" + encodeURIComponent(idTokenHint);
              }
              return url;
            });
          };
          OidcClient.prototype.validateIdTokenAsync = function(idToken, nonce, accessToken) {
            var client = this;
            var settings = client._settings;
            return client.loadX509SigningKeyAsync().then(function(cert) {
              var jws = new KJUR.jws.JWS();
              if (jws.verifyJWSByPemX509Cert(idToken, cert)) {
                var id_token_contents = JSON.parse(jws.parsedJWS.payloadS);
                if (nonce !== id_token_contents.nonce) {
                  return es6_promise_1.Promise.reject("Invalid nonce");
                }
                return client.loadMetadataAsync().then(function(metadata) {
                  if (id_token_contents.iss !== metadata.issuer) {
                    return es6_promise_1.Promise.reject("Invalid issuer");
                  }
                  if (id_token_contents.aud !== settings.client_id) {
                    return es6_promise_1.Promise.reject("Invalid audience");
                  }
                  var now = parseInt((Date.now() / 1000).toString());
                  var diff = now - id_token_contents.iat;
                  if (diff > (5 * 60)) {
                    return es6_promise_1.Promise.reject("Token issued too long ago");
                  }
                  if (id_token_contents.exp < now) {
                    return es6_promise_1.Promise.reject("Token expired");
                  }
                  if (accessToken && settings.load_user_profile) {
                    return client.loadUserProfile(accessToken, id_token_contents).then(function(profile) {
                      return Utils_1.Utils.copy(profile, id_token_contents);
                    });
                  } else {
                    return id_token_contents;
                  }
                });
              } else {
                return es6_promise_1.Promise.reject("JWT failed to validate");
              }
            });
          };
          OidcClient.prototype.validateAccessTokenAsync = function(id_token_contents, access_token) {
            if (!id_token_contents.at_hash) {
              return es6_promise_1.Promise.reject("No at_hash in id_token");
            }
            var hash = KJUR.crypto.Util.sha256(access_token);
            var left = hash.substr(0, hash.length / 2);
            var left_b64u = hextob64u(left);
            if (left_b64u !== id_token_contents.at_hash) {
              return es6_promise_1.Promise.reject("at_hash failed to validate");
            }
            return es6_promise_1.Promise.resolve();
          };
          OidcClient.prototype.validateIdTokenAndAccessTokenAsync = function(id_token, nonce, access_token) {
            var _this = this;
            return this.validateIdTokenAsync(id_token, nonce, access_token).then(function(id_token_contents) {
              return _this.validateAccessTokenAsync(id_token_contents, access_token).then(function() {
                return id_token_contents;
              });
            });
          };
          OidcClient.prototype.processResponseAsync = function(queryString) {
            var settings = this._settings;
            var request_state = settings.request_state_store.getItem(settings.request_state_key);
            settings.request_state_store.removeItem(settings.request_state_key);
            if (!request_state) {
              return es6_promise_1.Promise.reject("No request state loaded");
            }
            request_state = JSON.parse(request_state);
            if (!request_state) {
              return es6_promise_1.Promise.reject("No request state loaded");
            }
            if (!request_state.state) {
              return es6_promise_1.Promise.reject("No state loaded");
            }
            var result = Utils_1.Utils.parseOidcResult(queryString);
            if (!result) {
              return es6_promise_1.Promise.reject("No OIDC response");
            }
            if (result.error) {
              return es6_promise_1.Promise.reject(result.error);
            }
            if (result.state !== request_state.state) {
              return es6_promise_1.Promise.reject("Invalid state");
            }
            if (request_state.oidc) {
              if (!result.id_token) {
                return es6_promise_1.Promise.reject("No identity token");
              }
              if (!request_state.nonce) {
                return es6_promise_1.Promise.reject("No nonce loaded");
              }
            }
            if (request_state.oauth) {
              if (!result.access_token) {
                return es6_promise_1.Promise.reject("No access token");
              }
              if (!result.token_type || result.token_type.toLowerCase() !== "bearer") {
                return es6_promise_1.Promise.reject("Invalid token type");
              }
              if (!result.expires_in) {
                return es6_promise_1.Promise.reject("No token expiration");
              }
            }
            var promise = es6_promise_1.Promise.resolve();
            if (request_state.oidc && request_state.oauth) {
              promise = this.validateIdTokenAndAccessTokenAsync(result.id_token, request_state.nonce, result.access_token);
            } else if (request_state.oidc) {
              promise = this.validateIdTokenAsync(result.id_token, request_state.nonce);
            }
            return promise.then(function(profile) {
              if (profile && settings.filter_protocol_claims) {
                var remove = ["nonce", "at_hash", "iat", "nbf", "exp", "aud", "iss"];
                remove.forEach(function(key) {
                  delete profile[key];
                });
              }
              return {
                profile: profile,
                id_token: result.id_token,
                access_token: result.access_token,
                expires_in: result.expires_in,
                scope: result.scope,
                session_state: result.session_state
              };
            });
          };
          OidcClient.parseOidcResult = Utils_1.Utils.parseOidcResult;
          return OidcClient;
        }());
        exports.OidcClient = OidcClient;
      });
    }
  };
});

$__System.register("2", [], function($__export) {
  "use strict";
  return {
    setters: [],
    execute: function() {
      define(["require", "exports"], function(require, exports) {
        "use strict";
        var Utils = (function() {
          function Utils() {}
          Utils.copy = function(obj, target) {
            target = target || {};
            for (var key in obj) {
              if (obj.hasOwnProperty(key)) {
                target[key] = obj[key];
              }
            }
            return target;
          };
          Utils.rand = function() {
            return ((Date.now() + Math.random()) * Math.random()).toString().replace(".", "");
          };
          Utils.parseOidcResult = function(queryString) {
            queryString = queryString || location.hash;
            var idx = queryString.lastIndexOf("#");
            if (idx >= 0) {
              queryString = queryString.substr(idx + 1);
            }
            var params = {},
                regex = /([^&=]+)=([^&]*)/g,
                m;
            var counter = 0;
            while (m = regex.exec(queryString)) {
              params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
              if (counter++ > 50) {
                return {error: "Response exceeded expected number of parameters"};
              }
            }
            for (var prop in params) {
              return params;
            }
          };
          return Utils;
        }());
        exports.Utils = Utils;
      });
    }
  };
});

})
(function(factory) {
  if (typeof define == 'function' && define.amd)
    define([], factory);
  else if (typeof module == 'object' && module.exports && typeof require == 'function')
    module.exports = factory();
  else
    factory();
});