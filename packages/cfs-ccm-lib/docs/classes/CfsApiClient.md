[**cfs-ccm-lib**](../README.md)

***

[cfs-ccm-lib](../README.md) / CfsApiClient

# Class: CfsApiClient

Defined in: [src/sdk/cfsapi-client.ts:85](#)

Client for the CFS software catalog API.

Usage:
------
```
const myClient = new CfsApiClient({
    baseUrl: 'http://www.myapi.com',
    authorizer: myAuth,
});
```
Typically used with `SocCatalog`; see that class for further usage information.

## Constructors

### Constructor

> **new CfsApiClient**(`options`): `CfsApiClient`

Defined in: [src/sdk/cfsapi-client.ts:94](#)

Constructs a new CfsApiClient instance.

#### Parameters

##### options

[`ApiOptions`](../interfaces/ApiOptions.md)

The options for configuring the API client.

#### Returns

`CfsApiClient`

## Accessors

### fetch

#### Get Signature

> **get** **fetch**(): [`FetchClient`](../-internal-/type-aliases/FetchClient.md)

Defined in: [src/sdk/cfsapi-client.ts:176](#)

Gets the fetch client for making API requests, exclusively for CRUD methods.

##### Returns

[`FetchClient`](../-internal-/type-aliases/FetchClient.md)

The fetch client.

***

### rest

#### Get Signature

> **get** **rest**(): [`RestClient`](../-internal-/classes/RestClient.md)

Defined in: [src/sdk/cfsapi-client.ts:167](#)

Gets the REST client for making API requests.

##### Returns

[`RestClient`](../-internal-/classes/RestClient.md)

The REST client.

## Methods

### isOnline()

> **isOnline**(`timeout`): `Promise`\<`boolean`\>

Defined in: [src/sdk/cfsapi-client.ts:127](#)

Checks if the API is reachable.  Does not require authentication.
To check if the client is authorized, use `testConnection`.
Returns false if the connection fails.

#### Parameters

##### timeout

`number` = `0`

The maximum amount of time in milliseconds the client will spend trying to connect. Setting to 0 will disable the timeout.

#### Returns

`Promise`\<`boolean`\>

Returns true if the client successfully reached the service, or false if it failed for any reason.

***

### testConnection()

> **testConnection**(`timeout`): `Promise`\<`void`\>

Defined in: [src/sdk/cfsapi-client.ts:150](#)

Checks if the client can communicate with the API.
Throws an error if the connection fails for any reason (including authorization).

#### Parameters

##### timeout

`number` = `0`

The maximum amount of time in milliseconds the client will spend trying to connect. Setting to 0 will disable the timeout.

#### Returns

`Promise`\<`void`\>

#### Throws

An error if the client is unable to connect to the API.
