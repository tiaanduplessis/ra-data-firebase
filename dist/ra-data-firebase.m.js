import firebase from 'firebase';
import sortBy from 'sort-by';
import { CREATE, GET_LIST, GET_ONE, GET_MANY, GET_MANY_REFERENCE, UPDATE, DELETE } from 'react-admin';
import deepAssign from 'deep-assign';

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
    if (resourceData && resourceData[itemId] && type === CREATE) {
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


//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGhvZHMuanMob3JpZ2luYWwpIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sY0FBYztBQUNyQixPQUFPLFlBQVk7QUFFbkIsUUFDRSxhQUNLO0FBRVAsS0FBQSxDQUFNLGVBQWdCLElBQUQsSUFDWixJQUFJLE9BQUosQ0FBWSxPQUFBLElBQVc7SUFDNUIsS0FBQSxDQUFNLE1BQU0sUUFBQSxDQUFTLGFBQVQsQ0FBdUI7SUFDbkMsR0FBQSxDQUFJLE1BQUosQ0FBQSxDQUFBLENBQWEsWUFBWTtRQUN2QixPQUFBLENBQVE7WUFDTixPQUFPLElBQUEsQ0FBSyxLQUROLENBQUE7WUFFTixRQUFRLElBQUEsQ0FBSzs7SUFFckI7SUFDSSxHQUFBLENBQUksR0FBSixDQUFBLENBQUEsQ0FBVSxJQUFBLENBQUs7QUFDbkI7QUFHQSxLQUFBLENBQU0sVUFBZ0IsU0FBVyxFQUFBLFlBQWMsRUFBQSxFQUFJLEVBQUEsWUFBYyxFQUFBLGNBQWxEOztJQUNULE9BQU8sWUFBQSxDQUFhLFVBQWIsQ0FBQSxFQUFBLENBQTJCLEtBQUEsQ0FBTSxPQUFOLENBQWMsWUFBQSxDQUFhLFdBQXRELEdBQW9FLFlBQUEsQ0FBYSxVQUFiLENBQXdCLEtBQUssWUFBQSxDQUFhO0lBQ25ILFNBQVM7SUFDZixJQUFJLElBQUEsQ0FBQSxFQUFBLENBQVEsSUFBQSxDQUFLLE9BQWIsQ0FBQSxFQUFBLENBQXdCLElBQUEsQ0FBSyxPQUFMLENBQWEsTUFBTTs7UUFDdkMsVUFBVSxJQUFBLENBQUs7UUFDZixNQUFNLFFBQUEsQ0FBUyxPQUFULEVBQUEsQ0FBbUIsR0FBbkIsRUFBQSxDQUF5QixLQUF6QixDQUErQixHQUFHLGdCQUFnQixNQUFNLFVBQXpCO1FBQzFCLE9BQU0sR0FBQSxDQUFJLEdBQUosQ0FBUSxTQUFkOztnQkFBWCxXQUFXO2dCQUNqQixNQUFBLENBQU8sVUFBUCxDQUFBLENBQUEsQ0FBb0IsQ0FBQztnQkFDckIsTUFBQSxDQUFPLFVBQVAsQ0FBa0IsRUFBbEIsQ0FBcUIsVUFBckIsQ0FBQSxDQUFBLENBQWtDLElBQUEsQ0FBSyxHQUFMO2dCQUNsQyxNQUFBLENBQU8sVUFBUCxDQUFrQixFQUFsQixDQUFxQixHQUFyQixDQUFBLENBQUEsQ0FBMkIsUUFBQSxDQUFTLFdBQVQsQ0FBcUIsS0FBckIsQ0FBMkIsSUFBM0IsQ0FBZ0MsS0FBaEMsRUFBQSxDQUFBLENBQUEsQ0FBMEM7Z0JBQ3JFLE1BQUEsQ0FBTyxVQUFQLENBQWtCLEVBQWxCLENBQXFCLElBQXJCLENBQUEsQ0FBQSxDQUE0QixPQUFBLENBQVE7Z0JBQ3BDLElBQUksT0FBQSxDQUFRLElBQVIsQ0FBYSxPQUFiLENBQXFCLFNBQXJCLENBQUEsR0FBQSxDQUFtQyxHQUFHOzs7Ozs7OztpREFLL0IsR0FBRzs7NEJBQ1YsT0FBQSxDQUFRLEtBQVIsQ0FBYywrQkFBQTs7Ozs7b0JBQ3RCO29CQU5NLElBQUk7O3dCQUNnQixPQUFNLFlBQUEsQ0FBYSxNQUFuQjs7Z0NBQVosWUFBWTtnQ0FDbEIsTUFBQSxDQUFPLFVBQVAsQ0FBa0IsRUFBbEIsQ0FBcUIsS0FBckIsQ0FBQSxDQUFBLENBQTZCLFNBQUEsQ0FBVTtnQ0FDdkMsTUFBQSxDQUFPLFVBQVAsQ0FBa0IsRUFBbEIsQ0FBcUIsTUFBckIsQ0FBQSxDQUFBLENBQThCLFNBQUEsQ0FBVTs7Ozs7O29CQUNoRCxDQUFRLFFBQU8sR0FBRztxQ0FBSDtvQkFFZjtnQkFDQTs7b0JBQ0ksZUFBTzs7Ozs7Ozs7SUFDWDtJQUNFLGVBQU87O0FBR1QsS0FBQSxDQUFNLFFBQWMsRUFBSSxFQUFBLElBQU0sRUFBQSxRQUFVLEVBQUEsWUFBYyxFQUFBLFlBQWMsRUFBQSxrQkFBb0IsRUFBQSxhQUFlLEVBQUEsS0FBTyxFQUFBLGdCQUFqRzs7SUFDTCxjQUFjLFFBQUEsQ0FBUyxJQUFULEVBQUEsQ0FBZ0I7SUFFcEMsSUFBSSxlQUFlO1FBQ2pCLGFBQUEsQ0FBYyxHQUFkLENBQWtCLFlBQUEsSUFBZ0IsWUFBQSxHQUFlLE1BQUEsQ0FBTyxNQUFQLENBQWMsTUFBTSxnQkFBZ0I7SUFDekY7SUFFRSxJQUFJLE9BQU87UUFDVCxNQUFBLENBQU8sTUFBUCxDQUFjLE1BQU07YUFBRyxjQUFBLENBQWUsWUFBWSxJQUFBLENBQUssR0FBTDs7SUFDdEQ7SUFFRSxJQUFJLGFBQWE7UUFDZixNQUFBLENBQU8sTUFBUCxDQUFjLE1BQU07YUFBRyxjQUFBLENBQWUsWUFBWSxXQUFBLENBQVk7O0lBQ2xFO0lBRUUsSUFBQSxDQUFBLENBQUEsQ0FBTyxNQUFBLENBQU8sTUFBUCxDQUFjLFVBQVU7U0FBRyxjQUFBLENBQWUsWUFBWSxJQUFBLENBQUssR0FBTDtPQUFjO0lBRTNFLElBQUksQ0FBQyxJQUFBLENBQUssS0FBSztRQUNiLElBQUEsQ0FBSyxHQUFMLENBQUEsQ0FBQSxDQUFXO0lBQ2Y7SUFDRSxJQUFJLENBQUMsSUFBQSxDQUFLLElBQUk7UUFDWixJQUFBLENBQUssRUFBTCxDQUFBLENBQUEsQ0FBVTtJQUNkO0lBRUUsT0FBTSxRQUFBLENBQVMsUUFBVCxFQUFBLENBQW9CLEdBQXBCLENBQXdCLEdBQUcsZ0JBQWdCLElBQUEsQ0FBSyxJQUF4QixFQUF4QixDQUF1RCxNQUF2RCxDQUE4RCxrQkFBQSxDQUFtQixPQUF2Rjs7WUFDQSxlQUFPO2dCQUFFOzs7Ozs7O0FBR1gsS0FBQSxDQUFNLE9BQWEsRUFBSSxFQUFBLFlBQWMsRUFBQSxZQUFjLEVBQUEsY0FBdkM7SUFDVixJQUFJLFlBQUEsQ0FBYSxRQUFRO1FBQ3ZCLFlBQUEsQ0FBYSxHQUFiLENBQWlCLFNBQUEsSUFDZixRQUFBLENBQVMsT0FBVCxFQUFBLENBQW1CLEdBQW5CLEVBQUEsQ0FBeUIsS0FBekIsQ0FBK0IsR0FBRyxnQkFBZ0IsTUFBTSxVQUF6QixFQUEvQixDQUFxRSxNQUFyRTtJQUNOO0lBRUUsT0FBTSxRQUFBLENBQVMsUUFBVCxFQUFBLENBQW9CLEdBQXBCLENBQXdCLEdBQUcsZ0JBQWdCLEdBQW5CLEVBQXhCLENBQWlELE1BQWpELEdBQU47O1lBQ0EsZUFBTztnQkFBRSxNQUFNOzs7Ozs7O0FBR2pCLEtBQUEsQ0FBTSxhQUFhLE1BQVEsRUFBQSxJQUFNLEVBQUEsWUFBYyxFQUFBLFlBQWMsRUFBQSxjQUEzQyxHQUE0RDtJQUM1RSxHQUFBLENBQUksU0FBUyxNQUFBLENBQU8sSUFBUCxDQUFZLEVBQVosQ0FBQSxFQUFBLENBQWtCLE1BQUEsQ0FBTyxFQUF6QixDQUFBLEVBQUEsQ0FBK0IsTUFBQSxDQUFPLElBQVAsQ0FBWSxHQUEzQyxDQUFBLEVBQUEsQ0FBa0QsTUFBQSxDQUFPO0lBQ3RFLElBQUksQ0FBQyxRQUFRO1FBQ1gsTUFBQSxDQUFBLENBQUEsQ0FBUyxRQUFBLENBQVMsUUFBVCxFQUFBLENBQW9CLEdBQXBCLEVBQUEsQ0FBMEIsS0FBMUIsQ0FBZ0MsYUFBaEMsQ0FBOEMsSUFBOUMsRUFBQSxDQUFxRDtJQUNsRTtJQUVFLElBQUksQ0FBQyxRQUFRO1FBQ1gsTUFBTSxJQUFJLEtBQUosQ0FBVTtJQUNwQjtJQUVFLElBQUksWUFBQSxDQUFBLEVBQUEsQ0FBZ0IsWUFBQSxDQUFhLE9BQTdCLENBQUEsRUFBQSxDQUF3QyxJQUFBLENBQUEsR0FBQSxDQUFTLFFBQVE7UUFDM0QsTUFBTSxJQUFJLEtBQUosQ0FBVTtJQUNwQjtJQUVFLE9BQU87QUFDVDtBQUVBLEtBQUEsQ0FBTSxVQUFVLE1BQVEsRUFBQSxZQUFjLEVBQUEsY0FBdkIsR0FBd0M7SUFDckQsSUFBSSxNQUFBLENBQU8sRUFBUCxDQUFBLEVBQUEsQ0FBYSxZQUFBLENBQWEsTUFBQSxDQUFPLEtBQUs7UUFDeEMsT0FBTztZQUFFLE1BQU0sWUFBQSxDQUFhLE1BQUEsQ0FBTzs7SUFDdkMsT0FBUztRQUNMLE1BQU0sSUFBSSxLQUFKLENBQVU7SUFDcEI7QUFDQTtBQUVBLEtBQUEsQ0FBTSxXQUFXLE1BQVEsRUFBQSxZQUFjLEVBQUEsY0FBdkIsR0FBd0M7SUFDdEQsR0FBQSxDQUFJLE1BQU07SUFDVixHQUFBLENBQUksT0FBTztJQUNYLEdBQUEsQ0FBSSxRQUFRO0lBRVosSUFBSSxNQUFBLENBQU8sR0FBUCxDQUFBLEVBQUEsQ0FBYyxLQUFBLENBQU0sT0FBTixDQUFjLE1BQUEsQ0FBTyxNQUFNO1FBRTNDLE1BQUEsQ0FBTyxHQUFQLENBQVcsT0FBWCxDQUFtQixHQUFBLElBQU87WUFDeEIsSUFBSSxZQUFBLENBQWEsTUFBTTtnQkFDckIsR0FBQSxDQUFJLElBQUosQ0FBUztnQkFDVCxJQUFBLENBQUssSUFBTCxDQUFVLFlBQUEsQ0FBYTtnQkFDdkIsS0FBQTtZQUNSO1FBQ0E7UUFFSSxPQUFPO1lBQUMsS0FBRCxDQUFBO1lBQVEsR0FBUixDQUFBO1lBQWE7O0lBQ3hCLE9BQVMsSUFBSSxNQUFBLENBQU8sWUFBWTtRQUU1QixHQUFBLENBQUksU0FBUztRQUdiLEtBQUEsQ0FBTSxTQUFTLE1BQUEsQ0FBTyxNQUFQLENBQWMsSUFBSSxNQUFBLENBQU87UUFFeEMsSUFBSSxNQUFBLENBQU8sTUFBUCxDQUFBLEVBQUEsQ0FBaUIsTUFBQSxDQUFPLElBQUk7WUFDOUIsTUFBQSxDQUFPLE1BQUEsQ0FBTyxPQUFkLENBQUEsQ0FBQSxDQUF3QixNQUFBLENBQU87UUFDckM7UUFFSSxLQUFBLENBQU0sYUFBYSxNQUFBLENBQU8sSUFBUCxDQUFZO1FBRS9CLElBQUksVUFBQSxDQUFXLFFBQVE7WUFDckIsTUFBQSxDQUFPLE1BQVAsQ0FBYyxhQUFkLENBQTRCLEdBQTVCLENBQWdDLEtBQUEsSUFBUztnQkFDdkMsR0FBQSxDQUFJLGNBQWM7Z0JBQ2xCLE9BQU8sV0FBQSxDQUFBLENBQUEsQ0FBYyxVQUFBLENBQVcsUUFBUTtvQkFDdEMsR0FBQSxDQUFJLFdBQVcsVUFBQSxDQUFXO29CQUMxQixJQUFJLFFBQUEsQ0FBQSxHQUFBLENBQWEsR0FBYixDQUFBLEVBQUEsQ0FBb0IsS0FBQSxDQUFNLFNBQU4sQ0FBQSxHQUFBLENBQW9CLE1BQUEsQ0FBTyxXQUFXO3dCQUM1RCxPQUFPO29CQUNuQixPQUFpQixJQUFJLFFBQUEsQ0FBQSxHQUFBLENBQWEsS0FBSzt3QkFDM0IsSUFBSSxJQUFBLENBQUssU0FBTCxDQUFlLE1BQWYsQ0FBc0IsT0FBdEIsQ0FBOEIsTUFBQSxDQUFPLEtBQXJDLENBQUEsR0FBQSxDQUErQyxDQUFDLEdBQUc7NEJBQ3JELE9BQU87d0JBQ3JCO29CQUNBO29CQUNVLFdBQUE7Z0JBQ1Y7Z0JBQ1EsTUFBQSxDQUFPLElBQVAsQ0FBWTtnQkFDWixPQUFPO1lBQ2Y7UUFDQSxPQUFXO1lBQ0wsTUFBQSxDQUFBLENBQUEsQ0FBUyxNQUFBLENBQU8sTUFBUCxDQUFjO1FBQzdCO1FBRUksSUFBSSxNQUFBLENBQU8sTUFBTTtZQUNmLE1BQUEsQ0FBTyxJQUFQLENBQVksTUFBQSxDQUFPLEdBQUcsTUFBQSxDQUFPLElBQVAsQ0FBWSxLQUFaLENBQUEsR0FBQSxDQUFzQixLQUF0QixHQUE4QixNQUFNLEtBQUssTUFBQSxDQUFPLElBQVAsQ0FBWSxNQUF4RDtRQUN6QjtRQUVJLEtBQUEsQ0FBTSxPQUFPLE1BQUEsQ0FBTyxHQUFQLENBQVcsQ0FBQSxJQUFLLENBQUEsQ0FBRTtRQUMvQixLQUFBLENBQU0sQ0FBRSxNQUFNLFdBQVksTUFBQSxDQUFPO1FBQ2pDLEtBQUEsQ0FBTSxVQUFVLElBQUEsQ0FBQSxDQUFBLENBQU8sRUFBUixDQUFBLENBQUEsQ0FBYTtRQUM1QixLQUFBLENBQU0sT0FBTyxJQUFBLENBQUEsQ0FBQSxDQUFPO1FBQ3BCLElBQUEsQ0FBQSxDQUFBLENBQU8sTUFBQSxDQUFPLEtBQVAsQ0FBYSxRQUFRO1FBQzVCLEdBQUEsQ0FBQSxDQUFBLENBQU0sSUFBQSxDQUFLLEtBQUwsQ0FBVyxRQUFRO1FBQ3pCLEtBQUEsQ0FBQSxDQUFBLENBQVEsTUFBQSxDQUFPO1FBQ2YsT0FBTztZQUFFLElBQUYsQ0FBQTtZQUFRLEdBQVIsQ0FBQTtZQUFhOztJQUN4QixPQUFTO1FBQ0wsTUFBTSxJQUFJLEtBQUosQ0FBVTtJQUNwQjtBQUNBO0FBRUEsZUFBZTtJQUNiLE1BRGEsQ0FBQTtJQUViLElBRmEsQ0FBQTtJQUdiLEdBSGEsQ0FBQTtJQUliLFNBSmEsQ0FBQTtJQUtiLE1BTGEsQ0FBQTtJQU1iOztBQXJMRiIsImZpbGUiOiJtZXRob2RzLmpzKG9yaWdpbmFsKSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBmaXJlYmFzZSBmcm9tICdmaXJlYmFzZSdcbmltcG9ydCBzb3J0QnkgZnJvbSAnc29ydC1ieSdcblxuaW1wb3J0IHtcbiAgQ1JFQVRFXG59IGZyb20gJ3JlYWN0LWFkbWluJ1xuXG5jb25zdCBnZXRJbWFnZVNpemUgPSAoZmlsZSkgPT4ge1xuICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgY29uc3QgaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJylcbiAgICBpbWcub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmVzb2x2ZSh7XG4gICAgICAgIHdpZHRoOiB0aGlzLndpZHRoLFxuICAgICAgICBoZWlnaHQ6IHRoaXMuaGVpZ2h0XG4gICAgICB9KVxuICAgIH1cbiAgICBpbWcuc3JjID0gZmlsZS5zcmNcbiAgfSlcbn1cblxuY29uc3QgdXBsb2FkID0gYXN5bmMgKGZpZWxkTmFtZSwgc3VibWl0ZWREYXRhLCBpZCwgcmVzb3VyY2VOYW1lLCByZXNvdXJjZVBhdGgpID0+IHtcbiAgbGV0IGZpbGUgPSBzdWJtaXRlZERhdGFbZmllbGROYW1lXSAmJiBBcnJheS5pc0FycmF5KHN1Ym1pdGVkRGF0YVtmaWVsZE5hbWVdKSA/IHN1Ym1pdGVkRGF0YVtmaWVsZE5hbWVdWzBdIDogc3VibWl0ZWREYXRhW2ZpZWxkTmFtZV1cbiAgY29uc3QgcmVzdWx0ID0ge31cbiAgaWYgKGZpbGUgJiYgZmlsZS5yYXdGaWxlICYmIGZpbGUucmF3RmlsZS5uYW1lKSB7XG4gICAgY29uc3QgcmF3RmlsZSA9IGZpbGUucmF3RmlsZVxuICAgIGNvbnN0IHJlZiA9IGZpcmViYXNlLnN0b3JhZ2UoKS5yZWYoKS5jaGlsZChgJHtyZXNvdXJjZVBhdGh9LyR7aWR9LyR7ZmllbGROYW1lfWApXG4gICAgY29uc3Qgc25hcHNob3QgPSBhd2FpdCByZWYucHV0KHJhd0ZpbGUpXG4gICAgcmVzdWx0W2ZpZWxkTmFtZV0gPSBbe31dXG4gICAgcmVzdWx0W2ZpZWxkTmFtZV1bMF0udXBsb2FkZWRBdCA9IERhdGUubm93KClcbiAgICByZXN1bHRbZmllbGROYW1lXVswXS5zcmMgPSBzbmFwc2hvdC5kb3dubG9hZFVSTC5zcGxpdCgnPycpLnNoaWZ0KCkgKyAnP2FsdD1tZWRpYSdcbiAgICByZXN1bHRbZmllbGROYW1lXVswXS50eXBlID0gcmF3RmlsZS50eXBlXG4gICAgaWYgKHJhd0ZpbGUudHlwZS5pbmRleE9mKCdpbWFnZS8nKSA9PT0gMCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgaW1hZ2VTaXplID0gYXdhaXQgZ2V0SW1hZ2VTaXplKGZpbGUpXG4gICAgICAgIHJlc3VsdFtmaWVsZE5hbWVdWzBdLndpZHRoID0gaW1hZ2VTaXplLndpZHRoXG4gICAgICAgIHJlc3VsdFtmaWVsZE5hbWVdWzBdLmhlaWdodCA9IGltYWdlU2l6ZS5oZWlnaHRcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIGdldCBpbWFnZSBkaW1lbnNpb25zYClcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG4gIHJldHVybiBmYWxzZVxufVxuXG5jb25zdCBzYXZlID0gYXN5bmMgKGlkLCBkYXRhLCBwcmV2aW91cywgcmVzb3VyY2VOYW1lLCByZXNvdXJjZVBhdGgsIGZpcmViYXNlU2F2ZUZpbHRlciwgdXBsb2FkUmVzdWx0cywgaXNOZXcsIG1ldGFGaWVsZE5hbWVzKSA9PiB7XG4gIGNvbnN0IGN1cnJlbnRVc2VyID0gZmlyZWJhc2UuYXV0aCgpLmN1cnJlbnRVc2VyXG5cbiAgaWYgKHVwbG9hZFJlc3VsdHMpIHtcbiAgICB1cGxvYWRSZXN1bHRzLm1hcCh1cGxvYWRSZXN1bHQgPT4gdXBsb2FkUmVzdWx0ID8gT2JqZWN0LmFzc2lnbihkYXRhLCB1cGxvYWRSZXN1bHQpIDogZmFsc2UpXG4gIH1cblxuICBpZiAoaXNOZXcpIHtcbiAgICBPYmplY3QuYXNzaWduKGRhdGEsIHsgW21ldGFGaWVsZE5hbWVzLmNyZWF0ZWRBdF06IERhdGUubm93KCkgfSlcbiAgfVxuXG4gIGlmIChjdXJyZW50VXNlcikge1xuICAgIE9iamVjdC5hc3NpZ24oZGF0YSwgeyBbbWV0YUZpZWxkTmFtZXMuY3JlYXRlZEJ5XTogY3VycmVudFVzZXIudWlkIH0pXG4gIH1cblxuICBkYXRhID0gT2JqZWN0LmFzc2lnbihwcmV2aW91cywgeyBbbWV0YUZpZWxkTmFtZXMudXBkYXRlZEF0XTogRGF0ZS5ub3coKSB9LCBkYXRhKVxuXG4gIGlmICghZGF0YS5rZXkpIHtcbiAgICBkYXRhLmtleSA9IGlkXG4gIH1cbiAgaWYgKCFkYXRhLmlkKSB7XG4gICAgZGF0YS5pZCA9IGlkXG4gIH1cblxuICBhd2FpdCBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZihgJHtyZXNvdXJjZVBhdGh9LyR7ZGF0YS5rZXl9YCkudXBkYXRlKGZpcmViYXNlU2F2ZUZpbHRlcihkYXRhKSlcbiAgcmV0dXJuIHsgZGF0YSB9XG59XG5cbmNvbnN0IGRlbCA9IGFzeW5jIChpZCwgcmVzb3VyY2VOYW1lLCByZXNvdXJjZVBhdGgsIHVwbG9hZEZpZWxkcykgPT4ge1xuICBpZiAodXBsb2FkRmllbGRzLmxlbmd0aCkge1xuICAgIHVwbG9hZEZpZWxkcy5tYXAoZmllbGROYW1lID0+XG4gICAgICBmaXJlYmFzZS5zdG9yYWdlKCkucmVmKCkuY2hpbGQoYCR7cmVzb3VyY2VQYXRofS8ke2lkfS8ke2ZpZWxkTmFtZX1gKS5kZWxldGUoKSlcbiAgfVxuXG4gIGF3YWl0IGZpcmViYXNlLmRhdGFiYXNlKCkucmVmKGAke3Jlc291cmNlUGF0aH0vJHtpZH1gKS5yZW1vdmUoKVxuICByZXR1cm4geyBkYXRhOiBpZCB9XG59XG5cbmNvbnN0IGdldEl0ZW1JRCA9IChwYXJhbXMsIHR5cGUsIHJlc291cmNlTmFtZSwgcmVzb3VyY2VQYXRoLCByZXNvdXJjZURhdGEpID0+IHtcbiAgbGV0IGl0ZW1JZCA9IHBhcmFtcy5kYXRhLmlkIHx8IHBhcmFtcy5pZCB8fCBwYXJhbXMuZGF0YS5rZXkgfHwgcGFyYW1zLmtleVxuICBpZiAoIWl0ZW1JZCkge1xuICAgIGl0ZW1JZCA9IGZpcmViYXNlLmRhdGFiYXNlKCkucmVmKCkuY2hpbGQocmVzb3VyY2VQYXRoKS5wdXNoKCkua2V5XG4gIH1cblxuICBpZiAoIWl0ZW1JZCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSUQgaXMgcmVxdWlyZWQnKVxuICB9XG5cbiAgaWYgKHJlc291cmNlRGF0YSAmJiByZXNvdXJjZURhdGFbaXRlbUlkXSAmJiB0eXBlID09PSBDUkVBVEUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0lEIGFscmVhZHkgaW4gdXNlJylcbiAgfVxuXG4gIHJldHVybiBpdGVtSWRcbn1cblxuY29uc3QgZ2V0T25lID0gKHBhcmFtcywgcmVzb3VyY2VOYW1lLCByZXNvdXJjZURhdGEpID0+IHtcbiAgaWYgKHBhcmFtcy5pZCAmJiByZXNvdXJjZURhdGFbcGFyYW1zLmlkXSkge1xuICAgIHJldHVybiB7IGRhdGE6IHJlc291cmNlRGF0YVtwYXJhbXMuaWRdIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0tleSBub3QgZm91bmQnKVxuICB9XG59XG5cbmNvbnN0IGdldE1hbnkgPSAocGFyYW1zLCByZXNvdXJjZU5hbWUsIHJlc291cmNlRGF0YSkgPT4ge1xuICBsZXQgaWRzID0gW11cbiAgbGV0IGRhdGEgPSBbXVxuICBsZXQgdG90YWwgPSAwXG5cbiAgaWYgKHBhcmFtcy5pZHMgJiYgQXJyYXkuaXNBcnJheShwYXJhbXMuaWRzKSkge1xuICAgIC8qKiBHRVRfTUFOWSAqL1xuICAgIHBhcmFtcy5pZHMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgaWYgKHJlc291cmNlRGF0YVtrZXldKSB7XG4gICAgICAgIGlkcy5wdXNoKGtleSlcbiAgICAgICAgZGF0YS5wdXNoKHJlc291cmNlRGF0YVtrZXldKVxuICAgICAgICB0b3RhbCsrXG4gICAgICB9XG4gICAgfSlcblxuICAgIHJldHVybiB7dG90YWwsIGlkcywgZGF0YX1cbiAgfSBlbHNlIGlmIChwYXJhbXMucGFnaW5hdGlvbikge1xuICAgIC8qKiBHRVRfTElTVCAvIEdFVF9NQU5ZX1JFRkVSRU5DRSAqL1xuICAgIGxldCB2YWx1ZXMgPSBbXVxuXG4gICAgLy8gQ29weSB0aGUgZmlsdGVyIHBhcmFtcyBzbyB3ZSBjYW4gbW9kaWZ5IGZvciBHRVRfTUFOWV9SRUZFUkVOQ0Ugc3VwcG9ydC5cbiAgICBjb25zdCBmaWx0ZXIgPSBPYmplY3QuYXNzaWduKHt9LCBwYXJhbXMuZmlsdGVyKVxuXG4gICAgaWYgKHBhcmFtcy50YXJnZXQgJiYgcGFyYW1zLmlkKSB7XG4gICAgICBmaWx0ZXJbcGFyYW1zLnRhcmdldF0gPSBwYXJhbXMuaWRcbiAgICB9XG5cbiAgICBjb25zdCBmaWx0ZXJLZXlzID0gT2JqZWN0LmtleXMoZmlsdGVyKVxuICAgIC8qIFRPRE8gTXVzdCBoYXZlIGEgYmV0dGVyIHdheSAqL1xuICAgIGlmIChmaWx0ZXJLZXlzLmxlbmd0aCkge1xuICAgICAgT2JqZWN0LnZhbHVlcyhyZXNvdXJjZURhdGEpLm1hcCh2YWx1ZSA9PiB7XG4gICAgICAgIGxldCBmaWx0ZXJJbmRleCA9IDBcbiAgICAgICAgd2hpbGUgKGZpbHRlckluZGV4IDwgZmlsdGVyS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICBsZXQgcHJvcGVydHkgPSBmaWx0ZXJLZXlzW2ZpbHRlckluZGV4XVxuICAgICAgICAgIGlmIChwcm9wZXJ0eSAhPT0gJ3EnICYmIHZhbHVlW3Byb3BlcnR5XSAhPT0gZmlsdGVyW3Byb3BlcnR5XSkge1xuICAgICAgICAgICAgcmV0dXJuIGZpbHRlckluZGV4XG4gICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eSA9PT0gJ3EnKSB7XG4gICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkodmFsdWUpLmluZGV4T2YoZmlsdGVyWydxJ10pID09PSAtMSkge1xuICAgICAgICAgICAgICByZXR1cm4gZmlsdGVySW5kZXhcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZmlsdGVySW5kZXgrK1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlcy5wdXNoKHZhbHVlKVxuICAgICAgICByZXR1cm4gZmlsdGVySW5kZXhcbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlcyA9IE9iamVjdC52YWx1ZXMocmVzb3VyY2VEYXRhKVxuICAgIH1cblxuICAgIGlmIChwYXJhbXMuc29ydCkge1xuICAgICAgdmFsdWVzLnNvcnQoc29ydEJ5KGAke3BhcmFtcy5zb3J0Lm9yZGVyID09PSAnQVNDJyA/ICctJyA6ICcnfSR7cGFyYW1zLnNvcnQuZmllbGR9YCkpXG4gICAgfVxuXG4gICAgY29uc3Qga2V5cyA9IHZhbHVlcy5tYXAoaSA9PiBpLmlkKVxuICAgIGNvbnN0IHsgcGFnZSwgcGVyUGFnZSB9ID0gcGFyYW1zLnBhZ2luYXRpb25cbiAgICBjb25zdCBfc3RhcnQgPSAocGFnZSAtIDEpICogcGVyUGFnZVxuICAgIGNvbnN0IF9lbmQgPSBwYWdlICogcGVyUGFnZVxuICAgIGRhdGEgPSB2YWx1ZXMuc2xpY2UoX3N0YXJ0LCBfZW5kKVxuICAgIGlkcyA9IGtleXMuc2xpY2UoX3N0YXJ0LCBfZW5kKVxuICAgIHRvdGFsID0gdmFsdWVzLmxlbmd0aFxuICAgIHJldHVybiB7IGRhdGEsIGlkcywgdG90YWwgfVxuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcignRXJyb3IgcHJvY2Vzc2luZyByZXF1ZXN0JylcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCB7XG4gIHVwbG9hZCxcbiAgc2F2ZSxcbiAgZGVsLFxuICBnZXRJdGVtSUQsXG4gIGdldE9uZSxcbiAgZ2V0TWFueVxufVxuIl19

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
        var uploads, currentData, uploadResults;
        var result, itemId;
        debug && console.log(type, resourceName, params);
        return resourcesStatus[resourceName].then((function ($await_4) {
            try {
                result = null;
                itemId = null;
                switch (type) {
                    case GET_LIST:
                    case GET_MANY:
                    case GET_MANY_REFERENCE:
                        result = getMany(params, resourceName, resourcesData[resourceName]);
                        return $return(result);
                    case GET_ONE:
                        result = getOne(params, resourceName, resourcesData[resourceName]);
                        return $return(result);
                    case DELETE:
                        uploadFields = resourcesUploadFields[resourceName] ? resourcesUploadFields[resourceName] : [];
                        return del(params.id, resourceName, resourcesPaths[resourceName], uploadFields).then(function ($await_5) {
                            try {
                                result = $await_5;
                                return $return(result);
                            } catch ($boundEx) {
                                return $error($boundEx);
                            }
                        }, $error);
                    case UPDATE:
                    case CREATE:
                        if (admin && admin.path === resourceName && type === CREATE && params.data && params.data.email && params.data.password && admin.validate(params.data)) {
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
                                    return save(itemId, params.data, currentData, resourceName, resourcesPaths[resourceName], firebaseSaveFilter, uploadResults, type === CREATE, metaFieldNames).then(function ($await_8) {
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


//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRhdGEtcHJvdmlkZXIuanMob3JpZ2luYWwpIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sY0FBYztBQUNyQixPQUFPLGFBQWE7QUFDcEIsT0FBTyxnQkFBZ0I7QUFFdkIsUUFDRSxVQUNBLFNBQ0EsVUFDQSxvQkFDQSxRQUNBLFFBQ0EsYUFDSztBQUVQLEtBQUEsQ0FBTSxhQUFhO0lBQ2pCLHFCQUFxQixLQURKLENBQUE7SUFFakIsZ0JBQWdCO1FBQ2QsV0FBVyxXQURHLENBQUE7UUFFZCxXQUFXLFdBRkcsQ0FBQTtRQUdkLFdBQVc7S0FMSSxDQUFBO0lBT2pCLE9BQU87UUFDTCxNQUFNLE9BREQsQ0FBQTtRQUVMLFFBQVEsRUFGSCxDQUFBO1FBR0wsYUFBVSxHQUFNO0tBVkQsQ0FBQTtJQVlqQixPQUFPLEtBWlUsQ0FBQTtJQWFqQixrQkFBa0IsRUFiRCxDQUFBO0lBY2pCLG9CQUFxQixJQUFELElBQVUsSUFkYixDQUFBO0lBZWpCLG1CQUFvQixJQUFELElBQVU7O0FBRy9CLGdCQUFnQixPQUFBLEdBQVUsSUFBWCxHQUFrQjtJQUMvQixPQUFBLENBQUEsQ0FBQSxDQUFVLFVBQUEsQ0FBVyxJQUFJLFlBQVksU0FBUztJQUM5QyxLQUFBLENBQU0sQ0FBRSxnQkFBZ0Isa0JBQWtCLHFCQUFxQixPQUFPLE9BQU8sb0JBQW9CLG1CQUFtQixRQUFRLE1BQU0sS0FBSyxXQUFXLFFBQVEsV0FBWTtJQUV0SyxLQUFBLENBQU0sa0JBQWtCO0lBQ3hCLEtBQUEsQ0FBTSxzQkFBc0I7SUFDNUIsS0FBQSxDQUFNLGdCQUFnQjtJQUN0QixLQUFBLENBQU0saUJBQWlCO0lBQ3ZCLEtBQUEsQ0FBTSx3QkFBd0I7SUFHOUIsZ0JBQUEsQ0FBaUIsT0FBakIsRUFBMEIsUUFBVSxFQUFBLE9BQVgsR0FBcUI7UUFDNUMsSUFBSSxNQUFBLENBQU8sUUFBUCxDQUFBLEdBQUEsQ0FBb0IsVUFBVTtZQUNoQyxRQUFBLENBQUEsQ0FBQSxDQUFXO2dCQUNULE1BQU0sUUFE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OzRDQUFULE1BQUEsQ0FBQSxDQUFBLENBQVM7NENBQ1QsZUFBTzs7Ozs7Ozs7Ozs7QUFFVCxvQkFBQSxRQUFBO3dCQUNFLEtBQUEsQ0FBQSxFQUFBLENBQVMsT0FBQSxDQUFRLEtBQVIsQ0FBYyx5QkFBeUI7d0JBQ2hELGVBQU87NEJBQUUsTUFBTTs7Ozs7Ozs7O0FBR3ZCO0FBbkxBIiwiZmlsZSI6ImRhdGEtcHJvdmlkZXIuanMob3JpZ2luYWwpIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZpcmViYXNlIGZyb20gJ2ZpcmViYXNlJ1xuaW1wb3J0IG1ldGhvZHMgZnJvbSAnLi9tZXRob2RzJ1xuaW1wb3J0IGRlZXBBc3NpZ24gZnJvbSAnZGVlcC1hc3NpZ24nXG5cbmltcG9ydCB7XG4gIEdFVF9MSVNULFxuICBHRVRfT05FLFxuICBHRVRfTUFOWSxcbiAgR0VUX01BTllfUkVGRVJFTkNFLFxuICBDUkVBVEUsXG4gIFVQREFURSxcbiAgREVMRVRFXG59IGZyb20gJ3JlYWN0LWFkbWluJ1xuXG5jb25zdCBiYXNlQ29uZmlnID0ge1xuICBpbml0aWFsUXVlcnl0aW1lb3V0OiAxMDAwMCxcbiAgbWV0YUZpZWxkTmFtZXM6IHtcbiAgICBjcmVhdGVkQXQ6ICdjcmVhdGVkQXQnLFxuICAgIHVwZGF0ZWRBdDogJ3VwZGF0ZWRBdCcsXG4gICAgY3JlYXRlZEJ5OiAnY3JlYXRlZEJ5J1xuICB9LFxuICBhZG1pbjoge1xuICAgIHBhdGg6ICd1c2VycycsXG4gICAgY29uZmlnOiB7fSxcbiAgICB2YWxpZGF0ZTogKCkgPT4gdHJ1ZVxuICB9LFxuICBkZWJ1ZzogZmFsc2UsXG4gIHRyYWNrZWRSZXNvdXJjZXM6IFtdLFxuICBmaXJlYmFzZVNhdmVGaWx0ZXI6IChkYXRhKSA9PiBkYXRhLFxuICBmaXJlYmFzZUdldEZpbHRlcjogKGRhdGEpID0+IGRhdGFcbn1cblxuZXhwb3J0IGRlZmF1bHQgKG9wdGlvbnMgPSB7fSkgPT4ge1xuICBvcHRpb25zID0gZGVlcEFzc2lnbih7fSwgYmFzZUNvbmZpZywgbWV0aG9kcywgb3B0aW9ucylcbiAgY29uc3QgeyBtZXRhRmllbGROYW1lcywgdHJhY2tlZFJlc291cmNlcywgaW5pdGlhbFF1ZXJ5dGltZW91dCwgZGVidWcsIGFkbWluLCBmaXJlYmFzZVNhdmVGaWx0ZXIsIGZpcmViYXNlR2V0RmlsdGVyLCB1cGxvYWQsIHNhdmUsIGRlbCwgZ2V0SXRlbUlELCBnZXRPbmUsIGdldE1hbnkgfSA9IG9wdGlvbnNcblxuICBjb25zdCByZXNvdXJjZXNTdGF0dXMgPSB7fVxuICBjb25zdCByZXNvdXJjZXNSZWZlcmVuY2VzID0ge31cbiAgY29uc3QgcmVzb3VyY2VzRGF0YSA9IHt9XG4gIGNvbnN0IHJlc291cmNlc1BhdGhzID0ge31cbiAgY29uc3QgcmVzb3VyY2VzVXBsb2FkRmllbGRzID0ge31cblxuICAvLyBTYW5pdGl6ZSBSZXNvdXJjZXNcbiAgdHJhY2tlZFJlc291cmNlcy5mb3JFYWNoKChyZXNvdXJjZSwgaW5kZXgpID0+IHtcbiAgICBpZiAodHlwZW9mIHJlc291cmNlID09PSAnc3RyaW5nJykge1xuICAgICAgcmVzb3VyY2UgPSB7XG4gICAgICAgIG5hbWU6IHJlc291cmNlLFxuICAgICAgICBwYXRoOiByZXNvdXJjZSxcbiAgICAgICAgdXBsb2FkRmllbGRzOiBbXVxuICAgICAgfVxuICAgICAgdHJhY2tlZFJlc291cmNlc1tpbmRleF0gPSByZXNvdXJjZVxuICAgIH1cblxuICAgIGNvbnN0IHsgbmFtZSwgcGF0aCwgdXBsb2FkRmllbGRzIH0gPSByZXNvdXJjZVxuXG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYG5hbWUgaXMgbWlzc2luZyBmcm9tIHJlc291cmNlICR7cmVzb3VyY2V9YClcbiAgICB9XG5cbiAgICByZXNvdXJjZXNVcGxvYWRGaWVsZHNbbmFtZV0gPSB1cGxvYWRGaWVsZHMgfHwgW11cbiAgICByZXNvdXJjZXNQYXRoc1tuYW1lXSA9IHBhdGggfHwgbmFtZVxuICAgIHJlc291cmNlc0RhdGFbbmFtZV0gPSB7fVxuICB9KVxuXG4gIGNvbnN0IGluaXRpYWxpemVSZXNvdXJjZSA9ICh7bmFtZSwgaXNQdWJsaWN9LCByZXNvbHZlKSA9PiB7XG4gICAgbGV0IHJlZiA9IHJlc291cmNlc1JlZmVyZW5jZXNbbmFtZV0gPSBmaXJlYmFzZS5kYXRhYmFzZSgpLnJlZihyZXNvdXJjZXNQYXRoc1tuYW1lXSlcbiAgICByZXNvdXJjZXNEYXRhW25hbWVdID0gW11cblxuICAgIGlmIChpc1B1YmxpYykge1xuICAgICAgc3Vic2NyaWJlUmVzb3VyY2UocmVmLCBuYW1lLCByZXNvbHZlKVxuICAgIH0gZWxzZSB7XG4gICAgICBmaXJlYmFzZS5hdXRoKCkub25BdXRoU3RhdGVDaGFuZ2VkKGF1dGggPT4ge1xuICAgICAgICBpZiAoYXV0aCkge1xuICAgICAgICAgIHN1YnNjcmliZVJlc291cmNlKHJlZiwgbmFtZSwgcmVzb2x2ZSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBzZXRUaW1lb3V0KHJlc29sdmUsIGluaXRpYWxRdWVyeXRpbWVvdXQpXG4gICAgcmV0dXJuIHRydWVcbiAgfVxuXG4gIGNvbnN0IHN1YnNjcmliZVJlc291cmNlID0gKHJlZiwgbmFtZSwgcmVzb2x2ZSkgPT4ge1xuICAgIHJlZi5vbmNlKCd2YWx1ZScsIGZ1bmN0aW9uIChzbmFwc2hvdCkge1xuICAgICAgLyoqIFVzZXMgXCJ2YWx1ZVwiIHRvIGZldGNoIGluaXRpYWwgZGF0YS4gQXZvaWQgdGhlIEFPUiB0byBzaG93IG5vIHJlc3VsdHMgKi9cbiAgICAgIGlmIChzbmFwc2hvdC5rZXkgPT09IG5hbWUpIHtcbiAgICAgICAgY29uc3QgZW50cmllcyA9IHNuYXBzaG90LnZhbCgpIHx8IHt9XG4gICAgICAgIE9iamVjdC5rZXlzKGVudHJpZXMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICByZXNvdXJjZXNEYXRhW25hbWVdW2tleV0gPSBmaXJlYmFzZUdldEZpbHRlcihlbnRyaWVzW2tleV0sIG5hbWUpXG4gICAgICAgIH0pXG4gICAgICAgIE9iamVjdC5rZXlzKHJlc291cmNlc0RhdGFbbmFtZV0pLmZvckVhY2goaXRlbUtleSA9PiB7XG4gICAgICAgICAgcmVzb3VyY2VzRGF0YVtuYW1lXVtpdGVtS2V5XS5pZCA9IGl0ZW1LZXlcbiAgICAgICAgICByZXNvdXJjZXNEYXRhW25hbWVdW2l0ZW1LZXldLmtleSA9IGl0ZW1LZXlcbiAgICAgICAgfSlcbiAgICAgICAgcmVzb2x2ZSgpXG4gICAgICB9XG4gICAgfSlcblxuICAgIHJlZi5vbignY2hpbGRfYWRkZWQnLCBmdW5jdGlvbiAoc25hcHNob3QpIHtcbiAgICAgIHJlc291cmNlc0RhdGFbbmFtZV1bc25hcHNob3Qua2V5XSA9IGZpcmViYXNlR2V0RmlsdGVyKE9iamVjdC5hc3NpZ24oe30sIHtcbiAgICAgICAgaWQ6IHNuYXBzaG90LmtleSxcbiAgICAgICAga2V5OiBzbmFwc2hvdC5rZXlcbiAgICAgIH0sIHNuYXBzaG90LnZhbCgpKSwgbmFtZSlcbiAgICB9KVxuXG4gICAgcmVmLm9uKCdjaGlsZF9yZW1vdmVkJywgZnVuY3Rpb24gKG9sZHNuYXBzaG90KSB7XG4gICAgICBpZiAocmVzb3VyY2VzRGF0YVtuYW1lXVtvbGRzbmFwc2hvdC5rZXldKSB7IGRlbGV0ZSByZXNvdXJjZXNEYXRhW25hbWVdW29sZHNuYXBzaG90LmtleV0gfVxuICAgIH0pXG5cbiAgICByZWYub24oJ2NoaWxkX2NoYW5nZWQnLCBmdW5jdGlvbiAoc25hcHNob3QpIHtcbiAgICAgIHJlc291cmNlc0RhdGFbbmFtZV1bc25hcHNob3Qua2V5XSA9IHNuYXBzaG90LnZhbCgpXG4gICAgfSlcbiAgfVxuXG4gIHRyYWNrZWRSZXNvdXJjZXMuZm9yRWFjaChyZXNvdXJjZSA9PiB7XG4gICAgcmVzb3VyY2VzU3RhdHVzW3Jlc291cmNlLm5hbWVdID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICBpbml0aWFsaXplUmVzb3VyY2UocmVzb3VyY2UsIHJlc29sdmUpXG4gICAgfSlcbiAgfSlcblxuICAvKipcbiAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgUmVxdWVzdCB0eXBlLCBlLmcgR0VUX0xJU1RcbiAgICogQHBhcmFtIHtzdHJpbmd9IHJlc291cmNlTmFtZSBSZXNvdXJjZSBuYW1lLCBlLmcuIFwicG9zdHNcIlxuICAgKiBAcGFyYW0ge09iamVjdH0gcGF5bG9hZCBSZXF1ZXN0IHBhcmFtZXRlcnMuIERlcGVuZHMgb24gdGhlIHJlcXVlc3QgdHlwZVxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gdGhlIFByb21pc2UgZm9yIGEgUkVTVCByZXNwb25zZVxuICAgKi9cbiAgcmV0dXJuIGFzeW5jICh0eXBlLCByZXNvdXJjZU5hbWUsIHBhcmFtcykgPT4ge1xuICAgIGRlYnVnICYmIGNvbnNvbGUubG9nKHR5cGUsIHJlc291cmNlTmFtZSwgcGFyYW1zKVxuICAgIGF3YWl0IHJlc291cmNlc1N0YXR1c1tyZXNvdXJjZU5hbWVdXG4gICAgbGV0IHJlc3VsdCA9IG51bGxcbiAgICBsZXQgaXRlbUlkID0gbnVsbFxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSBHRVRfTElTVDpcbiAgICAgIGNhc2UgR0VUX01BTlk6XG4gICAgICBjYXNlIEdFVF9NQU5ZX1JFRkVSRU5DRTpcbiAgICAgICAgcmVzdWx0ID0gZ2V0TWFueShwYXJhbXMsIHJlc291cmNlTmFtZSwgcmVzb3VyY2VzRGF0YVtyZXNvdXJjZU5hbWVdKVxuICAgICAgICByZXR1cm4gcmVzdWx0XG5cbiAgICAgIGNhc2UgR0VUX09ORTpcbiAgICAgICAgcmVzdWx0ID0gZ2V0T25lKHBhcmFtcywgcmVzb3VyY2VOYW1lLCByZXNvdXJjZXNEYXRhW3Jlc291cmNlTmFtZV0pXG4gICAgICAgIHJldHVybiByZXN1bHRcblxuICAgICAgY2FzZSBERUxFVEU6XG4gICAgICAgIGNvbnN0IHVwbG9hZEZpZWxkcyA9IHJlc291cmNlc1VwbG9hZEZpZWxkc1tyZXNvdXJjZU5hbWVdID8gcmVzb3VyY2VzVXBsb2FkRmllbGRzW3Jlc291cmNlTmFtZV0gOiBbXVxuXG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IGRlbChwYXJhbXMuaWQsIHJlc291cmNlTmFtZSwgcmVzb3VyY2VzUGF0aHNbcmVzb3VyY2VOYW1lXSwgdXBsb2FkRmllbGRzKVxuICAgICAgICByZXR1cm4gcmVzdWx0XG5cbiAgICAgIGNhc2UgVVBEQVRFOlxuICAgICAgY2FzZSBDUkVBVEU6XG4gICAgICAgIGlmIChhZG1pbiAmJiBhZG1pbi5wYXRoID09PSByZXNvdXJjZU5hbWUgJiYgdHlwZSA9PT0gQ1JFQVRFICYmIHBhcmFtcy5kYXRhICYmIHBhcmFtcy5kYXRhLmVtYWlsICYmIHBhcmFtcy5kYXRhLnBhc3N3b3JkICYmIGFkbWluLnZhbGlkYXRlKHBhcmFtcy5kYXRhKSkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsZXQgYXBwID0gZmlyZWJhc2UuaW5pdGlhbGl6ZUFwcChhZG1pbi5jb25maWcsICd1c2VyLWFkbWluJylcbiAgICAgICAgICAgIGxldCB1c2VyID0gYXdhaXQgYXBwLmF1dGgoKS5jcmVhdGVVc2VyV2l0aEVtYWlsQW5kUGFzc3dvcmQocGFyYW1zLmRhdGEuZW1haWwsIHBhcmFtcy5kYXRhLnBhc3N3b3JkKVxuICAgICAgICAgICAgaXRlbUlkID0gdXNlci51aWRcbiAgICAgICAgICAgIGFwcC5hdXRoKCkuc2lnbk91dCgpXG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoZXJyb3IpKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtSWQgPSBnZXRJdGVtSUQocGFyYW1zLCB0eXBlLCByZXNvdXJjZU5hbWUsIHJlc291cmNlc1BhdGhzW3Jlc291cmNlTmFtZV0sIHJlc291cmNlc0RhdGFbcmVzb3VyY2VOYW1lXSlcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB1cGxvYWRzID0gcmVzb3VyY2VzVXBsb2FkRmllbGRzW3Jlc291cmNlTmFtZV1cbiAgICAgICAgICA/IHJlc291cmNlc1VwbG9hZEZpZWxkc1tyZXNvdXJjZU5hbWVdXG4gICAgICAgICAgICAubWFwKGZpZWxkID0+IHVwbG9hZChmaWVsZCwgcGFyYW1zLmRhdGEsIGl0ZW1JZCwgcmVzb3VyY2VOYW1lLCByZXNvdXJjZXNQYXRoc1tyZXNvdXJjZU5hbWVdKSlcbiAgICAgICAgICA6IFtdXG5cbiAgICAgICAgdmFyIGN1cnJlbnREYXRhID0gcmVzb3VyY2VzRGF0YVtyZXNvdXJjZU5hbWVdW2l0ZW1JZF0gfHwge31cbiAgICAgICAgdmFyIHVwbG9hZFJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbCh1cGxvYWRzKVxuXG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IHNhdmUoaXRlbUlkLCBwYXJhbXMuZGF0YSwgY3VycmVudERhdGEsIHJlc291cmNlTmFtZSwgcmVzb3VyY2VzUGF0aHNbcmVzb3VyY2VOYW1lXSwgZmlyZWJhc2VTYXZlRmlsdGVyLCB1cGxvYWRSZXN1bHRzLCB0eXBlID09PSBDUkVBVEUsIG1ldGFGaWVsZE5hbWVzKVxuICAgICAgICByZXR1cm4gcmVzdWx0XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGRlYnVnICYmIGNvbnNvbGUuZXJyb3IoJ1VuZG9jdW1lbnRlZCBtZXRob2Q6ICcsIHR5cGUpXG4gICAgICAgIHJldHVybiB7IGRhdGE6IFtdIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LmpzKG9yaWdpbmFsKSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLDBCQUEwQjtBQUNqQyxPQUFPLGFBQWE7QUFFcEIsT0FBQSxDQUFTLHNCQUFzQjtBQUgvQiIsImZpbGUiOiJpbmRleC5qcyhvcmlnaW5hbCkiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgRmlyZWJhc2VEYXRhUHJvdmlkZXIgZnJvbSAnLi9kYXRhLXByb3ZpZGVyJ1xuaW1wb3J0IG1ldGhvZHMgZnJvbSAnLi9tZXRob2RzJ1xuXG5leHBvcnQgeyBGaXJlYmFzZURhdGFQcm92aWRlciwgbWV0aG9kcyB9XG4iXX0=

export { dataProvider as FirebaseDataProvider, methods };
//# sourceMappingURL=ra-data-firebase.m.js.map
