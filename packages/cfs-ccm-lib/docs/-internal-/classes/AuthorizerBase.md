[**cfs-ccm-lib**](../../README.md)

***

[cfs-ccm-lib](../../README.md) / [\<internal\>](../README.md) / AuthorizerBase

# Class: `abstract` AuthorizerBase

Defined in: [src/auth/authorizer.ts:32](#)

## Extended by

- [`ApiKeyAuthorizer`](../../classes/ApiKeyAuthorizer.md)
- [`TokenAuthorizer`](../../classes/TokenAuthorizer.md)
- [`PublicAuthorizer`](../../classes/PublicAuthorizer.md)

## Implements

- [`Authorizer`](../../interfaces/Authorizer.md)

## Constructors

### Constructor

> `protected` **new AuthorizerBase**(`authConfig`): `AuthorizerBase`

Defined in: [src/auth/authorizer.ts:36](#)

#### Parameters

##### authConfig

[`AuthConfigBase`](../interfaces/AuthConfigBase.md)

#### Returns

`AuthorizerBase`

## Methods

### onRequest()

> **onRequest**(`options`): `undefined` \| `void` \| [`Request`](../interfaces/Request.md) \| [`Response`](../interfaces/Response.md) \| `Promise`\<`undefined` \| `void` \| [`Request`](../interfaces/Request.md) \| [`Response`](../interfaces/Response.md)\>

Defined in: [src/auth/authorizer.ts:53](#)

#### Parameters

##### options

`MiddlewareCallbackParams`

#### Returns

`undefined` \| `void` \| [`Request`](../interfaces/Request.md) \| [`Response`](../interfaces/Response.md) \| `Promise`\<`undefined` \| `void` \| [`Request`](../interfaces/Request.md) \| [`Response`](../interfaces/Response.md)\>

#### Implementation of

`Authorizer.onRequest`

***

### setAuthHeader()

> `protected` **setAuthHeader**(`__namedParameters`): [`Request`](../interfaces/Request.md)

Defined in: [src/auth/authorizer.ts:61](#)

#### Parameters

##### \_\_namedParameters

###### auth

`string`

###### request

[`Request`](../interfaces/Request.md)

#### Returns

[`Request`](../interfaces/Request.md)
