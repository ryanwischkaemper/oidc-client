interface IUtil {
    sha256(val: string): string;
  }

interface ICrypto {
  Util:IUtil
}


interface IKJUR{
  crypto: ICrypto
  jws: any;
}

declare var KJUR: IKJUR;
declare var hextob64u: any;
