export class Utils {
  static copy(obj: any, target?: any): any {
    target = target || {};
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            target[key] = obj[key];
        }
    }
    return target;
  }

  static rand(): string {
    return ((Date.now() + Math.random()) * Math.random()).toString().replace(".", "");
  }

  static parseOidcResult(queryString: string): any{
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
            return {
                error: "Response exceeded expected number of parameters"
            };
        }
    }

    for (var prop in params) {
        return params;
    }
  }
}