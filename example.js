
import React, { Component } from 'react'
import { Admin, Resource } from 'react-admin'
import firebase from 'firebase'

import Login from './login'
import Dashboard from './dashboard'

import Store from '@material-ui/icons/Store'
import { AssetsCreate, AssetsEdit, AssetsList } from './assets'

import { FirebaseDataProvider } from 'ra-data-firebase'

const firebaseConfig =
    {
      // Firebase config used to create additional app to create users (HACK)
      apiKey: '########################################',
      authDomain: '########################################',
      databaseURL: '########################################',
      projectId: '########################################',
      storageBucket: '########################################'
    }

const providerConfig = {
  admin: {
    path: 'people', // path in db to store user information (default 'users')
    config: firebaseConfig,
    validate: (data) => data.isEmployee // Function to validate that a user should be created in firebase (default () => true)
  },
  metaFieldNames: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    createdBy: 'createdBy'
  },
  trackedResources: [
    {
      name: 'sites',
      path: `sites`,
      isPublic: false
    },
    {
      name: 'assets',
      path: `assets`,
      isPublic: false,
      uploadFields: ['pictures', 'files']
    },
    {
      name: 'parts',
      path: 'parts',
      isPublic: false,
      uploadFields: ['pictures', 'files']
    },
    {
      name: 'maintenance',
      path: `maintenance`,
      isPublic: false,
      uploadFields: ['pictures', 'files']
    }
  ]
}

// Ensure firebase is initialized first
firebase.initializeApp(firebaseConfig)

class App extends Component {
  render () {
    return <Admin
      title='Demo'
      loginPage={Login}
      dashboard={Dashboard}
      dataProvider={FirebaseDataProvider(providerConfig)}
    >
      <Resource
        icon={Store}
        options={{ label: 'Assets' }}
        name='assets'
        list={AssetsList}
        edit={AssetsEdit}
        create={AssetsCreate}
      />
    </Admin>
  }
}

export default App
