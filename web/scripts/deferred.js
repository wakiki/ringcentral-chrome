function Deferred() {
    this.hasResult = false;
    this.rejected = false;
    
    this.value = undefined;
    this.callbacks = [];
    this.rejectCallbacks = [];
    
    function Promise(deferred) {
        this.deferred = deferred;
    }
    
    Promise.prototype.then = function (callback, rejectCallback) {
        var resultDeferred = new Deferred();

        var wrap = function (callback) {
            if (typeof callback === "function") {
                return function (value) {
                    try {
                        var result = callback ? callback(value) : undefined;

                        if (isPromise(result)) {
                            result.then(function (result2) {
                                resultDeferred.resolve(result2);
                            }, function (cause) {
                                resultDeferred.reject(cause);
                            });
                        } else {
                            resultDeferred.resolve(result);
                        }
                    } catch (e) {
                        resultDeferred.reject(e);
                    }
                };
            } else {
                return null;
            }
        };

        var wrappedCallback = wrap(callback);
        var wrappedRejectCallback = wrap(rejectCallback);

        if (this.deferred.hasResult) {
            this.deferred.rejected
                ? wrappedRejectCallback && wrappedRejectCallback(this.deferred.value)
                : wrappedCallback && wrappedCallback(this.deferred.value);
        } else {
            wrappedCallback && this.deferred.callbacks.push(wrappedCallback);
            wrappedRejectCallback && this.deferred.rejectCallbacks.push(wrappedRejectCallback);
        }

        return resultDeferred.promise;
    };
    
    Promise.prototype.done = function (callback) {
        this.then(callback);
        return this;
    };
    
    Promise.prototype.fail = function (callback) {
        this.then(null, callback);
        return this;
    };

    Promise.prototype.__IS_PROMISE__ = true;

    function isPromise(p) {
        return p && p.__IS_PROMISE__ ? true : false;
    }

    this.promise = new Promise(this);
}

Deferred.prototype._setResult = function (value, rejected) {
    if (this.hasResult) {
        throw new Error("You can't resolve or reject deferred more than once");
    }

    this.value = value;
    this.rejected = rejected;
    this.hasResult = true;

    var self = this;
    (rejected ? this.rejectCallbacks : this.callbacks).forEach(function (callback) {
        callback(self.value);
    });
    
    // free callbacks for them to be eventually garbage collected
    this.callbacks = this.rejectCallbacks = null;
};

Deferred.prototype.resolve = function (value) {
    this._setResult(value, false);
};

Deferred.prototype.reject = function (value) {
    this._setResult(value, true);
};
