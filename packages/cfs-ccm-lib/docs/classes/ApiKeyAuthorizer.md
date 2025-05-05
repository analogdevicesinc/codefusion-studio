[**cfs-ccm-lib**](../README.md)

***

[cfs-ccm-lib](../README.md) / ApiKeyAuthorizer

# Class: ApiKeyAuthorizer

Defined in: [src/auth/key/api-key.ts:23](#)

## Extends

- [`AuthorizerBase`](../-internal-/classes/AuthorizerBase.md)

## Constructors

### Constructor

> **new ApiKeyAuthorizer**(`authConfig`): `ApiKeyAuthorizer`

Defined in: [src/auth/key/api-key.ts:33](#)

#### Parameters

##### authConfig

[`ApiKeyAuthConfig`](../interfaces/ApiKeyAuthConfig.md)

#### Returns

`ApiKeyAuthorizer`

#### Overrides

[`AuthorizerBase`](../-internal-/classes/AuthorizerBase.md).[`constructor`](../-internal-/classes/AuthorizerBase.md#constructor)

## Properties

### DEFAULT\_HTTP\_HEADER

> `static` **DEFAULT\_HTTP\_HEADER**: `string` = `'X-Api-Key'`

Defined in: [src/auth/key/api-key.ts:24](#)

***

### DEFAULT\_HTTP\_PREFIX

> `static` **DEFAULT\_HTTP\_PREFIX**: `string` = `''`

Defined in: [src/auth/key/api-key.ts:25](#)

## Methods

### onRequest()

> **onRequest**(`args0`): `Promise`\<[`Request`](../-internal-/interfaces/Request.md)\>

Defined in: [src/auth/key/api-key.ts:59](#)

#### Parameters

##### args0

`MiddlewareCallbackParams`

#### Returns

`Promise`\<[`Request`](../-internal-/interfaces/Request.md)\>

#### Overrides

[`AuthorizerBase`](../-internal-/classes/AuthorizerBase.md).[`onRequest`](../-internal-/classes/AuthorizerBase.md#onrequest)

***

### setAuthHeader()

> `protected` **setAuthHeader**(`__namedParameters`): [`Request`](../-internal-/interfaces/Request.md)

Defined in: [src/auth/authorizer.ts:61](#)

#### Parameters

##### \_\_namedParameters

###### auth

`string`

###### request

[`Request`](../-internal-/interfaces/Request.md)

#### Returns

[`Request`](../-internal-/interfaces/Request.md)

#### Inherited from

[`AuthorizerBase`](../-internal-/classes/AuthorizerBase.md).[`setAuthHeader`](../-internal-/classes/AuthorizerBase.md#setauthheader)
