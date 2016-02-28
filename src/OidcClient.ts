import 'crypto-lib';
import 'rsa-lib';
import 'json-sans-eval-lib';
import 'jws-lib';
import {Promise} from 'es6-promise';
import {Utils} from './Utils';
import {DefaultHttpRequest} from './DefaultHttpRequest';

export class OidcClient {
  _settings: any;
  httpRequest: DefaultHttpRequest;

  constructor(settings: any) {
    this.httpRequest = new DefaultHttpRequest();
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

  get _httpRequest(): DefaultHttpRequest{
    if(typeof (this.httpRequest) === "undefined" || this.httpRequest === null) {
      this.httpRequest = new DefaultHttpRequest();
    };
    return this.httpRequest;
  }

  get isOidc(): boolean {
    if (this._settings.response_type) {
      var result = this._settings.response_type.split(/\s+/g).filter(function(item) {
        return item === "id_token";
      });
      return !!(result[0]);
    }
    return false;
  }

  get isOAuth(): boolean {
    if (this._settings.response_type) {
      var result = this._settings.response_type.split(/\s+/g).filter(function(item) {
        return item === "token";
      });
      return !!(result[0]);
    }
    return false;
  }

  static parseOidcResult = Utils.parseOidcResult;

  private getJson(url: string, token?: string): Promise<any> {
    var config = {};

    if (token) {
      config['headers'] = { "Authorization": "Bearer " + token };
    }

    return this._httpRequest.getJSON(url, config);
  }

  loadMetadataAsync(): Promise<any> {
    var settings = this._settings;

    if (settings.metadata) {
      return Promise.resolve(settings.metadata);
    }

    if (!settings.authority) {
      return Promise.reject("No authority configured");
    }

    return this.getJson(settings.authority)
      .then((metadata) => {
        settings.metadata = metadata;
        return metadata;
      }).catch(err => Promise.reject("Failed to load metadata (" + err && err.message + ")"));


  }

  loadX509SigningKeyAsync(): Promise<any> {
    var settings = this._settings;

    function getKeyAsync(jwks) {
      if (!jwks.keys || !jwks.keys.length) {
        return Promise.reject("Signing keys empty");
      }

      var key = jwks.keys[0];
      if (key.kty !== "RSA") {
        return Promise.reject("Signing key not RSA");
      }

      if (!key.x5c || !key.x5c.length) {
        return Promise.reject("RSA keys empty");
      }

      return Promise.resolve(key.x5c[0]);
    }

    if (settings.jwks) {
      return getKeyAsync(settings.jwks);
    }

    return this.loadMetadataAsync().then(metadata => {
      if (!metadata.jwks_uri) {
        return Promise.reject("Metadata does not contain jwks_uri");
      }

      return this.getJson(metadata.jwks_uri).then(jwks => {
        settings.jwks = jwks;
        return getKeyAsync(jwks);
      }).catch(err => Promise.reject("Failed to load signing keys (" + err && err.message + ")"));
    });
  }

  loadUserProfile(accessToken: string, obj:any): Promise<any> {
    return this.loadMetadataAsync().then(metadata => {

      if (!metadata.userinfo_endpoint) {
        return Promise.reject("Metadata does not contain userinfo_endpoint");
      }

      return this.getJson(metadata.userinfo_endpoint, accessToken);
    });
  }

  loadAuthorizationEndpoint(): Promise<any> {
    if (this._settings.authorization_endpoint) {
      return Promise.resolve(this._settings.authorization_endpoint);
    }

    if (!this._settings.authority) {
      return Promise.reject("No authorization_endpoint configured");
    }

    return this.loadMetadataAsync().then(metadata => {
      if (!metadata.authorization_endpoint) {
        return Promise.reject("Metadata does not contain authorization_endpoint");
      }

      return metadata.authorization_endpoint;
    });
  }

  createTokenRequestAsync(): Promise<any> {

    var settings = this._settings;

    return this.loadAuthorizationEndpoint().then(authorization_endpoint => {

      var state = Utils.rand();
      var url = authorization_endpoint + "?state=" + encodeURIComponent(state);

      if (this.isOidc) {
        var nonce = Utils.rand();
        url += "&nonce=" + encodeURIComponent(nonce);
      }

      var required = ["client_id", "redirect_uri", "response_type", "scope"];
      required.forEach(key => {
        var value = settings[key];
        if (value) {
          url += "&" + key + "=" + encodeURIComponent(value);
        }
      });

      var optional = ["prompt", "display", "max_age", "ui_locales", "id_token_hint", "login_hint", "acr_values"];
      optional.forEach(key => {
        var value = settings[key];
        if (value) {
          url += "&" + key + "=" + encodeURIComponent(value);
        }
      });

      var request_state = {
        oidc: this.isOidc,
        oauth: this.isOAuth,
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
  }

  createLogoutRequestAsync(idTokenHint: any): Promise<any> {
    var settings = this._settings;
    return this.loadMetadataAsync().then(metadata => {
        if (!metadata.end_session_endpoint) {
            return Promise.reject("No end_session_endpoint in metadata");
        }

        var url = metadata.end_session_endpoint;
        if (idTokenHint && settings.post_logout_redirect_uri) {
            url += "?post_logout_redirect_uri=" + encodeURIComponent(settings.post_logout_redirect_uri);
            url += "&id_token_hint=" + encodeURIComponent(idTokenHint);
        }
        return url;
    });
  }

  validateIdTokenAsync(idToken: string, nonce: string, accessToken?: string): Promise<any> {
var client = this;
    var settings = client._settings;

    return client.loadX509SigningKeyAsync().then(cert => {

        var jws = new KJUR.jws.JWS();
        if (jws.verifyJWSByPemX509Cert(idToken, cert)) {
            var id_token_contents = JSON.parse(jws.parsedJWS.payloadS);

            if (nonce !== id_token_contents.nonce) {
                return Promise.reject("Invalid nonce");
            }

            return client.loadMetadataAsync().then(metadata => {

                if (id_token_contents.iss !== metadata.issuer) {
                    return Promise.reject("Invalid issuer");
                }

                if (id_token_contents.aud !== settings.client_id) {
                    return Promise.reject("Invalid audience");
                }

                var now = parseInt((Date.now() / 1000).toString());

                // accept tokens issues up to 5 mins ago
                var diff = now - id_token_contents.iat;
                if (diff > (5 * 60)) {
                    return Promise.reject("Token issued too long ago");
                }

                if (id_token_contents.exp < now) {
                    return Promise.reject("Token expired");
                }

                if (accessToken && settings.load_user_profile) {
                    // if we have an access token, then call user info endpoint
                    return client.loadUserProfile(accessToken, id_token_contents).then(profile => {
                        return Utils.copy(profile, id_token_contents);
                    });
                }
                else {
                    // no access token, so we have all our claims
                    return id_token_contents;
                }

            });
        }
        else {
            return Promise.reject("JWT failed to validate");
        }

    });
  }

  validateAccessTokenAsync(id_token_contents: any, access_token: string): Promise<any> {
if (!id_token_contents.at_hash) {
        return Promise.reject("No at_hash in id_token");
    }

    var hash = KJUR.crypto.Util.sha256(access_token);
    var left = hash.substr(0, hash.length / 2);
    var left_b64u = hextob64u(left);

    if (left_b64u !== id_token_contents.at_hash) {
        return Promise.reject("at_hash failed to validate");
    }

    return Promise.resolve();
  }

  validateIdTokenAndAccessTokenAsync(id_token: any, nonce: string, access_token: string): Promise<any>{

    return this.validateIdTokenAsync(id_token, nonce, access_token).then(id_token_contents => {

        return this.validateAccessTokenAsync(id_token_contents, access_token).then(() => {

            return id_token_contents;

        });

    });
  }

  processResponseAsync(queryString: string): Promise<any>{

    var settings = this._settings;

    var request_state = settings.request_state_store.getItem(settings.request_state_key);
    settings.request_state_store.removeItem(settings.request_state_key);

    if (!request_state) {
        return Promise.reject("No request state loaded");
    }

    request_state = JSON.parse(request_state);
    if (!request_state) {
        return Promise.reject("No request state loaded");
    }

    if (!request_state.state) {
        return Promise.reject("No state loaded");
    }

    var result = Utils.parseOidcResult(queryString);
    if (!result) {
        return Promise.reject("No OIDC response");
    }

    if (result.error) {
        return Promise.reject(result.error);
    }

    if (result.state !== request_state.state) {
        return Promise.reject("Invalid state");
    }

    if (request_state.oidc) {
        if (!result.id_token) {
            return Promise.reject("No identity token");
        }

        if (!request_state.nonce) {
            return Promise.reject("No nonce loaded");
        }
    }

    if (request_state.oauth) {
        if (!result.access_token) {
            return Promise.reject("No access token");
        }

        if (!result.token_type || result.token_type.toLowerCase() !== "bearer") {
            return Promise.reject("Invalid token type");
        }

        if (!result.expires_in) {
            return Promise.reject("No token expiration");
        }
    }

    var promise = Promise.resolve();
    if (request_state.oidc && request_state.oauth) {
        promise = this.validateIdTokenAndAccessTokenAsync(result.id_token, request_state.nonce, result.access_token);
    }
    else if (request_state.oidc) {
        promise = this.validateIdTokenAsync(result.id_token, request_state.nonce);
    }

    return promise.then(profile => {
        if (profile && settings.filter_protocol_claims) {
            var remove = ["nonce", "at_hash", "iat", "nbf", "exp", "aud", "iss"];
            remove.forEach(key => {
                delete profile[key];
            });
        }

        return {
            profile: profile,
            id_token: result.id_token,
            access_token: result.access_token,
            expires_in: result.expires_in,
            scope: result.scope,
            session_state : result.session_state
        };
    });
  }

}