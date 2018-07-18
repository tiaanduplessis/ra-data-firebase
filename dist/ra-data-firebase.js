function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var firebase = _interopDefault(require('firebase'));
var sortBy = _interopDefault(require('sort-by'));
var reactAdmin = require('react-admin');
var deepAssign = _interopDefault(require('deep-assign'));

var getImageSize = function (file) { return new Promise(function (resolve) {
    var img = document.createElement('img');
    img.onload = function () {
        resolve({
            width: this.width,
            height: this.height
        });
    };
    img.src = file.src;
}); };
var upload = function (fieldName, submitedData, id, resourceName, resourcePath) { return new Promise(function ($return, $error) {
    var file, result;
    file = submitedData[fieldName] && Array.isArray(submitedData[fieldName]) ? submitedData[fieldName][0] : submitedData[fieldName];
    result = {};
    if (file && file.rawFile && file.rawFile.name) {
        var rawFile, ref, snapshot;
        rawFile = file.rawFile;
        ref = firebase.storage().ref().child((resourcePath + "/" + id + "/" + fieldName));
        return ref.put(rawFile).then((function ($await_4) {
            try {
                snapshot = $await_4;
                result[fieldName] = [{}];
                result[fieldName][0].uploadedAt = Date.now();
                result[fieldName][0].src = snapshot.downloadURL.split('?').shift() + '?alt=media';
                result[fieldName][0].type = rawFile.type;
                if (rawFile.type.indexOf('image/') === 0) {
                    var $Try_1_Post = (function () {
                        try {
                            return $If_3.call(this);
                        } catch ($boundEx) {
                            return $error($boundEx);
                        }
                    }).bind(this);
                    var $Try_1_Catch = function (e) {
                        try {
                            console.error("Failed to get image dimensions");
                            return $Try_1_Post();
                        } catch ($boundEx) {
                            return $error($boundEx);
                        }
                    };
                    try {
                        var imageSize;
                        return getImageSize(file).then(function ($await_5) {
                            try {
                                imageSize = $await_5;
                                result[fieldName][0].width = imageSize.width;
                                result[fieldName][0].height = imageSize.height;
                                return $Try_1_Post();
                            } catch ($boundEx) {
                                return $Try_1_Catch($boundEx);
                            }
                        }, $Try_1_Catch);
                    } catch (e) {
                        $Try_1_Catch(e);
                    }
                }
                function $If_3() {
                    return $return(result);
                }
                
                return $If_3.call(this);
            } catch ($boundEx) {
                return $error($boundEx);
            }
        }).bind(this), $error);
    }
    return $return(false);
}); };
var save = function (id, data, previous, resourceName, resourcePath, firebaseSaveFilter, uploadResults, isNew, metaFieldNames) { return new Promise(function ($return, $error) {
    var obj, obj$1, obj$2;

    var currentUser;
    currentUser = firebase.auth().currentUser;
    if (uploadResults) {
        uploadResults.map(function (uploadResult) { return uploadResult ? Object.assign(data, uploadResult) : false; });
    }
    if (isNew) {
        Object.assign(data, ( obj = {}, obj[metaFieldNames.createdAt] = Date.now(), obj ));
    }
    if (currentUser) {
        Object.assign(data, ( obj$1 = {}, obj$1[metaFieldNames.createdBy] = currentUser.uid, obj$1 ));
    }
    data = Object.assign(previous, ( obj$2 = {}, obj$2[metaFieldNames.updatedAt] = Date.now(), obj$2 ), data);
    if (!data.key) {
        data.key = id;
    }
    if (!data.id) {
        data.id = id;
    }
    return firebase.database().ref((resourcePath + "/" + (data.key))).update(firebaseSaveFilter(data)).then(function ($await_6) {
        try {
            return $return({
                data: data
            });
        } catch ($boundEx) {
            return $error($boundEx);
        }
    }, $error);
}); };
var del = function (id, resourceName, resourcePath, uploadFields) { return new Promise(function ($return, $error) {
    if (uploadFields.length) {
        uploadFields.map(function (fieldName) { return firebase.storage().ref().child((resourcePath + "/" + id + "/" + fieldName)).delete(); });
    }
    return firebase.database().ref((resourcePath + "/" + id)).remove().then(function ($await_7) {
        try {
            return $return({
                data: id
            });
        } catch ($boundEx) {
            return $error($boundEx);
        }
    }, $error);
}); };
var getItemID = function (params, type, resourceName, resourcePath, resourceData) {
    var itemId = params.data.id || params.id || params.data.key || params.key;
    if (!itemId) {
        itemId = firebase.database().ref().child(resourcePath).push().key;
    }
    if (!itemId) {
        throw new Error('ID is required');
    }
    if (resourceData && resourceData[itemId] && type === reactAdmin.CREATE) {
        throw new Error('ID already in use');
    }
    return itemId;
};
var getOne = function (params, resourceName, resourceData) {
    if (params.id && resourceData[params.id]) {
        return {
            data: resourceData[params.id]
        };
    } else {
        throw new Error('Key not found');
    }
};
var getMany = function (params, resourceName, resourceData) {
    var ids = [];
    var data = [];
    var total = 0;
    if (params.ids && Array.isArray(params.ids)) {
        params.ids.forEach(function (key) {
            if (resourceData[key]) {
                ids.push(key);
                data.push(resourceData[key]);
                total++;
            }
        });
        return {
            total: total,
            ids: ids,
            data: data
        };
    } else if (params.pagination) {
        var values = [];
        var filter = Object.assign({}, params.filter);
        if (params.target && params.id) {
            filter[params.target] = params.id;
        }
        var filterKeys = Object.keys(filter);
        if (filterKeys.length) {
            Object.values(resourceData).map(function (value) {
                var filterIndex = 0;
                while (filterIndex < filterKeys.length) {
                    var property = filterKeys[filterIndex];
                    if (property !== 'q' && value[property] !== filter[property]) {
                        return filterIndex;
                    } else if (property === 'q') {
                        if (JSON.stringify(value).indexOf(filter['q']) === -1) {
                            return filterIndex;
                        }
                    }
                    filterIndex++;
                }
                values.push(value);
                return filterIndex;
            });
        } else {
            values = Object.values(resourceData);
        }
        if (params.sort) {
            values.sort(sortBy(("" + (params.sort.order === 'ASC' ? '-' : '') + (params.sort.field))));
        }
        var keys = values.map(function (i) { return i.id; });
        var ref = params.pagination;
        var page = ref.page;
        var perPage = ref.perPage;
        var _start = (page - 1) * perPage;
        var _end = page * perPage;
        data = values.slice(_start, _end);
        ids = keys.slice(_start, _end);
        total = values.length;
        return {
            data: data,
            ids: ids,
            total: total
        };
    } else {
        throw new Error('Error processing request');
    }
};
var methods = {
    upload: upload,
    save: save,
    del: del,
    getItemID: getItemID,
    getOne: getOne,
    getMany: getMany
};

