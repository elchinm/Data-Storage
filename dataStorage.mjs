import CryptoJS from "https://cdn.jsdelivr.net/npm/crypto-js@4.2.0/index.min.js"

export default class Storage {
    memoryStorage = new MemoryStorage;
    cookieStorage = new CookieStorage;
    storageTypes = {"Session":sessionStorage, "Local":localStorage, "Memory": this.memoryStorage, "Cookie": this.cookieStorage};
    #encode = true;  
    #delimiter = '.';
    #encryptKey = "";

    constructor(storage) {
        this.storage = this.storageTypes[storage];
    }

    setEncryptKey(passphrase) {
        this.#encryptKey = passphrase;
    }

    setEncode(encode) {
        this.#encode = encode;
    }

    setDelimiter(delimiter) {
        if (delimiter) this.#delimiter = delimiter;
    }

    static encoder(obj, encode, encryptKey) {
        let value = JSON.stringify(obj);
        if (encryptKey) value = CryptoJS.AES.encrypt(value, encryptKey).toString() 
        else if (encode) value = encodeURIComponent(value);
        return value;
    }

    static decoder(value, encode, encryptKey) {
        if (encryptKey) value = (CryptoJS.AES.decrypt(value, encryptKey)).toString(CryptoJS.enc.Utf8)
        else if (encode) value = decodeURIComponent(value);
        return JSON.parse(value); 
    }

    setItem(field, key, value, expiry) {
        let obj = {"value": value, "exp": expiry};
        if (this.storage instanceof CookieStorage) obj = {"value": value};
        this.storage.setItem(field+this.#delimiter+key, Storage.encoder(obj, this.#encode, this.#encryptKey), expiry);
    }

    getItem(field, key) {
        return Storage.decoder( this.storage.getItem(field+this.#delimiter+key), this.#encode, this.#encryptKey);
    }

    removeItem(field, key) {
        this.storage.removeItem(field+this.#delimiter+key);
    }

    removeItems(field) {
        if (this.storage instanceof CookieStorage) this.storage.reloadItems(field, this.#delimiter);
        let keys = Object.keys(this.storage).filter(k => k.startsWith(field+this.#delimiter));
        keys.forEach(key => this.storage.removeItem(key));
    }

    getItems(field) {
        let results = [], keys;
        if (this.storage instanceof CookieStorage) this.storage.reloadItems(field, this.#delimiter);
        keys = Object.keys(this.storage).filter(k => k.startsWith(field+this.#delimiter));
        keys.forEach(key => results[key] = Storage.decoder(this.storage[key], this.#encode, this.#encryptKey));
        return results;
    }

    
}

class MemoryStorage {
   
    setItem(fieldKey, value) {
        this[fieldKey] = value;
    };

    getItem(fieldKey) {
        if (this[fieldKey]) return this[fieldKey];
        return null;
    };

    removeItem(fieldKey) {
       delete this[fieldKey];
    };

}

class CookieStorage {
   
    reloadItems(field, delimiter) {
        let cookies = document.cookie.split(";");
        cookies.forEach(c => {
            var cookie = c.trim().split("=");
            if (cookie[0].startsWith(field+delimiter)) this[decodeURIComponent(cookie[0])] = decodeURIComponent(cookie[1]);
        });
   }

    setItem(fieldKey, value, exp) {
        if (exp instanceof Date) exp = exp.toUTCString();   
        let updatedCookie = fieldKey + "=" + value + "; path=/; expires=" + exp;   
        document.cookie = updatedCookie;
    }

    getItem(fieldKey) {       
        let matches = document.cookie.match(new RegExp(
          "(?:^|; )" + fieldKey.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
        ));
        return matches ? decodeURIComponent(matches[1]) : null;
    }

    removeItem(fieldKey) {
     //   document.cookie = fieldKey + "=1; path=/; max-age=-1"
        this.setItem(fieldKey, "", new Date);
    }

}
