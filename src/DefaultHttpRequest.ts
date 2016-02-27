import {Promise} from 'es6-promise';

export class DefaultHttpRequest
{
  setHeaders(xhr: XMLHttpRequest, headers: any): void {
        let keys = Object.keys(headers);

        for (var i = 0; i < keys.length; i++) {
            let key = keys[i];
            let value = headers[key];

            xhr.setRequestHeader(key, value);
        }
  }

  getJSON(url: string, config: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.responseType = "json";

        if (config) {
          if (config.headers) {
            this.setHeaders(xhr, config.headers);
          }
        }

        xhr.onload = function() {
          try {
            if (xhr.status === 200) {
              var response = "";
              // To support IE9 get the response from xhr.responseText not xhr.response
              if (window['XDomainRequest']) {
                response = xhr.responseText;
              } else {
                response = xhr.response;
              }
              if (typeof response === "string") {
                response = JSON.parse(response);
              }
              resolve(response);
            }
            else {
              reject(Error(xhr.statusText + "(" + xhr.status + ")"));
            }
          }
          catch (err) {
            reject(err);
          }
        };

        xhr.onerror = function() {
          reject(Error("Network error"));
        };

        xhr.send();
      }
      catch (err) {
        return reject(err);
      }

    });
  }
}