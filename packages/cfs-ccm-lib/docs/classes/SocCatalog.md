[**cfs-ccm-lib**](../README.md)

***

[cfs-ccm-lib](../README.md) / SocCatalog

# Class: SocCatalog

Defined in: [src/sdk/soc/catalog.ts:107](#)

SoC Catalog that can be used in online (uses CFS API) or offline modes.

## Implements

- `AsyncDisposable`

## Constructors

### Constructor

> **new SocCatalog**(`options`, `cfsApiClient?`): `SocCatalog`

Defined in: [src/sdk/soc/catalog.ts:135](#)

Instantiates in online (uses CFS API) or offline modes.
In online mode, the catalog cant be loaded from the API using refresh() and is stored locally.
In offline mode, the catalog must already exist locally, or be imported using import().
Two data stores are created to keep operations atomic: one for the primary data and one for temporary data.
The temp store is cleaned up when the catalog is disposed of, if the cleanTmp option was set to true.
eg., given a directory of '/path/to/data':
- the primary store is at '/path/to/data/db/soc-catalog.json'
- the temp store is at '/path/to/data/db.<random string>.tmp/soc-catalog.json'.

#### Parameters

##### options

[`StorageOptions`](../interfaces/StorageOptions.md)

Options for the underlying storage.

##### cfsApiClient?

[`CfsApiClient`](CfsApiClient.md)

CFS API client object for online mode.

#### Returns

`SocCatalog`

#### Throws

#### Examples

```ts
const catalogWithClient = new SocCatalog({ directory: '/path/to/data' }, cfsApiClient);
```

```ts
const catalogWithoutClient = new SocCatalog({ directory: '/path/to/data' });
```

```ts
const catalogWithDifferentStore = new SocCatalog({ directory: '/path/to/data', storage: MyCustomStoreClass });
```

```ts
const catalogWithDifferentStore = new SocCatalog({ directory: '/path/to/data', cleanTmp: false });
```

## Methods

### \[asyncDispose\]()

> **\[asyncDispose\]**(): `Promise`\<`void`\>

Defined in: [src/sdk/soc/catalog.ts:183](#)

Dispose of the catalog.
Closes the primary data store.
Remove the temp data store when the catalog is disposed of,
if the cleanTmp option was set to true.

#### Returns

`Promise`\<`void`\>

#### Implementation of

`AsyncDisposable.[asyncDispose]`

***

### destroy()

> **destroy**(): `Promise`\<`void`\>

Defined in: [src/sdk/soc/catalog.ts:217](#)

Destroy the catalog.
Removes all stored data

#### Returns

`Promise`\<`void`\>

Promise that resolves when the catalog is destroyed.

#### Throws

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [src/sdk/soc/catalog.ts:207](#)

Dispose of the catalog.

#### Returns

`Promise`\<`void`\>

***

### export()

> **export**(`zipFilePath`): `Promise`\<`void`\>

Defined in: [src/sdk/soc/catalog.ts:392](#)

Exports catalog contents to the given zip file; this is suitable for use with the `import()` function in this class.
Creates a zip file with a JSON file (ZIP_FILE_MEMBER) at the root containing the catalog data.
Schema of the created JSON file:
```json
{
   "soc": [ {SoC}, {SoC}, ... ],
   "exportDate": "ISO8601 date string",
   "libName": "string",
   "libVersion": "semver string"
}
```

#### Parameters

##### zipFilePath

`string`

Path to the zip file to be generated.

#### Returns

`Promise`\<`void`\>

Promise that resolves when the export is complete.

#### Throws

#### Example

```ts
await store.export('/data/export.zip');
```

***

### get()

> **get**(`socId`): `Promise`\<`undefined` \| [`SoC`](../type-aliases/SoC.md)\>

Defined in: [src/sdk/soc/catalog.ts:497](#)

Retrieves details for a given SoC id.

#### Parameters

##### socId

`string`

the SoC id.

#### Returns

`Promise`\<`undefined` \| [`SoC`](../type-aliases/SoC.md)\>

A promise that resolves to the SoC details, or undefined if not found.

#### Throws

***

### getAll()

> **getAll**(): `Promise`\<[`SoC`](../type-aliases/SoC.md)[]\>

Defined in: [src/sdk/soc/catalog.ts:511](#)

Retrieves all SoCs in the catalog.

#### Returns

`Promise`\<[`SoC`](../type-aliases/SoC.md)[]\>

A promise that resolves to a list of SoCs.

#### Throws

***

### getMetadata()

> **getMetadata**(): `Promise`\<`undefined` \| [`SocCatalogMetadata`](../type-aliases/SocCatalogMetadata.md)\>

Defined in: [src/sdk/soc/catalog.ts:161](#)

Get the metadata associated with the catalog.

#### Returns

`Promise`\<`undefined` \| [`SocCatalogMetadata`](../type-aliases/SocCatalogMetadata.md)\>

A promise that resolves to the metadata object or undefined if not metadata is set.

***

### import()

> **import**(`zipFilePath`): `Promise`\<`void`\>

Defined in: [src/sdk/soc/catalog.ts:441](#)

Replace catalog contents with contents from a zipped JSON.
Expects a named zip file with ZIP_FILE_MEMBER at the root containing the catalog data, with schema as described in `export()`.

#### Parameters

##### zipFilePath

`string`

Path to the zip file to be imported.

#### Returns

`Promise`\<`void`\>

A void promise that resolves when the import is complete.

#### Throws

with type INVALID_DATA if the import zip file is invalid.

#### Throws

with type INVALID_CONTENTS if the imported data doesn't satisfy the catalog schema.

#### Throws

with type PERSISTENCE_ERROR if an error occurs during store operations.

#### Throws

with type UNHANDLED_EXCEPTION if an unhandled exception occurs.

***

### isEmpty()

> **isEmpty**(): `Promise`\<`boolean`\>

Defined in: [src/sdk/soc/catalog.ts:367](#)

Checks if the catalog is empty.

#### Returns

`Promise`\<`boolean`\>

Promise that resolves to true if the catalog is empty.

#### Throws

***

### purge()

> **purge**(): `Promise`\<`void`\>

Defined in: [src/sdk/soc/catalog.ts:351](#)

Empties the store associated with the catalog.

#### Returns

`Promise`\<`void`\>

Promise that resolves when the storage is purged.

#### Throws

***

### refresh()

> **refresh**(): `Promise`\<`void`\>

Defined in: [src/sdk/soc/catalog.ts:244](#)

For online mode, replace local store with the latest data from the API.
Has no effect in offline mode (if not using the API).

#### Returns

`Promise`\<`void`\>

Promise that resolves when the catalog is loaded.

#### Throws

with type INVALID_CONTENTS if the data received doesn't satisfy the catalog schema.

#### Throws

with type PERSISTENCE_ERROR if an error occurs during store operations.

#### Throws

with type UNHANDLED_EXCEPTION if an unhandled exception occurs.

***

### summary()

> **summary**(): `Promise`\<`Pick`\<[`SoC`](../type-aliases/SoC.md), `"description"` \| `"name"` \| `"id"`\> & `object`[]\>

Defined in: [src/sdk/soc/catalog.ts:525](#)

Retrieves a summary of the SoCs in the catalog.

#### Returns

`Promise`\<`Pick`\<[`SoC`](../type-aliases/SoC.md), `"description"` \| `"name"` \| `"id"`\> & `object`[]\>

A promise that resolves to a list of SoCs with only the id, display name, and description.

***

### updateAvailable()

> **updateAvailable**(): `Promise`\<`boolean`\>

Defined in: [src/sdk/soc/catalog.ts:261](#)

Checks if there is newer data available if a `cfsApiClient` was passed.
Always returns false if no `cfsApiClient` was passed to the constructor.

#### Returns

`Promise`\<`boolean`\>

Promise that resolves to true if there is newer data available.

#### Throws

***

### validate()

> **validate**(): `Promise`\<`void`\>

Defined in: [src/sdk/soc/catalog.ts:545](#)

Check that the data store and SoCs in the catalog are valid.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the validation is complete.

#### Throws

if an error is encountered during validation, or if there are duplicate SoC ids.
