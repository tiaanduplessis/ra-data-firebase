import firebase from 'firebase'
import methods from './methods'
import deepAssign from 'deep-assign'

import {
  GET_LIST,
  GET_ONE,
  GET_MANY,
  GET_MANY_REFERENCE,
  CREATE,
  UPDATE,
  DELETE
} from 'react-admin'

const baseConfig = {
  initialQuerytimeout: 10000,
  metaFieldNames: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    createdBy: 'createdBy'
  },
  admin: {
    path: 'users',
    config: {},
    validate: () => true
  },
  debug: false,
  trackedResources: [],
  firebaseSaveFilter: (data) => data,
  firebaseGetFilter: (data) => data
}

export default (options = {}) => {
  options = deepAssign({}, baseConfig, methods, options)
  const { metaFieldNames, trackedResources, initialQuerytimeout, debug, admin, firebaseSaveFilter, firebaseGetFilter, upload, save, del, getItemID, getOne, getMany } = options

  const resourcesStatus = {}
  const resourcesReferences = {}
  const resourcesData = {}
  const resourcesPaths = {}
  const resourcesUploadFields = {}

  // Sanitize Resources
  trackedResources.forEach((resource, index) => {
    if (typeof resource === 'string') {
      resource = {
        name: resource,
        path: resource,
        uploadFields: []
      }
      trackedResources[index] = resource
    }

    const { name, path, uploadFields } = resource

    if (!name) {
      throw new Error(`name is missing from resource ${resource}`)
    }

    resourcesUploadFields[name] = uploadFields || []
    resourcesPaths[name] = path || name
    resourcesData[name] = {}
  })

  const initializeResource = ({name, isPublic}, resolve) => {
    let ref = resourcesReferences[name] = firebase.database().ref(resourcesPaths[name])
    resourcesData[name] = []

    if (isPublic) {
      subscribeResource(ref, name, resolve)
    } else {
      firebase.auth().onAuthStateChanged(auth => {
        if (auth) {
          subscribeResource(ref, name, resolve)
        }
      })
    }

    setTimeout(resolve, initialQuerytimeout)
    return true
  }

  const subscribeResource = (ref, name, resolve) => {
    ref.once('value', function (snapshot) {
      /** Uses "value" to fetch initial data. Avoid the AOR to show no results */
      if (snapshot.key === name) {
        const entries = snapshot.val() || {}
        Object.keys(entries).forEach(key => {
          resourcesData[name][key] = firebaseGetFilter(entries[key], name)
        })
        Object.keys(resourcesData[name]).forEach(itemKey => {
          resourcesData[name][itemKey].id = itemKey
          resourcesData[name][itemKey].key = itemKey
        })
        resolve()
      }
    })

    ref.on('child_added', function (snapshot) {
      resourcesData[name][snapshot.key] = firebaseGetFilter(Object.assign({}, {
        id: snapshot.key,
        key: snapshot.key
      }, snapshot.val()), name)
    })

    ref.on('child_removed', function (oldsnapshot) {
      if (resourcesData[name][oldsnapshot.key]) { delete resourcesData[name][oldsnapshot.key] }
    })

    ref.on('child_changed', function (snapshot) {
      resourcesData[name][snapshot.key] = snapshot.val()
    })
  }

  trackedResources.forEach(resource => {
    resourcesStatus[resource.name] = new Promise(resolve => {
      initializeResource(resource, resolve)
    })
  })

  /**
   * @param {string} type Request type, e.g GET_LIST
   * @param {string} resourceName Resource name, e.g. "posts"
   * @param {Object} payload Request parameters. Depends on the request type
   * @returns {Promise} the Promise for a REST response
   */
  return async (type, resourceName, params) => {
    debug && console.log(type, resourceName, params)
    await resourcesStatus[resourceName]
    let result = null
    switch (type) {
      case GET_LIST:
      case GET_MANY:
      case GET_MANY_REFERENCE:
        result = await getMany(params, resourceName, resourcesData[resourceName])
        return result

      case GET_ONE:
        result = await getOne(params, resourceName, resourcesData[resourceName])
        return result

      case DELETE:
        const uploadFields = resourcesUploadFields[resourceName] ? resourcesUploadFields[resourceName] : []

        result = await del(params.id, resourceName, resourcesPaths[resourceName], uploadFields)
        return result

      case UPDATE:
      case CREATE:

        let itemId

        const shouldCreateUser = admin && admin.path === resourceName && type === CREATE && params.data && params.data.email && params.data.password && admin.validate(params.data)
        if (shouldCreateUser) {
          try {
            const app = firebase.initializeApp(admin.config, 'user-admin')
            const user = await app.auth().createUserWithEmailAndPassword(params.data.email, params.data.password)
            itemId = user.uid
            app.auth().signOut()
          } catch (error) {
            return Promise.reject(new Error(error))
          }
        } else {
          itemId = getItemID(params, type, resourceName, resourcesPaths[resourceName], resourcesData[resourceName])
        }

        const uploads = resourcesUploadFields[resourceName]
          ? resourcesUploadFields[resourceName]
            .map(field => upload(field, params.data, itemId, resourceName, resourcesPaths[resourceName]))
          : []

        const currentData = resourcesData[resourceName][itemId] || {}
        const uploadResults = await Promise.all(uploads)

        result = await save(itemId, params.data, currentData, resourceName, resourcesPaths[resourceName], firebaseSaveFilter, uploadResults, type === CREATE, metaFieldNames)
        return result

      default:
        debug && console.error('Undocumented method: ', type)
        return { data: [] }
    }
  }
}