var baseConfig = {
    initialQuerytimeout: 10000,
    metaFieldNames: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        createdBy: 'createdBy'
    },
    admin: {
        path: 'users',
        config: {},
        validate: function () { return true; }
    },
    debug: false,
    trackedResources: [],
    firebaseSaveFilter: function (data) { return data; },
    firebaseGetFilter: function (data) { return data; }
};
function dataProvider (options) {
    if ( options === void 0 ) options = {};

    options = deepAssign({}, baseConfig, methods, options);
    var metaFieldNames = options.metaFieldNames;
    var trackedResources = options.trackedResources;
    var initialQuerytimeout = options.initialQuerytimeout;
    var debug = options.debug;
    var admin = options.admin;
    var firebaseSaveFilter = options.firebaseSaveFilter;
    var firebaseGetFilter = options.firebaseGetFilter;
    var upload = options.upload;
    var save = options.save;
    var del = options.del;
    var getItemID = options.getItemID;
    var getOne = options.getOne;
    var getMany = options.getMany;
    var resourcesStatus = {};
    var resourcesReferences = {};
    var resourcesData = {};
    var resourcesPaths = {};
    var resourcesUploadFields = {};
    trackedResources.forEach(function (resource, index) {
        if (typeof resource === 'string') {
            resource = {
                name: resource,
                path: resource,
                uploadFields: []
            };
            trackedResources[index] = resource;
        }
        var name = resource.name;
        var path = resource.path;
        var uploadFields = resource.uploadFields;
        if (!name) {
            throw new Error(("name is missing from resource " + resource));
        }
        resourcesUploadFields[name] = uploadFields || [];
        resourcesPaths[name] = path || name;
        resourcesData[name] = {};
    });
    var initializeResource = function (ref$1, resolve) {
        var name = ref$1.name;
        var isPublic = ref$1.isPublic;

        var ref = resourcesReferences[name] = firebase.database().ref(resourcesPaths[name]);
        resourcesData[name] = [];
        if (isPublic) {
            subscribeResource(ref, name, resolve);
        } else {
            firebase.auth().onAuthStateChanged(function (auth) {
                if (auth) {
                    subscribeResource(ref, name, resolve);
                }
            });
        }
        setTimeout(resolve, initialQuerytimeout);
        return true;
    };
    var subscribeResource = function (ref, name, resolve) {
        ref.once('value', function (snapshot) {
            if (snapshot.key === name) {
                var entries = snapshot.val() || {};
                Object.keys(entries).forEach(function (key) {
                    resourcesData[name][key] = firebaseGetFilter(entries[key], name);
                });
                Object.keys(resourcesData[name]).forEach(function (itemKey) {
                    resourcesData[name][itemKey].id = itemKey;
                    resourcesData[name][itemKey].key = itemKey;
                });
                resolve();
            }
        });
        ref.on('child_added', function (snapshot) {
            resourcesData[name][snapshot.key] = firebaseGetFilter(Object.assign({}, {
                id: snapshot.key,
                key: snapshot.key
            }, snapshot.val()), name);
        });
        ref.on('child_removed', function (oldsnapshot) {
            if (resourcesData[name][oldsnapshot.key]) {
                delete resourcesData[name][oldsnapshot.key];
            }
        });
        ref.on('child_changed', function (snapshot) {
            resourcesData[name][snapshot.key] = snapshot.val();
        });
    };
    trackedResources.forEach(function (resource) {
        resourcesStatus[resource.name] = new Promise(function (resolve) {
            initializeResource(resource, resolve);
        });
    });
    return function (type, resourceName, params) { return new Promise(function ($return, $error) {
        var uploadFields, uploads, currentData, uploadResults;
        var result, itemId;
        debug && console.log(type, resourceName, params);
        return resourcesStatus[resourceName].then((function ($await_4) {
            try {
                result = null;
                itemId = null;
                switch (type) {
                    case reactAdmin.GET_LIST:
                    case reactAdmin.GET_MANY:
                    case reactAdmin.GET_MANY_REFERENCE:
                        result = getMany(params, resourceName, resourcesData[resourceName]);
                        return $return(result);
                    case reactAdmin.GET_ONE:
                        result = getOne(params, resourceName, resourcesData[resourceName]);
                        return $return(result);
                    case reactAdmin.DELETE:
                        uploadFields = resourcesUploadFields[resourceName] ? resourcesUploadFields[resourceName] : [];
                        return del(params.id, resourceName, resourcesPaths[resourceName], uploadFields).then(function ($await_5) {
                            try {
                                result = $await_5;
                                return $return(result);
                            } catch ($boundEx) {
                                return $error($boundEx);
                            }
                        }, $error);
                    case reactAdmin.UPDATE:
                    case reactAdmin.CREATE:
                        if (admin && admin.path === resourceName && type === reactAdmin.CREATE && params.data && params.data.email && params.data.password && admin.validate(params.data)) {
                            var $Try_1_Post = (function () {
                                try {
                                    return $If_3.call(this);
                                } catch ($boundEx) {
                                    return $error($boundEx);
                                }
                            }).bind(this);
                            var $Try_1_Catch = function (error) {
                                try {
                                    return $return(Promise.reject(new Error(error)));
                                } catch ($boundEx) {
                                    return $error($boundEx);
                                }
                            };
                            try {
                                var app, user;
                                app = firebase.initializeApp(admin.config, 'user-admin');
                                return app.auth().createUserWithEmailAndPassword(params.data.email, params.data.password).then(function ($await_6) {
                                    try {
                                        user = $await_6;
                                        itemId = user.uid;
                                        app.auth().signOut();
                                        return $Try_1_Post();
                                    } catch ($boundEx) {
                                        return $Try_1_Catch($boundEx);
                                    }
                                }, $Try_1_Catch);
                            } catch (error) {
                                $Try_1_Catch(error);
                            }
                        } else {
                            itemId = getItemID(params, type, resourceName, resourcesPaths[resourceName], resourcesData[resourceName]);
                            return $If_3.call(this);
                        }
                        function $If_3() {
                            uploads = resourcesUploadFields[resourceName] ? resourcesUploadFields[resourceName].map(function (field) { return upload(field, params.data, itemId, resourceName, resourcesPaths[resourceName]); }) : [];
                            currentData = resourcesData[resourceName][itemId] || {};
                            return Promise.all(uploads).then(function ($await_7) {
                                try {
                                    uploadResults = $await_7;
                                    return save(itemId, params.data, currentData, resourceName, resourcesPaths[resourceName], firebaseSaveFilter, uploadResults, type === reactAdmin.CREATE, metaFieldNames).then(function ($await_8) {
                                        try {
                                            result = $await_8;
                                            return $return(result);
                                        } catch ($boundEx) {
                                            return $error($boundEx);
                                        }
                                    }, $error);
                                } catch ($boundEx) {
                                    return $error($boundEx);
                                }
                            }, $error);
                        }
                        
                    default:
                        debug && console.error('Undocumented method: ', type);
                        return $return({
                            data: []
                        });
                }
                return $return();
            } catch ($boundEx) {
                return $error($boundEx);
            }
        }).bind(this), $error);
    }); };
}

exports.FirebaseDataProvider = dataProvider;
exports.methods = methods;
//# sourceMappingURL=ra-data-firebase.js.map
