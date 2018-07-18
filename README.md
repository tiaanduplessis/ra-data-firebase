
# ra-data-firebase
[![package version](https://img.shields.io/npm/v/ra-data-firebase.svg?style=flat-square)](https://npmjs.org/package/ra-data-firebase)
[![package downloads](https://img.shields.io/npm/dm/ra-data-firebase.svg?style=flat-square)](https://npmjs.org/package/ra-data-firebase)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![package license](https://img.shields.io/npm/l/ra-data-firebase.svg?style=flat-square)](https://npmjs.org/package/ra-data-firebase)
[![make a pull request](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

> Firebase data provider for React Admin

## Table of Contents

- [About](#about)
- [Install](#install)
- [Usage](#usage)
- [Contribute](#contribute)
- [License](#License)

## About

A Firebase data provider for [react-admin](https://www.npmjs.com/package/react-admin). Based on [aor-firebase-client](https://github.com/sidferreira/aor-firebase-client), modified and maintained to own preferences.

## Install

This project uses [node](https://nodejs.org) and [npm](https://www.npmjs.com). Ensure that [firebase](https://www.npmjs.com/package/firebase) and [react-admin](https://www.npmjs.com/package/react-admin) is installed.

```sh
$ npm install ra-data-firebase
$ # OR
$ yarn add ra-data-firebase
```

## Usage

```js

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

// Firebase must be initialized first
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

```

## Contribute

1. Fork it and create your feature branch: git checkout -b my-new-feature
2. Commit your changes: git commit -am 'Add some feature'
3. Push to the branch: git push origin my-new-feature 
4. Submit a pull request

## License

MIT
    
