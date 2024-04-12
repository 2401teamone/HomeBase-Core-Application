# Summary
Pinniped is an open-source, JavaScript backend-as-a-service application that offers:
 * An embedded SQLite3 Database,
 * An admin dashboard,
 * Autogenerated RESTish APIs,
 * Custom events and extensible routes.

## Table of Contents
* [How to Use](https://github.com/Pinniped-BaaS/Pinniped/blob/readme/README.md#how-to-use)
* [Documentation](https://github.com/Pinniped-BaaS/Pinniped/tree/readme?tab=readme-ov-file#documentation)

## How to Use
Install the dependency
```javascript 
npm install pinniped
```
Import and create a Pinniped instance
```javascript
// CommonJS
const { pnpd } = require('pinniped');
const app = pnpd();

// Or ECMAScript
import { pnpd } from 'pinniped'
const app = pnpd();
app.start();
```

## Documentation
## addRoute (method, path, handler)
`addRoute` mounts the parameter, path, onto the host's path. Once it receives
the specified HTTP request method at that path, it'll invoke the handler passed in.
```javascript
app.addRoute("GET", "/store", () => {
	console.log("GET request received at /store");
});
```
## onGetOneRow ( ... tables)
`onGetOneRow` returns a new `PinnipedEvent` that can `add` a handler or `trigger` the event.
The tables in the database can be specified to invoke the handler on this event, getting a single row.
To have it run on any table, leave the parameter empty. 
```javascript
app.onGetOneRow().add(() => {
	console.log("onGetOneRow triggered on any tables"
});


app.onGetOneRow("seals").add(() => {
	console.log("onGetOneRow triggered on 'seals' table");
});

app.onGetOneRow("seals", "dolphins").add(() => {
	console.log("onGetOneRow triggered on 'seals' and 'dolphin' tables");
});

// Trigger the Event Artificially
app.onGetOneRow().trigger();
```
## onGetAllRows ( ... tables)
Functions similarly to `onGetOneRow` except in the event where all rows are grabbed.
```javascript
app.onGetAllRows().add(() => {
	console.log("onGetAllRows triggered on any table");
});
```
## onCreateOneRow ( ... tables)
Functions similarly to `onGetOneRow` except in the event where a row is created.
```javascript
app.onCreateOneRow().add(() => {
	console.log("onCreateOneRow triggered on any table");
});
```

## onUpdateOneRow ( ... tables)
Functions similarly to `onGetOneRow` except in the event where a row is updated.
```javascript
app.onUpdateOneRow().add(() => {
	console.log("onUpdateOneRow triggered on any table");
});
```
## onDeleteOneRow ( ... tables)
Functions similarly to `onGetOneRow` except in the event where a row is deleted.
```javascript
app.onDeleteOneRow().add(() => {
	console.log("onDeleteOneRow triggered on all tables");
});
```
## onBackupDatabase
Can add handlers in the event that the database is backed up.
```javascript
app.onBackupDatabase().add(() => {
	console.log("Database backed up");
});
```
## onRegisterUser
```javascript
app.onRegisterUser().add(() => {
	console.log("User is registered");
});
```
## onRegisterAdmin
```javascript
app.onRegisterAdmin().add(() => {
	console.log("Admin is registered");
});
```
## onLoginUser
```javascript
app.onLoginUser().add(() => {
	console.log("User logged in");
});
```
## onLoginAdmin
```javascript
app.onLoginAdmin().add(() => {
	console.log("Admin logged in");
});
```
## onLogout
```javascript
app.onLogout().add(() => {
	console.log("Logged out");
});
```
## onCustomRoute
```javascript
app.onCustomRoute().add(() => {
	console.log("Custom route is hit with a request");
});
```
## onGetTableMeta
```javascript
app.onGetTableMeta().add(() => {
	console.log("Get 'tablemeta'");
});
```
## onCreateTable
```javascript
app.onCreateTable().add(() => {
	console.log("Table created");
});
```
## onUpdateTable
```javascript
app.onUpdateTable().add(() => {
	console.log("Table updated");
});
```
## onDropTable
```javascript
app.onDropTable().add(() => {
	console.log("Table dropped");
});
```

##Deployment
For deploying your app, check out the instructions [here]().
